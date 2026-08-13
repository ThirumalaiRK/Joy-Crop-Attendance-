import { supabase } from '../supabase';
import { employeeCache } from '../cache/EmployeeCache';
import { parseDeviceTimeToUTC, getAttendanceDayRange } from '../timezone';

export interface RawPunchLog {
  device_ip: string;
  device_user_id: string | number;
  machine_timestamp?: string; // Exact device string e.g. "2026-08-13 09:20:59"
  event_time?: string | Date; // Fallback if machine_timestamp is not set directly
  received_at_utc?: string;
  machine_log_id?: string;
  verification_type?: string;
  device_name?: string;
  raw_payload?: string;
}

export interface ShiftTimetable {
  id: string;
  name: string;
  check_in_time: string; // e.g. "09:00"
  check_out_time: string; // e.g. "18:00"
  check_in_start: string;
  check_in_end: string;
  check_out_start: string;
  check_out_end: string;
  late_allowed_mins: number;
  early_out_allowed_mins: number;
  lunch_start: string;
  lunch_end: string;
}

const DEFAULT_SHIFT: ShiftTimetable = {
  id: 'SHIFT-DEFAULT',
  name: 'Standard Office Shift',
  check_in_time: '09:00',
  check_out_time: '18:00',
  check_in_start: '00:00',
  check_in_end: '23:59',
  check_out_start: '00:00',
  check_out_end: '23:59',
  late_allowed_mins: 5,
  early_out_allowed_mins: 5,
  lunch_start: '13:00',
  lunch_end: '14:00',
};

// In-memory cooldown tracker: empCode -> last punch timestamp (ms)
const punchCooldownMap = new Map<string, number>();

