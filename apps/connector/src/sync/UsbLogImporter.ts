import fs from 'fs';
import path from 'path';
import { AttendanceProcessor } from './AttendanceProcessor';
import { supabase } from '../supabase';

export interface UsbPunchRecord {
  device_user_id: string;
  machine_timestamp: string;
  status_code?: string;
  verify_mode_code?: string;
  verification_type: string;
  raw_line: string;
}

export class UsbLogImporter {
  /**
   * Parses ZKTeco USB export log file (e.g. CGKK223862906_attlog.dat / attlog.dat)
   * Format per line: "   EMP-09\t2026-08-10 16:03:04\t1\t1\t1\t0"
   */
  public static parseUsbLogContent(content: string): UsbPunchRecord[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const records: UsbPunchRecord[] = [];

    for (const line of lines) {
      const clean = line.trim();
      const parts = clean.split(/\t+|\s{2,}/);
      if (parts.length < 2) continue;

      const userId = parts[0]?.trim();
      const ts = parts[1]?.trim();

      // Validate machine timestamp string YYYY-MM-DD HH:mm:ss
      if (!userId || !ts || !/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(ts)) {
        continue;
      }

      const statusCode = parts[2]?.trim() || '1';
      const verifyCode = parts[3]?.trim() || '1';

      let verificationType = 'FINGERPRINT';
      if (verifyCode === '3' || verifyCode === '4' || verifyCode === '11') {
        verificationType = 'CARD';
      } else if (verifyCode === '15') {
        verificationType = 'PASSWORD';
      } else if (verifyCode === '20') {
        verificationType = 'FACE';
      }

      records.push({
        device_user_id: userId,
        machine_timestamp: ts,
        status_code: statusCode,
        verify_mode_code: verifyCode,
        verification_type: verificationType,
        raw_line: clean,
      });
    }

    return records;
  }

  /**
   * Ingests a ZKTeco USB attlog.dat file directly into biometric_raw_punches
   * and triggers attendance_daily_summary recalculation for all affected dates.
   */
  public static async ingestUsbFile(filePath: string, deviceIp = '192.168.1.56'): Promise<{
    success: boolean;
    recordsParsed: number;
    recordsIngested: number;
    affectedEmployees: number;
    affectedDates: string[];
    message: string;
  }> {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        recordsParsed: 0,
        recordsIngested: 0,
        affectedEmployees: 0,
        affectedDates: [],
        message: `USB file not found: ${filePath}`,
      };
    }

    const filename = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const parsedRecords = this.parseUsbLogContent(content);

    console.log(`📂 [UsbLogImporter] Ingesting USB log file "${filename}" (${parsedRecords.length} records parsed)...`);

    let ingestedCount = 0;
    const affectedEmpSet = new Set<string>();
    const affectedDateSet = new Set<string>();

    for (const rec of parsedRecords) {
      const res = await AttendanceProcessor.processPunch({
        device_ip: deviceIp,
        device_user_id: rec.device_user_id,
        machine_timestamp: rec.machine_timestamp,
        verification_type: rec.verification_type,
        device_name: `Identix Terminal (USB Dump ${filename})`,
        raw_payload: JSON.stringify({ source: 'USB_EXPORT', filename, line: rec.raw_line }),
      });

      if (res && res.status !== 'REJECTED') {
        ingestedCount++;
        if (rec.device_user_id) affectedEmpSet.add(rec.device_user_id);
        const datePart = rec.machine_timestamp.split(' ')[0];
        if (datePart) affectedDateSet.add(datePart);
      }
    }

    // Trigger full daily summary recalculation for all affected dates and employees
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

    console.log(`✅ [UsbLogImporter] Completed USB ingestion of "${filename}": ${ingestedCount}/${parsedRecords.length} records synced across ${affectedDates.length} dates.`);

    return {
      success: true,
      recordsParsed: parsedRecords.length,
      recordsIngested: ingestedCount,
      affectedEmployees: affectedEmpSet.size,
      affectedDates,
      message: `Successfully ingested ${ingestedCount} USB biometric punches from ${filename} across ${affectedDates.length} attendance dates.`,
    };
  }

  /**
   * Automatically scans directory `device dat from usb` for any .dat files and ingests them.
   */
  public static async autoScanAndIngest(workspaceDir = 'f:\\TEST LIVE ATTENDANCE'): Promise<void> {
    const usbDir = path.join(workspaceDir, 'device dat from usb');
    if (!fs.existsSync(usbDir)) return;

    try {
      const files = fs.readdirSync(usbDir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.dat') || file.toLowerCase().includes('attlog')) {
          const fullPath = path.join(usbDir, file);
          await this.ingestUsbFile(fullPath);
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [UsbLogImporter] Auto-scan notice:`, err?.message);
    }
  }
}
