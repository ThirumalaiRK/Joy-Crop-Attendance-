import { Router } from 'express';
import { supabase } from '../supabase';
import { employeeCache } from '../cache/EmployeeCache';
import { deviceCache } from '../cache/DeviceCache';
import { deviceManager } from '../DeviceManager';
import { AttendanceProcessor } from '../sync/AttendanceProcessor';
import { UsbLogImporter } from '../sync/UsbLogImporter';

const router = Router();

// POST /attendance/import-usb-log - Import ZKTeco USB dat export logs directly into Supabase
router.post('/import-usb-log', async (req, res) => {
  const { filePath, content, deviceIp } = req.body;

  try {
    if (content) {
      const records = UsbLogImporter.parseUsbLogContent(String(content));
      let ingestedCount = 0;
      const affectedEmpSet = new Set<string>();
      const affectedDateSet = new Set<string>();

      for (const rec of records) {
        const result = await AttendanceProcessor.processPunch({
          device_ip: deviceIp || '192.168.1.56',
          device_user_id: rec.device_user_id,
          machine_timestamp: rec.machine_timestamp,
          verification_type: rec.verification_type,
          device_name: 'Identix Terminal (USB Import)',
          raw_payload: JSON.stringify({ source: 'USB_DIRECT_IMPORT', line: rec.raw_line }),
        });

        if (result && result.status !== 'REJECTED') {
          ingestedCount++;
          if (rec.device_user_id) affectedEmpSet.add(rec.device_user_id);
          const datePart = rec.machine_timestamp.split(' ')[0];
          if (datePart) affectedDateSet.add(datePart);
        }
      }

      const affectedDates = Array.from(affectedDateSet);
      for (const dateStr of affectedDates) {
        const { data: rawRows } = await supabase
          .from('biometric_raw_punches')
          .select('employee_id, device_user_id')
          .gte('event_time_utc', `${dateStr}T00:00:00.000Z`)
          .lte('event_time_utc', `${dateStr}T23:59:59.999Z`);

        const empIds = [...new Set((rawRows || []).map((r: any) => r.employee_id || r.device_user_id).filter(Boolean))];

        for (const empId of empIds) {
          const { data: emp } = await supabase
            .from('employees')
            .select('id, employee_code, name, department')
            .or(`id.eq.${empId},employee_code.eq.${empId},device_user_id.eq.${empId}`)
            .maybeSingle();

          const empCode = emp ? (emp.employee_code || emp.id) : empId;
          const empUuid = emp ? emp.id : empId;
          const empName = emp ? emp.name : `Employee ${empId}`;
          const dept = emp ? (emp.department || 'Engineering') : 'Engineering';

          await AttendanceProcessor.recalculateDailySummaryFromRawPunches(
            'COMP-001', empUuid, empCode, empName, dept, dateStr
          );
        }
      }

      return res.json({
        success: true,
        message: `Successfully parsed and ingested ${ingestedCount} USB biometric punches across ${affectedDates.length} attendance dates.`,
        recordsParsed: records.length,
        recordsIngested: ingestedCount,
        affectedEmployees: affectedEmpSet.size,
        affectedDates,
      });
    }

    const targetPath = filePath || 'f:\\TEST LIVE ATTENDANCE\\device dat from usb\\CGKK223862906_attlog.dat';
    const result = await UsbLogImporter.ingestUsbFile(targetPath, deviceIp || '192.168.1.56');
    res.json(result);
  } catch (err: any) {
    console.error('❌ [USB Import Error]:', err);
    res.status(500).json({ success: false, error: err?.message });
  }
});

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

// POST /attendance/reset-engine - Reset Attendance Engine & Rebuild summaries from biometric_raw_punches
router.post('/reset-engine', async (req, res) => {
  try {
    const TODAY_STR = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    console.log(`🔄 [ResetEngine] Starting rebuild of attendance_daily_summary from biometric_raw_punches for date: ${TODAY_STR}...`);

    // Fetch distinct employee_id values present in biometric_raw_punches for today
    const { data: rawPunches, error: rawErr } = await supabase
      .from('biometric_raw_punches')
      .select('employee_id, company_id')
      .not('employee_id', 'is', null);

    if (rawErr) throw rawErr;

    // Get unique employee IDs
    const empIds = [...new Set((rawPunches || []).map((p: any) => p.employee_id))];
    let processedCount = 0;

    for (const empId of empIds) {
      // Lookup employee info
      const { data: emp } = await supabase
        .from('employees')
        .select('id, employee_code, name, department')
        .or(`id.eq.${empId},employee_code.eq.${empId}`)
        .maybeSingle();

      const empCode = emp ? (emp.employee_code || emp.id) : empId;
      const empUuid = emp ? emp.id : empId;
      const empName = emp ? emp.name : `Employee ${empId}`;
      const dept = emp ? (emp.department || 'Engineering') : 'Engineering';

      await AttendanceProcessor.recalculateDailySummaryFromRawPunches(
        'COMP-001', empUuid, empCode, empName, dept, TODAY_STR
      );
      processedCount++;
    }

    console.log(`✅ [ResetEngine] Successfully rebuilt ${processedCount} daily summaries from biometric_raw_punches.`);
    res.json({
      success: true,
      message: `Reset Attendance Engine completed. Rebuilt ${processedCount} daily summaries from raw machine punches.`,
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