export class AttendanceProcessor {
  /**
   * Main entry point: Processes a raw punch from biometric hardware.
   *
   * IMMUTABLE RULE:
   * 1. The exact machine_timestamp is inserted into `biometric_raw_punches` FIRST.
   * 2. event_time_utc is derived explicitly using Asia/Kolkata timezone via Luxon.
   * 3. Machine time is NEVER replaced or overwritten with server/received time.
   */
  static async processPunch(raw: RawPunchLog): Promise<any> {
    const rawUserIdStr = String(raw.device_user_id || '').trim();
    const machineTimestampStr = String(raw.machine_timestamp || raw.event_time || '').trim();

    // ─── GUARD 1: Reject unenrolled, empty, or garbage user IDs ───────────────
    const isPrintableAscii = /^[\x21-\x7E]+$/.test(rawUserIdStr);
    if (!rawUserIdStr || rawUserIdStr === '0' || rawUserIdStr === 'NaN' || !isPrintableAscii) {
      console.warn(`🚫 [AttendanceProcessor] Rejected garbage punch (User ID "${rawUserIdStr}").`);
      return { status: 'REJECTED', reason: 'GARBAGE_USER_ID', raw: rawUserIdStr };
    }

    if (!machineTimestampStr) {
      console.warn(`🚫 [AttendanceProcessor] Rejected punch for User ID "${rawUserIdStr}": Missing machine_timestamp.`);
      return { status: 'REJECTED', reason: 'MISSING_MACHINE_TIMESTAMP' };
    }

    // Explicitly parse machine_timestamp as Asia/Kolkata (IST) -> canonical UTC ISO
    const eventTimeUtcIso = parseDeviceTimeToUTC(machineTimestampStr);
    const punchTimeUtc = new Date(eventTimeUtcIso);
    const dayRange = getAttendanceDayRange(eventTimeUtcIso);
    const dateStrIST = dayRange.dateIST; // YYYY-MM-DD in IST

    // Format IST display time string for logging
    const timeStrIST = punchTimeUtc.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    console.log(`\n⚙️ [AttendanceProcessor] Processing punch for User ID "${rawUserIdStr}" at ${machineTimestampStr} (IST: ${timeStrIST}) from ${raw.device_ip}`);

    // ─── GUARD 2: Reject timestamps > 24 hours in the future ─────────────────
    const nowMs = Date.now();
    const punchMs = punchTimeUtc.getTime();
    if (punchMs > nowMs + 24 * 60 * 60 * 1000) {
      console.warn(`🚫 [AttendanceProcessor] Rejected punch with FUTURE timestamp: ${eventTimeUtcIso} (Device time: ${machineTimestampStr}).`);
      return { status: 'REJECTED', reason: 'FUTURE_TIMESTAMP', deviceTime: machineTimestampStr };
    }

    // ── STEP 1: Resolve Employee via Mapping Table / Cache ────────────────────
    const employee = await this.resolveEmployee(rawUserIdStr, raw.device_ip);

    const isMapped = !!employee;
    let empCode = employee ? (employee.employee_code || employee.id) : null;
    if (empCode) {
      const num = parseInt(empCode.replace(/\D/g, ''), 10);
      if (!isNaN(num)) {
        empCode = `EMP-${String(num).padStart(2, '0')}`;
      }
    }
    const empName = employee ? employee.name : null;
    const dept = employee ? (employee.department || 'Engineering') : null;

    // ── STEP 2: Insert into `biometric_raw_punches` (Immutable Source of Truth) ──
    let rawPunchRecordId: string | null = null;
    let rawPayloadObj: any = null;
    if (raw.raw_payload) {
      try { rawPayloadObj = typeof raw.raw_payload === 'string' ? JSON.parse(raw.raw_payload) : raw.raw_payload; } catch (_) {}
    }

    const rawPunchData = {
      company_id: 'COMP-001',
      device_ip: raw.device_ip,
      device_user_id: rawUserIdStr,
      employee_id: employee ? employee.id : null,
      mapping_status: isMapped ? 'MAPPED' : 'UNMAPPED',
      machine_log_id: raw.machine_log_id || null,
      machine_timestamp: machineTimestampStr, // Exact device string e.g. "2026-08-13 09:20:59"
      machine_timezone: 'Asia/Kolkata',
      event_time_utc: eventTimeUtcIso,       // Canonical UTC ISO
      event_type: 'RAW_PUNCH',               // Single physical machine event mode
      verification_type: (raw.verification_type || 'FINGERPRINT').toUpperCase(),
      raw_payload: rawPayloadObj,
      source: 'BIOMETRIC_MACHINE',
      received_at_utc: raw.received_at_utc || new Date().toISOString(),
    };

    try {
      const { data: insertedRaw, error: rawInsertErr } = await supabase
        .from('biometric_raw_punches')
        .insert([rawPunchData])
        .select('id')
        .single();

      if (rawInsertErr) {
        if (rawInsertErr.code === '23505' || rawInsertErr.message?.includes('duplicate')) {
          console.log(`ℹ️ [AttendanceProcessor] Already ingested machine punch (${machineTimestampStr}, User ${rawUserIdStr}). Skipping.`);
          return { status: 'ALREADY_INGESTED', machine_timestamp: machineTimestampStr };
        }
        console.warn('⚠️ [AttendanceProcessor] biometric_raw_punches insert warning:', rawInsertErr.message);
      } else if (insertedRaw) {
        rawPunchRecordId = insertedRaw.id;
      }
    } catch (err: any) {
      console.warn('⚠️ [AttendanceProcessor] biometric_raw_punches exception:', err?.message);
    }

    // If unmapped, log and stop processing (do NOT create dummy employee, DO NOT discard raw punch!)
    if (!isMapped) {
      console.warn(`⚠️ [AttendanceProcessor] Unmapped punch for Hardware User ID "${rawUserIdStr}". Stored as UNMAPPED in biometric_raw_punches.`);
      try {
        await supabase.from('attendance_unknown_events').insert([{
          device_ip: raw.device_ip,
          device_user_id: rawUserIdStr,
          event_time: eventTimeUtcIso,
          verification_type: raw.verification_type || 'fingerprint',
          notes: `Machine time: ${machineTimestampStr}`,
        }]);
      } catch (_) {}
      return { status: 'UNKNOWN_USER', device_user_id: rawUserIdStr, machine_timestamp: machineTimestampStr };
    }

    console.log(`👤 [AttendanceProcessor] Mapped User ID "${rawUserIdStr}" -> Employee: ${empName} (${empCode})`);

    // STEP 3: Load Active Shift Timetable
    const shift = await this.loadActiveTimetable();

    // STEP 4: Recalculate Daily Summary strictly from ordered biometric_raw_punches for this employee & IST date
    const summaryResult = await this.recalculateDailySummaryFromRawPunches(
      'COMP-001', employee.id, empCode!, empName!, dept!, dateStrIST
    );

    return {
      status: 'SUCCESS',
      employee_id: empCode,
      employee_name: empName,
      machine_timestamp: machineTimestampStr,
      summary: summaryResult,
    };
  }

