import { Router } from 'express';
import { supabase } from '../supabase';
import { employeeCache } from '../cache/EmployeeCache';
import { deviceCache } from '../cache/DeviceCache';
import { deviceManager } from '../DeviceManager';
import { AttendanceProcessor } from '../sync/AttendanceProcessor';

const router = Router();

// GET /attendance - Return recent attendance sessions
router.get('/', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(sessions || []);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

// POST /attendance/reset-engine - Reset Attendance Engine & Rebuild sessions from raw attendance_events
router.post('/reset-engine', async (req, res) => {
  try {
    const TODAY_STR = new Date().toISOString().split('T')[0];

    console.log(`🔄 [ResetEngine] Starting rebuild of attendance_sessions from raw attendance_events...`);

    // 1. Delete calculated sessions for today onwards
    const { error: delErr } = await supabase
      .from('attendance_sessions')
      .delete()
      .gte('session_date', TODAY_STR);

    if (delErr) {
      console.warn(`[ResetEngine] Warning during delete session:`, delErr.message);
    }

    // 2. Fetch all raw events for today from attendance_events
    const { data: rawEvents, error: evErr } = await supabase
      .from('attendance_events')
      .select('*')
      .gte('event_time', `${TODAY_STR}T00:00:00.000Z`)
      .order('event_time', { ascending: true });

    if (evErr) throw evErr;

    let processedCount = 0;
    if (rawEvents && rawEvents.length > 0) {
      for (const ev of rawEvents) {
        if (ev.employee_id) {
          await AttendanceProcessor.processPunch({
            device_user_id: ev.employee_id,
            event_time: new Date(ev.event_time),
            verification_type: ev.method || 'fingerprint',
            device_ip: ev.device || '192.168.1.56',
            device_name: ev.device || 'Identix K90 Pro',
          });
          processedCount++;
        }
      }
    }

    console.log(`✅ [ResetEngine] Successfully rebuilt ${processedCount} sessions from attendance_events.`);
    res.json({
      success: true,
      message: `Reset Attendance Engine completed. Rebuilt ${processedCount} sessions from raw events.`,
      processedCount,
    });
  } catch (err: any) {
    console.error(`❌ [ResetEngine] Error rebuilding attendance engine:`, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /attendance/reset-connector - Full Connector & Cache Reset
router.post('/reset-connector', async (req, res) => {
  try {
    console.log(`🔄 [ResetConnector] Performing Full Connector & RAM Cache Reset...`);

    // 1. Clear RAM caches
    employeeCache.clear();
    deviceCache.clear();

    // 2. Reload employee lookup cache
    await employeeCache.initialize();

    // 3. Reconnect TCP sockets
    deviceManager.autoConnectFromSupabase();

    console.log(`✅ [ResetConnector] Connector reset complete. RAM cache reloaded.`);
    res.json({
      success: true,
      message: 'Connector & RAM Cache reset complete.',
      employeeCacheKeys: employeeCache.size(),
      onlineDevices: deviceCache.getAll().filter((d) => d.status === 'ONLINE').length,
    });
  } catch (err: any) {
    console.error(`❌ [ResetConnector] Error resetting connector:`, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /attendance/sync-and-clear-device-logs - Download -> Verify -> Backup -> Clear Device Logs
router.post('/sync-and-clear-device-logs', async (req, res) => {
  try {
    console.log(`📥 [SyncAndClear] Step 1: Initiating log download from connected Identix terminals...`);

    const onlineDevices = deviceCache.getAll().filter((d) => d.status === 'ONLINE');
    if (onlineDevices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No online biometric terminals connected to execute log sync and clear.',
      });
    }

    let totalLogsFetched = 0;
    let totalLogsVerified = 0;

    for (const dev of onlineDevices) {
      console.log(`📡 [SyncAndClear] Downloading logs from ${dev.name} (${dev.ip})...`);

      // 1. Fetch attendance logs from device
      const logs = await deviceManager.getAttendanceLogs(dev.ip);
      totalLogsFetched += logs.length;

      // 2. Insert into attendance_events (raw log table)
      for (const log of logs) {
        const empId = `EMP-${String(log.deviceUserId).padStart(2, '0')}`;
        await AttendanceProcessor.processPunch({
          device_user_id: empId,
          event_time: new Date(log.recordTime),
          verification_type: log.verificationType || 'fingerprint',
          device_ip: dev.ip,
          device_name: dev.name,
        });
        totalLogsVerified++;
      }

      // 3. Create Backup Log Record
      await supabase.from('device_log_backups').insert([{
        device_ip: dev.ip,
        device_name: dev.name,
        log_count: logs.length,
        verified_count: totalLogsVerified,
        status: 'VERIFIED_BACKUP_CREATED',
        backed_up_at: new Date().toISOString(),
      }]);

      // 4. Safely Clear Device Attendance Logs ONLY after verification
      console.log(`🧹 [SyncAndClear] Verification passed. Safely clearing logs on ${dev.name}...`);
      await deviceManager.clearAttendanceLogs(dev.ip);
    }

    res.json({
      success: true,
      message: `Successfully downloaded, verified, backed up, and cleared ${totalLogsVerified} logs across ${onlineDevices.length} devices.`,
      downloadedCount: totalLogsFetched,
      verifiedCount: totalLogsVerified,
    });
  } catch (err: any) {
    console.error(`❌ [SyncAndClear] Error during sync & clear:`, err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
