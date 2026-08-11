import cron from "node-cron";
import { AppDataSource, DeviceCache, AttendanceCache, UserCache } from "../db";
import { supabase } from "../supabase";
import { AttendanceProcessor } from "./AttendanceProcessor";
import { deviceManager } from "../DeviceManager";
import { getAttendanceDayRange, parseDeviceTimeToUTC, utcToIST } from "../timezone";

/**
 * Delta Sync State: last processed log timestamp per device IP.
 * Prevents re-processing already-handled logs. In-memory is fine —
 * SQLite synced=true is the durable guard on restart.
 */
const lastProcessedTime = new Map<string, number>(); // ip -> epoch ms

export const startSyncEngine = () => {
  // Every 60 seconds — Reconciliation only (Real-time TCP Push handles live punches instantly in <5ms)
  cron.schedule("*/60 * * * * *", async () => {
    const deviceRepo = AppDataSource.getRepository(DeviceCache);
    const attendanceRepo = AppDataSource.getRepository(AttendanceCache);
    const userRepo = AppDataSource.getRepository(UserCache);

    const devices = await deviceRepo.find({ where: { online: true } });
    if (devices.length === 0) return;

    for (const dev of devices) {
      try {
        // Re-use the EXISTING persistent TCP socket owned by DeviceManager.
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

        // 2. Delta attendance sync — only logs newer than last processed time (UTC & IST aligned)
        const dayRange = getAttendanceDayRange();
        const defaultStartMs = new Date(dayRange.startUTC).getTime();
        const sinceMs = lastProcessedTime.get(dev.ip) ?? defaultStartMs;

        let allLogs: any[] = [];
        try {
          allLogs = await device.getAttendanceLogs();
        } catch (err: any) {
          console.warn(`[SyncEngine] getAttendanceLogs notice for ${dev.ip}:`, err?.message || err);
          continue;
        }

        const newLogs = allLogs.filter((log: any) => {
          try {
            const utcIso = parseDeviceTimeToUTC(log.recordTime);
            return new Date(utcIso).getTime() > sinceMs;
          } catch (_) { return false; }
        });

        if (newLogs.length === 0) {
          const displayTime = utcToIST(sinceMs).toFormat('hh:mm:ss a');
          console.log(`[SyncEngine] No new logs for ${dev.ip} since ${displayTime} IST (Query UTC: ${new Date(sinceMs).toISOString()})`);
          continue;
        }

        console.log(`[SyncEngine] ${newLogs.length} new log(s) for ${dev.ip}`);
        let maxTime = sinceMs;

        // 3. Save new logs to SQLite (dedup guard)
        for (const log of newLogs) {
          const exists = await attendanceRepo.findOne({
            where: { userSn: log.userSn, recordTime: log.recordTime, ip: dev.ip },
          });
          if (!exists) {
            const entry = new AttendanceCache();
            entry.userSn = log.userSn;
            entry.deviceUserId = log.deviceUserId;
            entry.recordTime = log.recordTime;
            entry.ip = dev.ip;
            entry.synced = false;
            await attendanceRepo.save(entry);
          }
          const t = new Date(log.recordTime).getTime();
          if (t > maxTime) maxTime = t;
        }

        // 4. Process all unsynced SQLite logs through AttendanceProcessor
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
            await AttendanceProcessor.processPunch({
              device_ip: dev.ip,
              device_user_id: log.deviceUserId || log.userSn,
              event_time: log.recordTime,
              device_name: dev.deviceName ?? `Terminal (${dev.ip})`,
            });
          } catch (err) {
            console.error(`[SyncEngine] AttendanceProcessor error for ${log.deviceUserId}:`, err);
          }

          if (deviceSupabaseId) {
            const { error } = await supabase.from("attendance_logs").insert({
              device_id: deviceSupabaseId,
              device_user_id: log.deviceUserId,
              employee_id: empMap[log.deviceUserId] ?? null,
              record_time: new Date(log.recordTime).toISOString(),
              timestamp: new Date(log.recordTime).toISOString(),
              check_type: "auto",
            });
            if (!error) successIds.push(log.id);
          } else {
            successIds.push(log.id);
          }
        }

        for (const log of unsyncedLogs) {
          if (successIds.includes(log.id)) { log.synced = true; await attendanceRepo.save(log); }
        }

        lastProcessedTime.set(dev.ip, maxTime);
        console.log(`[SyncEngine] Delta pointer -> ${new Date(maxTime).toLocaleTimeString()} for ${dev.ip}`);

      } catch (err) {
        console.error(`[SyncEngine] Error for ${dev.ip}:`, err);
      }
    }
  });
};