  /**
   * Resolves employee record using explicit mapping table first, RAM cache second, DB third.
   * NO hardcoded mock employee fallback allowed.
   */
  private static async resolveEmployee(rawUserIdStr: string, deviceIp?: string): Promise<any> {
    const cleanId = rawUserIdStr.trim();
    if (!cleanId || cleanId === '0' || cleanId === 'EMP-0') return null;

    // 1. Check explicit mapping table (employee_biometric_mappings)
    try {
      let query = supabase
        .from('employee_biometric_mappings')
        .select('employee_id, employees(*)')
        .eq('device_user_id', cleanId)
        .eq('is_active', true);

      if (deviceIp) {
        query = query.or(`device_ip.eq.${deviceIp},device_ip.is.null`);
      }

      const { data: mappings } = await query.limit(1);
      if (mappings && mappings.length > 0 && (mappings[0] as any).employees) {
        const emp = (mappings[0] as any).employees;
        employeeCache.set(emp);
        return emp;
      }
    } catch (_) {}

    // 2. RAM Cache Lookup
    const cached = employeeCache.get(cleanId);
    if (cached && cached.name && !cached.name.toLowerCase().includes('employee 0')) {
      return cached;
    }

    const numericUid = parseInt(cleanId.replace(/\D/g, ''), 10);
    if (isNaN(numericUid) || numericUid <= 0) return null;

    const codeVariants = [
      `EMP-${numericUid}`,
      `EMP-${String(numericUid).padStart(2, '0')}`,
      `EMP-${String(numericUid).padStart(3, '0')}`,
      `EMP-${String(numericUid).padStart(6, '0')}`,
      String(numericUid),
      cleanId,
    ];

    // 3. Query employees table by employee_code or device_user_id or device_uid
    const orClauses = codeVariants.map(v => `employee_code.eq.${v},device_user_id.eq.${v}`).join(',') + `,device_uid.eq.${numericUid}`;
    const { data: emps } = await supabase
      .from('employees')
      .select('*')
      .or(orClauses)
      .not('name', 'ilike', '%Employee 0%');

    if (emps && emps.length > 0) {
      employeeCache.set(emps[0]);
      return emps[0];
    }

    // 4. Query device_users table
    const { data: devUser } = await supabase
      .from('device_users')
      .select('*')
      .or(`device_user_id.eq.${cleanId},uid.eq.${numericUid}`)
      .maybeSingle();

    if (devUser && devUser.name && !devUser.name.toLowerCase().includes('employee 0')) {
      const unpaddedCode = `EMP-${String(numericUid).padStart(2, '0')}`;
      const newEmp = {
        id: require('crypto').randomUUID(),
        employee_code: unpaddedCode,
        device_user_id: cleanId,
        name: devUser.name,
        department: 'Engineering',
        status: 'Active',
        updated_at: new Date().toISOString(),
      };
      try {
        await supabase.from('employees').insert([newEmp]);
        employeeCache.set(newEmp);
      } catch (_) {}
      return newEmp;
    }

    // NO hardcoded mock fallback — return null if unmapped
    return null;
  }

