import cron from "node-cron";
import { AppDataSource, DeviceCache, AttendanceCache, UserCache } from "../db";
import { supabase } from "../supabase";
import { AttendanceProcessor } from "./AttendanceProcessor";
import { deviceManager } from "../DeviceManager";
import { getAttendanceDayRange, parseDeviceTimeToUTC, utcToIST } from "../timezone";

/**
 * Delta Sync State: in-memory map backing the persistent `biometric_sync_state` DB table.
 */
const lastProcessedTime = new Map<string, number>(); // ip -> epoch ms

/**
 * Loads saved cursor from Supabase `biometric_sync_state` table on startup.
 */
async function loadPersistedSyncState(ip: string): Promise<number | null> {
  try {
    const { data } = await supabase
      .from("biometric_sync_state")
      .select("last_successful_sync_at_utc, last_machine_timestamp")
      .eq("company_id", "COMP-001")
      .eq("device_ip", ip)
      .maybeSingle();

    if (data && data.last_successful_sync_at_utc) {
      return new Date(data.last_successful_sync_at_utc).getTime();
    }
  } catch (_) {}
  return null;
}

/**
 * Updates `biometric_sync_state` in Supabase after successful ingestion.
 */
async function persistSyncState(
  ip: string,
  lastLogId: string | null,
  lastMachineTs: string | null,
  lastSyncUtc: string,
  recordsFetched: number,
  recordsInserted: number,
  status: 'SUCCESS' | 'FAILED' | 'NO_NEW_LOGS' | 'DEVICE_OFFLINE',
  errorMessage?: string
) {
  try {
    await supabase.from("biometric_sync_state").upsert({
      company_id: "COMP-001",
      device_ip: ip,
      last_machine_log_id: lastLogId,
      last_machine_timestamp: lastMachineTs,
      last_successful_sync_at_utc: status === 'SUCCESS' ? lastSyncUtc : undefined,
      last_sync_completed_at_utc: lastSyncUtc,
      last_sync_status: status,
      last_error_message: errorMessage || null,
      records_fetched: recordsFetched,
      records_inserted: recordsInserted,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id,device_ip' });
  } catch (err: any) {
    console.warn(`[SyncEngine] Could not persist sync state for ${ip}:`, err?.message);
  }
}

export const startSyncEngine = () => {
  // Every 60 seconds — Reconciliation (Real-time TCP Push handles live punches instantly in <5ms)
  cron.schedule("*/60 * * * * *", async () => {
    const deviceRepo = AppDataSource.getRepository(DeviceCache);
    const attendanceRepo = AppDataSource.getRepository(AttendanceCache);
    const userRepo = AppDataSource.getRepository(UserCache);

    const devices = await deviceRepo.find({ where: { online: true } });
    if (devices.length === 0) return;

    for (const dev of devices) {
      try {
        const device = deviceManager.getConnectedDevice(dev.ip);
        if (!device || (device as any).connectionState !== "ONLINE") {
          continue;
        }

        // Resolve Supabase device ID
        let deviceSupabaseId: string | null = null;
        try {
          const { data } = await supabase
            .from("devices")
            .select("id")
            .eq("ip_address", dev.ip)
            .single();
          deviceSupabaseId = data?.id ?? null;
        } catch (_) {}

        // 1. Push unsynced users to Supabase
        const unsyncedUsers = await userRepo.find({ where: { synced: false, ip: dev.ip } });
        if (unsyncedUsers.length > 0 && deviceSupabaseId) {
          const usersToUpsert = unsyncedUsers.map((u) => ({
            device_id: deviceSupabaseId,
            device_user_id: u.deviceUserId,
            name: u.name,
            role: u.role,
            updated_at: new Date().toISOString(),
          }));
          const { error } = await supabase
            .from("device_users")
            .upsert(usersToUpsert, { onConflict: "device_id,device_user_id" });
          if (!error) {
            for (const u of unsyncedUsers) { u.synced = true; await userRepo.save(u); }
            console.log(`[SyncEngine] Pushed ${unsyncedUsers.length} users for ${dev.ip}`);
          }
        }

        // 2. Delta attendance sync: read persistent cursor
        const dayRange = getAttendanceDayRange();
        const defaultStartMs = new Date(dayRange.startUTC).getTime();

        let sinceMs = lastProcessedTime.get(dev.ip);
        if (!sinceMs) {
          const dbCursor = await loadPersistedSyncState(dev.ip);
          sinceMs = dbCursor ?? defaultStartMs;
          lastProcessedTime.set(dev.ip, sinceMs);
        }

        let allLogs: any[] = [];
        try {
          allLogs = await device.getAttendanceLogs();
        } catch (err: any) {
          console.warn(`[SyncEngine] getAttendanceLogs error for ${dev.ip}:`, err?.message || err);
          await persistSyncState(dev.ip, null, null, new Date().toISOString(), 0, 0, 'FAILED', err?.message);
          continue;
        }

        // Filter logs newer than last processed timestamp
        // Uses parseDeviceTimeToUTC to parse machine string explicitly as IST
        const newLogs = allLogs.filter((log: any) => {
          try {
            const rawTs = log.recordTime || log.timestamp;
            if (!rawTs) return false;
            const utcIso = parseDeviceTimeToUTC(rawTs);
            return new Date(utcIso).getTime() > sinceMs!;
          } catch (_) { return false; }
        });

        if (newLogs.length === 0) {
          const displayTime = utcToIST(sinceMs).toFormat('hh:mm:ss a');
          console.log(`[SyncEngine] NO_NEW_LOGS for ${dev.ip} since ${displayTime} IST (${allLogs.length} total machine records checked)`);
          await persistSyncState(dev.ip, null, null, new Date().toISOString(), allLogs.length, 0, 'NO_NEW_LOGS');
          continue;
        }

        console.log(`[SyncEngine] ${newLogs.length} new log(s) for ${dev.ip} out of ${allLogs.length} machine records`);
        let maxTime = sinceMs;
        let lastMachineTs: string | null = null;
        let lastLogId: string | null = null;

        // 3. Save new logs to local SQLite cache
        for (const log of newLogs) {
          const rawTs = log.recordTime || log.timestamp;
          const exists = await attendanceRepo.findOne({
            where: { userSn: log.userSn, recordTime: rawTs, ip: dev.ip },
          });
          if (!exists) {
            const entry = new AttendanceCache();
            entry.userSn = log.userSn;
            entry.deviceUserId = log.deviceUserId;
            entry.recordTime = rawTs;
            entry.machineTimestamp = rawTs;
            entry.ip = dev.ip;
            entry.synced = false;
            await attendanceRepo.save(entry);
          }

          // Parse machine timestamp via Luxon (NOT JS Date constructor)
          const utcIso = parseDeviceTimeToUTC(rawTs);
          const t = new Date(utcIso).getTime();
          if (t > maxTime) {
            maxTime = t;
            lastMachineTs = String(rawTs);
            lastLogId = log.logId ? String(log.logId) : null;
          }
        }

        // 4. Ingest unsynced logs through AttendanceProcessor
        const unsyncedLogs = await attendanceRepo.find({ where: { synced: false, ip: dev.ip } });

        const deviceUserIds = [...new Set(unsyncedLogs.map((l) => l.deviceUserId))];
        const { data: empRows } = await supabase
          .from("employees")
          .select("id, employee_code")
          .in("employee_code", deviceUserIds);
        const empMap: Record<string, string> = {};
        for (const e of (empRows ?? [])) { empMap[e.employee_code] = e.id; }

        const successIds: number[] = [];
        for (const log of unsyncedLogs) {
          try {
            const result = await AttendanceProcessor.processPunch({
              device_ip: dev.ip,
              device_user_id: log.deviceUserId || log.userSn,
              machine_timestamp: log.machineTimestamp || log.recordTime,
              device_name: dev.deviceName ?? `Terminal (${dev.ip})`,
            });

            if (result && result.status !== 'REJECTED') {
              successIds.push(log.id);
            }
          } catch (err) {
            console.error(`[SyncEngine] AttendanceProcessor error for ${log.deviceUserId}:`, err);
          }

          if (deviceSupabaseId) {
            const utcIso = parseDeviceTimeToUTC(log.machineTimestamp || log.recordTime);
            try {
              await supabase.from("attendance_logs").insert({
                device_id: deviceSupabaseId,
                device_user_id: log.deviceUserId,
                employee_id: empMap[log.deviceUserId] ?? null,
                record_time: utcIso,
                timestamp: utcIso,
                check_type: "auto",
              });
            } catch (_) {}
          }
        }

        for (const log of unsyncedLogs) {
          if (successIds.includes(log.id)) { log.synced = true; await attendanceRepo.save(log); }
        }

        // Advance cursor ONLY after successful ingestion
        lastProcessedTime.set(dev.ip, maxTime);
        const nowUtcIso = new Date(maxTime).toISOString();
        await persistSyncState(dev.ip, lastLogId, lastMachineTs, nowUtcIso, newLogs.length, successIds.length, 'SUCCESS');

        console.log(`[SyncEngine] Sync cursor advanced -> ${utcToIST(maxTime).toFormat('hh:mm:ss a')} IST for ${dev.ip}`);

      } catch (err: any) {
        console.error(`[SyncEngine] Error for ${dev.ip}:`, err);
        await persistSyncState(dev.ip, null, null, new Date().toISOString(), 0, 0, 'FAILED', err?.message);
      }
    }
  });
};