  private static async getOrCreateSession(empCode: string, empName: string, dept: string, dateStrIST: string): Promise<any> {
    const { data: existingRows } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('employee_id', empCode)
      .eq('session_date', dateStrIST)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingRows && existingRows.length > 0) return existingRows[0];

    const newSession = {
      id: require('crypto').randomUUID(),
      employee_id: empCode,
      employee_name: empName,
      department: dept,
      session_date: dateStrIST,
      status: 'PENDING',
      total_time_mins: 0,
      net_work_mins: 0,
      break_time_mins: 0,
      late_mins: 0,
      early_exit_mins: 0,
      overtime_mins: 0,
      payable_hours: 0,
      is_finalized: false,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from('attendance_sessions')
      .insert([newSession])
      .select()
      .single();

    if (error || !inserted) return newSession;
    return inserted;
  }

  private static getISTMinutes(date: Date): number {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
  }

  private static classifyPunch(
    punchTimeUtc: Date,
    session: any,
    shift: ShiftTimetable,
    empCode: string
  ): { eventType: string; lateMins: number; earlyMins: number; userMessage: string; userSubtext: string } {
    const punchMins = this.getISTMinutes(punchTimeUtc);
    const currentPunchMs = punchTimeUtc.getTime();

    const [shInH, shInM] = shift.check_in_time.split(':').map(Number);
    const shiftInMins = shInH * 60 + shInM;

    const [shOutH, shOutM] = shift.check_out_time.split(':').map(Number);
    const shiftOutMins = shOutH * 60 + shOutM;

    const [shOutStartH, shOutStartM] = (shift.check_out_start || '16:00').split(':').map(Number);
    const shiftOutStartMins = shOutStartH * 60 + shOutStartM;
    const effectiveCheckOutStart = Math.min(shiftOutStartMins, shiftOutMins - 30);

    // Rapid double-tap cooldown (3s)
    const lastMs = punchCooldownMap.get(empCode) || 0;
    if (lastMs > 0 && Math.abs(currentPunchMs - lastMs) < 3_000) {
      return {
        eventType: 'COOLDOWN_IGNORE',
        lateMins: 0,
        earlyMins: 0,
        userMessage: 'Please wait...',
        userSubtext: 'Fingerprint already verified recently.',
      };
    }
    punchCooldownMap.set(empCode, currentPunchMs);

    // First scan of the day -> CHECK_IN
    if (!session || !session.check_in_time) {
      let lateMins = 0;
      if (punchMins > shiftInMins + shift.late_allowed_mins) {
        lateMins = punchMins - shiftInMins;
      }
      return {
        eventType: 'CHECK_IN',
        lateMins,
        earlyMins: 0,
        userMessage: 'Welcome',
        userSubtext: lateMins > 0 ? `Check-In Successful (${lateMins}m Late)` : 'Check-In Successful',
      };
    }

    // Exit scan evaluation
    const checkInMs = session.check_in_time ? new Date(session.check_in_time).getTime() : 0;
    const isAfternoonOrSubstantial = punchMins >= 13 * 60 || (checkInMs > 0 && (currentPunchMs - checkInMs >= 30 * 60 * 1000));
    const inCheckOutWindow = punchMins >= effectiveCheckOutStart || isAfternoonOrSubstantial;

    if (inCheckOutWindow) {
      let earlyMins = 0;
      if (punchMins < shiftOutMins - shift.early_out_allowed_mins) {
        earlyMins = shiftOutMins - punchMins;
      }
      return {
        eventType: 'CHECK_OUT',
        lateMins: 0,
        earlyMins,
        userMessage: 'Goodbye',
        userSubtext: earlyMins > 0 ? `Check-Out Successful (${earlyMins}m Early)` : 'Check-Out Successful',
      };
    }

    return {
      eventType: 'DUPLICATE_CHECK_IN',
      lateMins: 0,
      earlyMins: 0,
      userMessage: 'Welcome Back',
      userSubtext: 'You already checked in today.',
    };
  }

  private static async applyClassificationToSession(
    session: any, punchTimeUtc: Date, cls: any, shift: ShiftTimetable
  ): Promise<any> {
    const isoTime = punchTimeUtc.toISOString();
    const nowIso = new Date().toISOString();

    if (
      cls.eventType === 'DUPLICATE_CHECK_IN' ||
      cls.eventType === 'ALREADY_CHECKED_OUT' ||
      cls.eventType === 'COOLDOWN_IGNORE' ||
      cls.eventType === 'DUPLICATE_IGNORE'
    ) {
      await supabase
        .from('attendance_sessions')
        .update({ updated_at: nowIso })
        .eq('id', session.id);
      return session;
    }

    const updatePayload: any = { updated_at: nowIso };

    if (cls.eventType === 'CHECK_IN') {
      updatePayload.check_in_time = isoTime;
      updatePayload.status = cls.lateMins > 0 ? 'LATE' : 'PRESENT';
      updatePayload.late_mins = cls.lateMins;
    } else if (cls.eventType === 'CHECK_OUT') {
      updatePayload.check_out_time = isoTime;
      updatePayload.is_finalized = true;

      const startT = new Date(session.check_in_time || isoTime);
      const endT = punchTimeUtc;
      const totalMins = Math.max(0, Math.round((endT.getTime() - startT.getTime()) / (1000 * 60)));

      // 1:00 PM - 2:00 PM lunch overlap deduction
      const startISTMins = this.getISTMinutes(startT);
      const endISTMins = this.getISTMinutes(endT);
      const lunchStartMins = 13 * 60;
      const lunchEndMins = 14 * 60;
      const overlapStart = Math.max(startISTMins, lunchStartMins);
      const overlapEnd = Math.min(endISTMins, lunchEndMins);
      const lunchOverlapMins = Math.max(0, overlapEnd - overlapStart);
      const lunchDeductionMins = Math.min(lunchOverlapMins, 60);

      const breakMins = session.break_time_mins || 0;
      const netMins = Math.max(0, totalMins - breakMins - lunchDeductionMins);

      updatePayload.total_time_mins = totalMins;
      updatePayload.net_work_mins = netMins;
      updatePayload.payable_hours = +(netMins / 60).toFixed(2);
      updatePayload.early_exit_mins = cls.earlyMins;
      updatePayload.overtime_mins = netMins > 480 ? netMins - 480 : 0;
    }

    const { data: updated, error } = await supabase
      .from('attendance_sessions')
      .update(updatePayload)
      .eq('id', session.id)
      .select()
      .maybeSingle();

    if (error) console.warn('[AttendanceProcessor] Session update error:', error.message);
    return updated || { ...session, ...updatePayload };
  }

  private static async updateAttendanceRecord(
    empCode: string,
    empName: string,
    dept: string,
    session: any,
    deviceIp: string,
    machineTimestampStr: string,
    eventTimeUtcIso: string,
    rawPunchRecordId: string | null
  ): Promise<void> {
    const recId = `LOG-${session.session_date}-${empCode}`;
    const checkInDisplayStr = session.check_in_time
      ? new Date(session.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      : null;
    const checkOutDisplayStr = session.check_out_time
      ? new Date(session.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      : null;

    try {
      const payload: any = {
        id: recId,
        employee_id: empCode,
        employee_name: empName,
        department: dept,
        check_in_time: checkInDisplayStr,
        check_out_time: checkOutDisplayStr,
        check_in_utc: session.check_in_time || null,
        check_out_utc: session.check_out_time || null,
        date: session.session_date,
        method: 'fingerprint',
        status: session.status === 'LATE' ? 'late' : 'present',
        device_name: `Identix Terminal (${deviceIp})`,
        confidence_score: 99.8,
        location: 'HQ Main Terminal',
        verified: true,
      };

      if (rawPunchRecordId && !session.check_out_time) {
        payload.first_punch_id = rawPunchRecordId;
        payload.machine_check_in_ts = machineTimestampStr;
      } else if (rawPunchRecordId && session.check_out_time) {
        payload.last_punch_id = rawPunchRecordId;
        payload.machine_check_out_ts = machineTimestampStr;
      }

      await supabase.from('attendance_records').upsert([payload], { onConflict: 'id' });
    } catch (_) {}
  }

  /**
   * Recalculates attendance_daily_summary strictly from all raw machine punches
   * for the given employee on a specific IST attendance date.
   */
  public static async recalculateDailySummaryFromRawPunches(
    companyId: string,
    empUuid: string,
    empCode: string,
    empName: string,
    dept: string,
    dateStrIST: string
  ): Promise<any> {
    const dayRange = getAttendanceDayRange(dateStrIST);

    // Fetch all raw punches for this employee within the IST business day range (startUTC -> endUTC)
    // Primary sort: event_time_utc ASC. Secondary sort: machine_log_id ASC
    const { data: rawPunches, error } = await supabase
      .from('biometric_raw_punches')
      .select('*')
      .eq('company_id', companyId)
      .or(`employee_id.eq.${empUuid},employee_id.eq.${empCode}`)
      .gte('event_time_utc', dayRange.startUTC)
      .lte('event_time_utc', dayRange.endUTC)
      .order('event_time_utc', { ascending: true })
      .order('machine_log_id', { ascending: true });

    if (error) {
      console.warn('⚠️ [AttendanceProcessor] Error querying biometric_raw_punches:', error.message);
    }

    const punches = rawPunches || [];
    if (punches.length === 0) {
      console.log(`ℹ️ [AttendanceProcessor] No raw punches found for ${empName} (${empCode}) on ${dateStrIST}.`);
      return null;
    }

    const firstPunch = punches[0];
    const sourcePunchIds = punches.map((p) => p.id);

    let summaryPayload: any;

    if (punches.length === 1) {
      // SINGLE-PUNCH RULE:
      // Check-In = First Punch
      // Check-Out = NULL (Dash / Working)
      // Status = WORKING
      // first_punch_id = RAW-1, last_punch_id = NULL
      summaryPayload = {
        company_id: companyId,
        employee_id: empCode,
        employee_name: empName,
        department: dept,
        attendance_date: dateStrIST,
        first_punch_id: firstPunch.id,
        last_punch_id: null,
        source_punch_ids: sourcePunchIds,
        first_check_in_utc: firstPunch.event_time_utc,
        first_check_in_machine_ts: firstPunch.machine_timestamp,
        last_check_out_utc: null,
        last_check_out_machine_ts: null,
        gross_working_minutes: 0,
        break_minutes: 0,
        lunch_minutes: 0,
        net_working_minutes: 0,
        late_minutes: 0,
        early_out_minutes: 0,
        overtime_minutes: 0,
        payable_hours: 0,
        attendance_status: 'WORKING',
        total_punches: 1,
        updated_at: new Date().toISOString(),
      };
    } else {
      // TWO / MULTI-PUNCH RULE:
      // Check-In = First Punch
      // Check-Out = Last Punch
      // Status = CHECKED OUT
      const lastPunch = punches[punches.length - 1];
      const startMs = new Date(firstPunch.event_time_utc).getTime();
      const endMs = new Date(lastPunch.event_time_utc).getTime();
      const grossMins = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));

      // 1 hour lunch deduction if gross working hours >= 4 hours
      const lunchMins = grossMins >= 240 ? 60 : 0;
      const netMins = Math.max(0, grossMins - lunchMins);
      const payableHours = +(netMins / 60).toFixed(2);

      summaryPayload = {
        company_id: companyId,
        employee_id: empCode,
        employee_name: empName,
        department: dept,
        attendance_date: dateStrIST,
        first_punch_id: firstPunch.id,
        last_punch_id: lastPunch.id,
        source_punch_ids: sourcePunchIds,
        first_check_in_utc: firstPunch.event_time_utc,
        first_check_in_machine_ts: firstPunch.machine_timestamp,
        last_check_out_utc: lastPunch.event_time_utc,
        last_check_out_machine_ts: lastPunch.machine_timestamp,
        gross_working_minutes: grossMins,
        break_minutes: 0,
        lunch_minutes: lunchMins,
        net_working_minutes: netMins,
        late_minutes: 0,
        early_out_minutes: 0,
        overtime_minutes: netMins > 480 ? netMins - 480 : 0,
        payable_hours: payableHours,
        attendance_status: 'CHECKED OUT',
        total_punches: punches.length,
        updated_at: new Date().toISOString(),
      };
    }

    // Upsert into attendance_daily_summary
    const { data: summaryData, error: summaryErr } = await supabase
      .from('attendance_daily_summary')
      .upsert([summaryPayload], { onConflict: 'company_id,employee_id,attendance_date' })
      .select()
      .maybeSingle();

    if (summaryErr) {
      console.warn('⚠️ [AttendanceProcessor] Upsert daily summary error:', summaryErr.message);
    }

    // Synchronize legacy attendance_records for web dashboard compatibility without same-timestamp bugs
    try {
      const recId = `LOG-${dateStrIST}-${empCode}`;
      const recPayload: any = {
        id: recId,
        employee_id: empCode,
        employee_name: empName,
        department: dept,
        check_in_time: summaryPayload.first_check_in_machine_ts,
        check_out_time: summaryPayload.last_check_out_machine_ts || null,
        check_in_utc: summaryPayload.first_check_in_utc,
        check_out_utc: summaryPayload.last_check_out_utc || null,
        date: dateStrIST,
        first_punch_id: summaryPayload.first_punch_id,
        last_punch_id: summaryPayload.last_punch_id,
        machine_check_in_ts: summaryPayload.first_check_in_machine_ts,
        machine_check_out_ts: summaryPayload.last_check_out_machine_ts,
        method: 'fingerprint',
        status: summaryPayload.attendance_status === 'CHECKED OUT' ? 'present' : 'working',
        device_name: firstPunch.device_name || `Identix Terminal (${firstPunch.device_ip})`,
        location: 'HQ Main Terminal',
        verified: true,
      };
      await supabase.from('attendance_records').upsert([recPayload], { onConflict: 'id' });
    } catch (_) {}

    return summaryData || summaryPayload;
  }

  private static async loadActiveTimetable(): Promise<ShiftTimetable> {
    try {
      const { data } = await supabase
        .from('timetables')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const tt = data[0];
        const isActiveAdditional = tt.active_additional_setting !== false;
        return {
          id: tt.id,
          name: tt.name || 'Default Office Shift',
          check_in_time: tt.check_in_time || '09:00',
          check_out_time: tt.check_out_time || '18:00',
          check_in_start: isActiveAdditional ? (tt.check_in_start_at || '00:00') : '00:00',
          check_in_end: isActiveAdditional ? (tt.check_in_end_at || '23:59') : '23:59',
          check_out_start: isActiveAdditional ? (tt.check_out_start_at || '00:00') : '00:00',
          check_out_end: isActiveAdditional ? (tt.check_out_end_at || '23:59') : '23:59',
          late_allowed_mins: tt.late_in_mins ?? 5,
          early_out_allowed_mins: tt.early_out_mins ?? 5,
          lunch_start: '12:00',
          lunch_end: '13:00',
        };
      }
    } catch (_) {}
    return DEFAULT_SHIFT;
  }
}
