import { supabase, logAuditEntry } from '../supabase';
import { eventBus } from '../events/event-bus';
import { getAttendanceDayRange, utcToIST, parseDeviceTimeToUTC } from '../timezone';
import {
  AttendanceEvent,
  AttendanceEventType,
  AttendanceSession,
  AttendanceSummary,
  AttendanceStatus,
  AttendanceAlert,
  AttendanceCorrection,
  ShiftRule,
} from './attendance-types';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function formatTimeAmPm(isoOrTimeStr: string): string {
  if (!isoOrTimeStr) return '—';
  try {
    const d = new Date(isoOrTimeStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch (e) {}
  return isoOrTimeStr;
}

export function formatDurationMinutes(mins: number): string {
  if (!mins || mins <= 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

// Default Shift Config (General 09:00 AM - 06:00 PM with 15 mins grace)
export const DEFAULT_SHIFT_RULE: ShiftRule = {
  id: 'SHIFT-GEN-01',
  name: 'General Morning Shift',
  type: 'FIXED',
  startTime: '09:00 AM',
  endTime: '06:00 PM',
  gracePeriodMins: 15,
  minWorkingHours: 8,
  mandatoryLunchMins: 45,
  maxBreakMins: 30,
  overtimeAllowed: true,
};

// ─── INITIAL RESILIENT MOCK DATASTORE ────────────────────────────────────────
// CRITICAL: Always compute today's date in IST (Asia/Kolkata = UTC+5:30).
// On Vercel (UTC server), `new Date().toISOString().split('T')[0]` returns the UTC date.
// After 6:30 PM IST, Vercel would compute the *next* UTC day, breaking today's attendance!
const TODAY_STR = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // "YYYY-MM-DD" in IST

const INITIAL_EVENTS: AttendanceEvent[] = [];

let eventsStore: AttendanceEvent[] = [];
let alertsStore: AttendanceAlert[] = [];
let correctionsStore: AttendanceCorrection[] = [];

// Subscribers for Realtime events
type AttendanceCallback = () => void;
const subscribers: Set<AttendanceCallback> = new Set();

// Dynamic RAM cache for resolving employee names and departments
const employeeLookupCache = new Map<string, { id: string; name: string; dept: string }>();

export async function refreshEmployeeLookupCache(): Promise<void> {
  try {
    const { data: emps } = await supabase.from('employees').select('id, employee_code, device_user_id, name, department');
    if (emps) {
      emps.forEach((emp: any) => {
        const info = { id: emp.employee_code || emp.id, name: emp.name, dept: emp.department || 'Engineering' };
        if (emp.id) employeeLookupCache.set(emp.id, info);
        if (emp.name) employeeLookupCache.set(emp.name.toLowerCase(), info);
        if (emp.employee_code) {
          employeeLookupCache.set(emp.employee_code, info);
          const num = parseInt(emp.employee_code.replace(/\D/g, ''), 10);
          if (!isNaN(num)) {
            employeeLookupCache.set(String(num), info);
            employeeLookupCache.set(`EMP-${num}`, info);
            employeeLookupCache.set(`EMP-${String(num).padStart(2, '0')}`, info);
            employeeLookupCache.set(`EMP-${String(num).padStart(6, '0')}`, info);
            employeeLookupCache.set(`User EMP-${String(num).padStart(2, '0')}`, info);
          }
        }
        if (emp.device_user_id) {
          employeeLookupCache.set(emp.device_user_id, info);
        }
      });
    }
  } catch (e) {}
}

/**
 * Fetches latest attendance_events AND attendance_records from Supabase
 * and merges them into memory store for 100% 2-way real-time data sync.
 */
export async function syncSupabaseEvents(force = false): Promise<void> {
  try {
    await refreshEmployeeLookupCache();
    const newStore: AttendanceEvent[] = [];
    const existingIds = new Set<string>();

    // 1. Fetch attendance_events from Supabase
    const { data: eventRows } = await supabase
      .from('attendance_events')
      .select('*')
      .order('event_time', { ascending: true });

    if (eventRows && eventRows.length > 0) {
      eventRows.forEach((row: any) => {
        if (!existingIds.has(row.id)) {
          const resolved = employeeLookupCache.get(row.employee_id) || employeeLookupCache.get(row.employee_name?.toLowerCase()) || employeeLookupCache.get(row.employee_name);
          const finalEmpId = resolved?.id || row.employee_id;
          const finalEmpName = resolved?.name || (row.employee_name && !row.employee_name.startsWith('User ') ? row.employee_name : `Employee ${row.employee_id}`);

          newStore.push({
            id: row.id,
            sessionId: row.session_id || `sess-${finalEmpId}`,
            employeeId: finalEmpId,
            employeeName: finalEmpName,
            eventType: row.event_type as AttendanceEventType,
            eventTime: row.event_time,
            formattedTime: formatTimeAmPm(row.event_time),
            device: row.device || 'System Terminal',
            method: row.method || 'Manual',
            notes: row.notes,
          });
          existingIds.add(row.id);
        }
      });
    }

    // 2. Fetch attendance_records from Supabase to sync biometric check-ins & check-outs
    const { data: recordRows } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: true });

    if (recordRows && recordRows.length > 0) {
      recordRows.forEach((rec: any) => {
        const rawEmpId = rec.employee_id || rec.id;
        const rawEmpName = rec.employee_name || '';
        const resolved = employeeLookupCache.get(rawEmpId) || employeeLookupCache.get(rawEmpName.toLowerCase()) || employeeLookupCache.get(rawEmpName);

        const empId = resolved?.id || rawEmpId;
        const empName = resolved?.name || (rawEmpName && !rawEmpName.startsWith('User ') ? rawEmpName : `Employee ${rawEmpId}`);
        const recDept = resolved?.dept || rec.department || 'Staff';
        const createdAt = rec.created_at || new Date().toISOString();

        // Use the record's own `date` field, or derive IST date from created_at
        // CRITICAL: Do NOT use createdAt.split('T')[0] — that's UTC date, not IST date.
        // On Vercel (UTC server), records created after 6:30 PM IST would get the NEXT UTC day.
        const recDateStr: string = rec.date && /^\d{4}-\d{2}-\d{2}$/.test(rec.date)
          ? rec.date  // e.g. "2026-08-10"
          : new Date(createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // → "YYYY-MM-DD" in IST


        /**
         * Convert a display time like "09:15 AM" or "05:34:40 PM" stored in IST
         * into a proper UTC ISO timestamp. Since these strings are always saved in
         * Asia/Kolkata (IST = UTC+5:30), we subtract 330 minutes to get UTC.
         * This is safe on any server timezone (Vercel = UTC, local = IST).
         */
        function buildISOFromDisplayTime(displayTime: string, fallbackIso: string): string {
          if (!displayTime || displayTime === '—' || displayTime === '-') return fallbackIso;
          try {
            // Parse "09:15 AM", "05:34:40 PM", "05:33 pm" → hours, minutes, optional seconds
            const match = displayTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
            if (match) {
              let hours = parseInt(match[1], 10);
              const minutes = parseInt(match[2], 10);
              const seconds = match[3] ? parseInt(match[3], 10) : 0;
              const ampm = match[4].toUpperCase();
              if (ampm === 'PM' && hours < 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              // Treat the parsed time as IST (UTC+5:30).
              // Build total minutes since midnight in IST, then subtract 330 to get UTC.
              const istTotalMinutes = hours * 60 + minutes;
              const utcTotalMinutes = istTotalMinutes - 330; // IST → UTC offset
              // Handle day boundary (e.g., early morning IST times may roll into previous UTC day)
              const utcDate = new Date(`${recDateStr}T00:00:00Z`);
              utcDate.setUTCMinutes(utcDate.getUTCMinutes() + utcTotalMinutes);
              utcDate.setUTCSeconds(seconds, 0);
              return utcDate.toISOString();
            }
          } catch {}
          return fallbackIso;
        }

        // Event record from attendance_records
        if (rec.check_in_time) {
          const checkInEvtId = `rec-${rec.status || 'in'}-${rec.id}`;
          if (!existingIds.has(checkInEvtId)) {
            const eventTime = buildISOFromDisplayTime(rec.check_in_time, createdAt);

            // Map status string to AttendanceEventType
            let eventType: AttendanceEventType = 'CHECK_IN';
            const s = (rec.status || '').toLowerCase();
            if (s === 'on_break') eventType = 'BREAK_START';
            else if (s === 'break_end') eventType = 'BREAK_END';
            else if (s === 'on_lunch') eventType = 'LUNCH_START';
            else if (s === 'lunch_end') eventType = 'LUNCH_END';
            else if (s === 'in_meeting') eventType = 'MEETING_OUT';
            else if (s === 'meeting_in') eventType = 'MEETING_IN';
            else if (s === 'on_field_visit') eventType = 'FIELD_VISIT_START';
            else if (s === 'field_visit_end') eventType = 'FIELD_VISIT_END';
            else if (s === 'checked_out') eventType = 'CHECK_OUT';

            newStore.push({
              id: checkInEvtId,
              sessionId: `sess-${empId}`,
              employeeId: empId,
              employeeName: empName,
              eventType,
              eventTime,
              formattedTime: rec.check_in_time,
              device: rec.device_name || 'Mantra MFS110 L1',
              method: rec.method || 'Fingerprint',
              notes: rec.notes || `Workforce Event (${rec.confidence_score ? rec.confidence_score + '%' : 'Verified'})`,
              ...(recDept && recDept !== 'Staff' ? { department: recDept } : {}),
            } as any);
            existingIds.add(checkInEvtId);
          }
        }

        // Check-out event from attendance_records
        if (rec.check_out_time && rec.check_out_time !== '—' && rec.check_out_time !== '-') {
          const checkOutEvtId = `rec-out-${rec.id}`;
          if (!existingIds.has(checkOutEvtId)) {
            const eventTime = buildISOFromDisplayTime(rec.check_out_time, createdAt);
            newStore.push({
              id: checkOutEvtId,
              sessionId: `sess-${empId}`,
              employeeId: empId,
              employeeName: empName,
              eventType: 'CHECK_OUT',
              eventTime,
              formattedTime: rec.check_out_time,
              device: rec.device_name || 'Mantra MFS110 L1',
              method: rec.method || 'Fingerprint',
              notes: `Biometric Check-Out (${rec.confidence_score ? rec.confidence_score + '%' : 'Verified'})`,
              ...(recDept && recDept !== 'Staff' ? { department: recDept } : {}),
            } as any);
            existingIds.add(checkOutEvtId);
          }
        }
      });
    }

    // Deduplicate newStore by ID to guarantee 100% unique event IDs
    const uniqueEventsMap = new Map<string, AttendanceEvent>();
    newStore.forEach((evt) => {
      if (!uniqueEventsMap.has(evt.id)) {
        uniqueEventsMap.set(evt.id, evt);
      }
    });
    eventsStore = Array.from(uniqueEventsMap.values());
    notifySubscribers();
  } catch (e) {}
}

export function subscribeAttendanceEvents(callback: AttendanceCallback) {
  subscribers.add(callback);

  // Trigger initial Supabase sync
  syncSupabaseEvents().then(() => callback()).catch(() => {});

  try {
    const channelId = `realtime-att-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_events' }, async () => {
        await syncSupabaseEvents();
        callback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, async () => {
        await syncSupabaseEvents();
        callback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, async () => {
        await syncSupabaseEvents();
        callback();
      })
      .subscribe();

    return () => {
      subscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => subscribers.delete(callback);
  }
}

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
}

// Helper: Convert Date to IST minutes from midnight
function getISTMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return h * 60 + m;
}

// ─── TIME CALCULATION ENGINE ─────────────────────────────────────────────────

export function calculateNetSummaryForEvents(
  employeeId: string,
  employeeName: string,
  department: string,
  events: AttendanceEvent[],
  shiftRule: ShiftRule = DEFAULT_SHIFT_RULE
): AttendanceSummary {
  const sorted = [...events].sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
  const lastEvent = sorted[sorted.length - 1];

  // First check-in event for today's session
  const checkInEvt = sorted.find((e) => e.eventType === 'CHECK_IN') ||
    sorted.find((e) => (e.eventType as string) === 'RAW_PUNCH') ||
    sorted[0];
  
  // checkOutEvt is the latest CHECK_OUT event in this session
  const checkOutEvt = sorted.slice().reverse().find((e) => e.eventType === 'CHECK_OUT');
  const isCurrentlyCheckedOut = Boolean(checkOutEvt);

  let totalTimeMinutes = 0;
  let checkInTimeStr = '—';
  let checkOutTimeStr = '—';

  const sessionDateStr = checkInEvt?.eventTime
    ? new Date(checkInEvt.eventTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    : TODAY_STR;
  const isTodaySession = sessionDateStr === TODAY_STR;

  if (checkInEvt?.eventTime) {
    const d = new Date(checkInEvt.eventTime);
    const dateLabel = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit' });
    const timeLabel = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    checkInTimeStr = `${dateLabel} • ${timeLabel}`;
  }

  if (checkOutEvt?.eventTime) {
    const d = new Date(checkOutEvt.eventTime);
    const dateLabel = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: '2-digit' });
    const timeLabel = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    checkOutTimeStr = `${dateLabel} • ${timeLabel}`;
  }

  if (checkInEvt && checkOutEvt) {
    const startMs = new Date(checkInEvt.eventTime).getTime();
    const endMs = new Date(checkOutEvt.eventTime).getTime();
    totalTimeMinutes = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
  } else if (checkInEvt) {
    const startMs = new Date(checkInEvt.eventTime).getTime();
    // If not today, cap at shift end (8 hours), never calculate 24h into next days!
    const endMs = isTodaySession ? Date.now() : (startMs + (shiftRule.minWorkingHours || 8) * 60 * 60 * 1000);
    totalTimeMinutes = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
  }

  // 1. Calculate Explicit Tea/Coffee Breaks
  let breakDurationMinutes = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventType === 'BREAK_START') {
      const endEvt = sorted.slice(i + 1).find((e) => e.eventType === 'BREAK_END');
      if (endEvt) {
        const diff = Math.round((new Date(endEvt.eventTime).getTime() - new Date(sorted[i].eventTime).getTime()) / (1000 * 60));
        breakDurationMinutes += Math.max(0, diff);
      }
    }
  }

  // 2. Calculate Meeting Duration
  let meetingDurationMinutes = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventType === 'MEETING_OUT') {
      const endEvt = sorted.slice(i + 1).find((e) => e.eventType === 'MEETING_IN');
      if (endEvt) {
        const diff = Math.round((new Date(endEvt.eventTime).getTime() - new Date(sorted[i].eventTime).getTime()) / (1000 * 60));
        meetingDurationMinutes += Math.max(0, diff);
      }
    }
  }

  // 3. Calculate Field Duration
  let fieldDurationMinutes = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventType === 'FIELD_VISIT_START') {
      const endEvt = sorted.slice(i + 1).find((e) => e.eventType === 'FIELD_VISIT_END');
      if (endEvt) {
        const diff = Math.round((new Date(endEvt.eventTime).getTime() - new Date(sorted[i].eventTime).getTime()) / (1000 * 60));
        fieldDurationMinutes += Math.max(0, diff);
      }
    }
  }

  // 4. Calculate Explicit Lunch Punches vs Automatic Lunch Deduction (13:00 - 14:00 IST)
  let explicitLunchMinutes = 0;
  let explicitLunchTimes: { start: string; end: string }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventType === 'LUNCH_START') {
      const endEvt = sorted.slice(i + 1).find((e) => e.eventType === 'LUNCH_END');
      if (endEvt) {
        const diff = Math.round((new Date(endEvt.eventTime).getTime() - new Date(sorted[i].eventTime).getTime()) / (1000 * 60));
        explicitLunchMinutes += Math.max(0, diff);
        explicitLunchTimes.push({
          start: new Date(sorted[i].eventTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
          end: new Date(endEvt.eventTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
        });
      }
    }
  }

  // Default Timetable Lunch Window: 01:00 PM (13:00) to 02:00 PM (14:00) in IST
  const LUNCH_WINDOW_START_MINS = 13 * 60; // 780 mins (13:00)
  const LUNCH_WINDOW_END_MINS = 14 * 60;   // 840 mins (14:00)
  const MAX_LUNCH_DURATION_MINS = 60;      // 60 minutes

  let lunchDurationMinutes = 0;
  let lunchBreakMode: 'AUTO' | 'ACTUAL' | 'NONE' = 'NONE';
  let lunchDetails = 'No lunch overlap (0m)';
  let automaticBreakMinutes = 0;

  if (explicitLunchMinutes > 0) {
    // ── PRIORITY 2: Explicit Biometric Break Punches Exist ────────────────────
    // Use actual punched duration — DO NOT double deduct automatic lunch!
    lunchDurationMinutes = explicitLunchMinutes;
    lunchBreakMode = 'ACTUAL';
    const rangeText = explicitLunchTimes.map((t) => `${t.start} – ${t.end}`).join(', ');
    lunchDetails = `Actual ${explicitLunchMinutes}m (${rangeText})`;
  } else if (checkInEvt) {
    // ── PRIORITY 3: Automatic Timetable Lunch Deduction (13:00 - 14:00) ──────
    // Calculate exact overlap between attendance span and [13:00, 14:00] in IST
    const startISTMins = getISTMinutes(new Date(checkInEvt.eventTime));
    const endISTMins = checkOutEvt
      ? getISTMinutes(new Date(checkOutEvt.eventTime))
      : getISTMinutes(new Date()); // In progress -> current time in IST

    // Overlap formula: max(0, min(end, lunchEnd) - max(start, lunchStart))
    const overlapStart = Math.max(startISTMins, LUNCH_WINDOW_START_MINS);
    const overlapEnd = Math.min(endISTMins, LUNCH_WINDOW_END_MINS);
    const overlapMins = Math.max(0, overlapEnd - overlapStart);

    if (overlapMins > 0) {
      automaticBreakMinutes = Math.min(overlapMins, MAX_LUNCH_DURATION_MINS);
      lunchDurationMinutes = automaticBreakMinutes;
      lunchBreakMode = 'AUTO';
      lunchDetails = `Auto 1:00 PM – 2:00 PM (${automaticBreakMinutes}m deducted)`;
    } else {
      lunchDurationMinutes = 0;
      lunchBreakMode = 'NONE';
      lunchDetails = 'No lunch overlap (0m)';
    }
  }

  // 5. Net Working Hours Formula = Total Time - Tea Breaks - Lunch Break - Meetings/Field
  const grossWorkingMinutes = totalTimeMinutes;
  const workingTimeMinutes = Math.max(0, grossWorkingMinutes - breakDurationMinutes - lunchDurationMinutes);

  // 6. Late Minutes Calculation (09:00 AM + 5 mins grace = 09:05 AM)
  let lateMinutes = 0;
  if (checkInEvt) {
    const checkInISTMins = getISTMinutes(new Date(checkInEvt.eventTime));
    const shiftInMins = 9 * 60; // 09:00 AM
    const graceMins = 5;
    if (checkInISTMins > shiftInMins + graceMins) {
      lateMinutes = checkInISTMins - shiftInMins;
    }
  }

  // 7. Overtime Calculation (Working Hours > 8 Hours / 480 Mins)
  const shiftTargetMinutes = shiftRule.minWorkingHours * 60; // 480 mins
  const overtimeMinutes = Math.max(0, workingTimeMinutes - shiftTargetMinutes);

  // 8. Early Exit Minutes Calculation (04:00 PM / 16:00)
  let earlyExitMinutes = 0;
  if (checkOutEvt) {
    const checkOutISTMins = getISTMinutes(new Date(checkOutEvt.eventTime));
    const shiftOutMins = 16 * 60; // 04:00 PM (16:00)
    const earlyGraceMins = 5;
    if (checkOutISTMins < shiftOutMins - earlyGraceMins) {
      earlyExitMinutes = shiftOutMins - checkOutISTMins;
    }
  }

  // 9. Payable Hours for Payroll
  const payableHours = parseFloat((workingTimeMinutes / 60).toFixed(2));

  // 10. Current Live Status Determination
  let status: AttendanceStatus = 'PRESENT';

  if (!checkInEvt) {
    status = 'ABSENT';
  } else if (isCurrentlyCheckedOut) {
    status = 'CHECKED_OUT' as any;
  } else if (lastEvent) {
    switch (lastEvent.eventType) {
      case 'LUNCH_START':
        status = 'ON_LUNCH';
        break;
      case 'BREAK_START':
        status = 'ON_BREAK';
        break;
      case 'MEETING_OUT':
        status = 'IN_MEETING';
        break;
      case 'FIELD_VISIT_START':
        status = 'ON_FIELD_VISIT';
        break;
      default:
        status = lateMinutes > 0 ? 'LATE' : 'PRESENT';
    }
  }

  // 11. Complete Calculation Breakdown Structure for Transparency
  const calculationBreakdown = {
    firstCheckIn: checkInTimeStr,
    lastCheckOut: isCurrentlyCheckedOut ? checkOutTimeStr : 'In Progress (Working Now)',
    grossSpanMinutes: totalTimeMinutes,
    teaBreakMinutes: breakDurationMinutes,
    lunchBreakMinutes: lunchDurationMinutes,
    lunchBreakType: (lunchBreakMode === 'AUTO' ? 'AUTO_DEDUCT' : lunchBreakMode === 'ACTUAL' ? 'EXPLICIT_PUNCH' : 'NONE') as any,
    lunchBreakDetails: lunchDetails,
    otherBreakMinutes: meetingDurationMinutes + fieldDurationMinutes,
    netWorkingMinutes: workingTimeMinutes,
    lateMinutes,
    earlyExitMinutes,
    overtimeMinutes,
    isCompleted: isCurrentlyCheckedOut,
  };

  return {
    id: `sum-${employeeId}-${sessionDateStr}`,
    employeeId,
    employeeCode: employeeId,
    employeeName,
    department,
    date: sessionDateStr,
    checkInTime: checkInTimeStr,
    checkOutTime: checkOutTimeStr,
    totalTimeMinutes,
    grossWorkingMinutes,
    breakDurationMinutes,
    explicitBreakMinutes: explicitLunchMinutes,
    automaticBreakMinutes,
    lunchDurationMinutes,
    lunchBreakMode,
    lunchDetails,
    meetingDurationMinutes,
    fieldDurationMinutes,
    workingTimeMinutes,
    lateMinutes,
    earlyExitMinutes,
    overtimeMinutes,
    payableHours,
    status,
    shiftTargetMinutes,
    eventsCount: sorted.length,
    calculationBreakdown,
  };
}

// ─── IMMUTABLE LOGGING OPERATORS ─────────────────────────────────────────────

export async function logAttendanceEvent(payload: {
  employeeId: string;
  employeeName: string;
  department?: string;
  eventType: AttendanceEventType;
  device?: string;
  method?: string;
  location?: string;
  notes?: string;
}): Promise<{ success: boolean; event: AttendanceEvent; summary: AttendanceSummary }> {
  const nowIso = new Date().toISOString();
  const formattedTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const newEvent: AttendanceEvent = {
    id: generateUUID(),
    sessionId: `sess-${payload.employeeId}`,
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
    eventType: payload.eventType,
    eventTime: nowIso,
    formattedTime,
    device: payload.device || 'Mantra MFS110 L1',
    method: payload.method || 'Fingerprint',
    location: payload.location || 'HQ Main Terminal',
    notes: payload.notes,
  };

  // Append to Immutable Event Memory Store
  eventsStore = [...eventsStore, newEvent];

  // 1. Write to attendance_records table (guaranteed table in Supabase)
  try {
    const statusMap: Record<string, string> = {
      CHECK_IN: 'present',
      BREAK_START: 'on_break',
      BREAK_END: 'present',
      LUNCH_START: 'on_lunch',
      LUNCH_END: 'present',
      MEETING_OUT: 'in_meeting',
      MEETING_IN: 'present',
      FIELD_VISIT_START: 'on_field_visit',
      FIELD_VISIT_END: 'present',
      CHECK_OUT: 'checked_out',
    };

    await supabase.from('attendance_records').insert([
      {
        id: `LOG-EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        employee_id: payload.employeeId,
        employee_name: payload.employeeName,
        department: payload.department || 'Staff',
        check_in_time: formattedTime,
        status: statusMap[payload.eventType] || 'present',
        method: payload.method || 'Manual',
        device_name: payload.device || 'Employee Portal',
        date: TODAY_STR,
        confidence_score: 99.4,
      },
    ]);
  } catch (e) {}

  // 2. Also try writing to attendance_events table
  try {
    await supabase.from('attendance_events').insert([
      {
        id: newEvent.id,
        session_id: newEvent.sessionId,
        employee_id: newEvent.employeeId,
        employee_name: newEvent.employeeName,
        event_type: newEvent.eventType,
        event_time: newEvent.eventTime,
        device: newEvent.device,
        method: newEvent.method,
        location: newEvent.location,
        notes: newEvent.notes,
      },
    ]);
  } catch (e) {}

  // Recalculate Summary
  const empEvents = eventsStore.filter((e) => e.employeeId === payload.employeeId);
  const summary = calculateNetSummaryForEvents(
    payload.employeeId,
    payload.employeeName,
    payload.department || 'Staff',
    empEvents
  );

  // Publish to Enterprise Event Bus — propagates to all portal subscriptions
  const busType =
    payload.eventType === 'CHECK_OUT'    ? 'ATTENDANCE_CHECK_OUT' as const :
    payload.eventType === 'BREAK_START'  ? 'BREAK_START'          as const :
    payload.eventType === 'BREAK_END'    ? 'BREAK_END'            as const :
    payload.eventType === 'LUNCH_START'  ? 'LUNCH_START'          as const :
    payload.eventType === 'LUNCH_END'    ? 'LUNCH_END'            as const :
    'ATTENDANCE_CHECK_IN' as const;

  eventBus.publish(busType, newEvent, payload.employeeId, payload.employeeName, payload.department);

  notifySubscribers();
  return { success: true, event: newEvent, summary };
}

export function fetchAllAttendanceEvents(): AttendanceEvent[] {
  return [...eventsStore];
}

export function fetchEmployeeTimeline(employeeId: string): AttendanceEvent[] {
  return eventsStore
    .filter((e) => e.employeeId === employeeId || e.employeeName.toLowerCase() === employeeId.toLowerCase())
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());
}

export function fetchAllAttendanceSummaries(targetDate?: string): AttendanceSummary[] {
  const filterDate = targetDate || TODAY_STR;
  const filteredEvents = eventsStore.filter((evt) => {
    if (!filterDate || filterDate === 'ALL') return true;
    // Extract IST date from event timestamp (UTC ISO string → IST date in YYYY-MM-DD)
    const evtDate = evt.eventTime
      ? new Date(evt.eventTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      : '';
    if (filterDate.length === 7) {
      // Monthly scope e.g. "2026-08"
      return evtDate.startsWith(filterDate) || ((evt as any).date && (evt as any).date.startsWith(filterDate));
    }
    return evtDate === filterDate || (evt as any).date === filterDate;
  });

  const employeeMap = new Map<string, { empId: string; name: string; dept: string; events: AttendanceEvent[] }>();

  filteredEvents.forEach((evt) => {
    const rawName = (evt.employeeName || '').trim();
    const rawId = (evt.employeeId || '').trim();

    if (rawId === '0' || rawId === 'EMP-0' || rawName.toLowerCase().includes('employee 0')) {
      return;
    }

    const resolved = employeeLookupCache.get(rawId) || employeeLookupCache.get(rawName.toLowerCase()) || employeeLookupCache.get(rawName);
    let canonicalId = resolved?.id || rawId;
    let canonicalName = resolved?.name || (rawName && !rawName.startsWith('User ') ? rawName : `Employee ${rawId}`);
    let canonicalDept = resolved?.dept || (evt as any).department || 'Engineering';

    if (canonicalId === '0' || canonicalId === 'EMP-0' || canonicalName.toLowerCase().includes('employee 0')) {
      return;
    }

    if (!employeeMap.has(canonicalId)) {
      employeeMap.set(canonicalId, {
        empId: canonicalId,
        name: canonicalName,
        dept: canonicalDept,
        events: [],
      });
    }
    const existing = employeeMap.get(canonicalId)!;
    existing.dept = canonicalDept;
    existing.events.push({
      ...evt,
      employeeId: canonicalId,
      employeeName: canonicalName,
    });
  });

  // Ensure all registered employees in cache are included in today's summaries
  const seenCanonicalIds = new Set<string>();
  employeeLookupCache.forEach((info) => {
    if (info.id && !seenCanonicalIds.has(info.id)) {
      seenCanonicalIds.add(info.id);
      if (!employeeMap.has(info.id)) {
        employeeMap.set(info.id, {
          empId: info.id,
          name: info.name,
          dept: info.dept,
          events: [],
        });
      }
    }
  });

  const summaries: AttendanceSummary[] = [];
  employeeMap.forEach((data, empId) => {
    summaries.push(calculateNetSummaryForEvents(empId, data.name, data.dept, data.events));
  });

  return summaries;
}

export function fetchAttendanceAlerts(): AttendanceAlert[] {
  return [...alertsStore];
}

export function fetchAttendanceCorrections(): AttendanceCorrection[] {
  return [...correctionsStore];
}

export async function submitAttendanceCorrection(payload: {
  employeeId: string;
  employeeName: string;
  department: string;
  requestType: any;
  requestedTime: string;
  reason: string;
}) {
  const newCorr: AttendanceCorrection = {
    id: generateUUID(),
    employeeId: payload.employeeId,
    employeeCode: payload.employeeId,
    employeeName: payload.employeeName,
    department: payload.department,
    sessionId: `sess-${payload.employeeId}`,
    requestType: payload.requestType,
    requestedTime: payload.requestedTime,
    reason: payload.reason,
    approvalStatus: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  correctionsStore = [newCorr, ...correctionsStore];

  try {
    await supabase.from('attendance_corrections').insert([
      {
        id: newCorr.id,
        employee_id: newCorr.employeeId,
        employee_name: newCorr.employeeName,
        department: newCorr.department,
        request_type: newCorr.requestType,
        requested_time: newCorr.requestedTime,
        reason: newCorr.reason,
        status: 'PENDING',
        created_at: newCorr.createdAt,
      },
    ]);

    await logAuditEntry(
      'SUBMIT_CORRECTION_REQUEST',
      payload.employeeId,
      `Submitted Attendance Correction Request [${payload.requestType}] Date/Time: ${payload.requestedTime}. Reason: ${payload.reason}`
    );
  } catch (err) {
    console.warn('submitAttendanceCorrection DB notice:', err);
  }

  notifySubscribers();
  return newCorr;
}

export async function updateCorrectionStatus(correctionId: string, status: 'APPROVED' | 'REJECTED') {
  const target = correctionsStore.find((c) => c.id === correctionId);
  if (target) {
    target.approvalStatus = status;

    try {
      await supabase.from('attendance_corrections').update({
        status: status,
        updated_at: new Date().toISOString(),
      }).eq('id', correctionId);

      await logAuditEntry(
        status === 'APPROVED' ? 'APPROVE_CORRECTION' : 'REJECT_CORRECTION',
        correctionId,
        `Admin ${status} Attendance Correction Request ID: ${correctionId}`
      );
    } catch (err) {
      console.warn('updateCorrectionStatus DB notice:', err);
    }

    notifySubscribers();
  }
}

// ─── STATE MACHINE ENGINE ────────────────────────────────────────────────────

// Maps an employee's last event to their current status
const EVENT_TO_STATUS: Record<AttendanceEventType, AttendanceStatus> = {
  CHECK_IN: 'PRESENT',
  BREAK_START: 'ON_BREAK',
  BREAK_END: 'PRESENT',
  LUNCH_START: 'ON_LUNCH',
  LUNCH_END: 'PRESENT',
  MEETING_OUT: 'IN_MEETING',
  MEETING_IN: 'PRESENT',
  FIELD_VISIT_START: 'ON_FIELD_VISIT',
  FIELD_VISIT_END: 'PRESENT',
  CHECK_OUT: 'PRESENT', // after checkout, handled as CHECKED_OUT below
};

/**
 * Returns the employee's current state based on today's events.
 * 'ABSENT' if no check-in, 'CHECKED_OUT' if last event is CHECK_OUT.
 */
export function getEmployeeCurrentState(employeeId: string): AttendanceStatus {
  const todayEvents = eventsStore
    .filter((e) => e.employeeId === employeeId && isEventToday(e.eventTime))
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

  if (todayEvents.length === 0) return 'ABSENT';

  const lastEvent = todayEvents[todayEvents.length - 1];
  if (lastEvent.eventType === 'CHECK_OUT') return 'CHECKED_OUT' as any;
  return EVENT_TO_STATUS[lastEvent.eventType] ?? 'PRESENT';
}

/** Returns whether the employee has checked out today */
export function hasCheckedOut(employeeId: string): boolean {
  const todayEvents = eventsStore
    .filter((e) => e.employeeId === employeeId && isEventToday(e.eventTime))
    .sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

  if (todayEvents.length === 0) return false;
  const lastEvent = todayEvents[todayEvents.length - 1];
  return lastEvent.eventType === 'CHECK_OUT';
}

/** Helper: checks if an ISO eventTime belongs to today in local timezone */
function isEventToday(eventTime: string): boolean {
  try {
    const d = new Date(eventTime);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

/** Returns whether the employee has checked in today */
export function hasCheckedIn(employeeId: string): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLocal = new Date().toLocaleDateString('en-CA');
  return eventsStore.some(
    (e) =>
      e.employeeId === employeeId &&
      e.eventType === 'CHECK_IN' &&
      (e.eventTime.startsWith(todayStr) || e.eventTime.startsWith(todayLocal) || isEventToday(e.eventTime))
  );
}

/**
 * Returns only the valid next actions for the employee's current state.
 */
export function getValidActionsForState(
  currentStatus: AttendanceStatus,
  checkedOut: boolean
): AttendanceEventType[] {
  if (checkedOut) return []; // Day is done
  switch (currentStatus) {
    case 'ABSENT':
      return ['CHECK_IN'];
    case 'PRESENT':
      return ['BREAK_START', 'LUNCH_START', 'MEETING_OUT', 'FIELD_VISIT_START', 'CHECK_OUT'];
    case 'ON_BREAK':
      return ['BREAK_END'];
    case 'ON_LUNCH':
      return ['LUNCH_END'];
    case 'IN_MEETING':
      return ['MEETING_IN'];
    case 'ON_FIELD_VISIT':
      return ['FIELD_VISIT_END'];
    default:
      return [];
  }
}

/**
 * Validates whether a requested event transition is legal.
 * Returns { allowed: true } or { allowed: false, reason: string, allowedActions: EventType[] }
 */
export function validateEventTransition(
  employeeId: string,
  requestedEvent: AttendanceEventType
): { allowed: boolean; reason?: string; allowedActions?: AttendanceEventType[] } {
  const checkedOut = hasCheckedOut(employeeId);
  const checkedIn = hasCheckedIn(employeeId);
  const currentStatus = getEmployeeCurrentState(employeeId);
  const validActions = getValidActionsForState(currentStatus, checkedOut);

  // Guard: CHECK_IN only if not already checked in
  if (requestedEvent === 'CHECK_IN' && checkedIn) {
    return {
      allowed: false,
      reason: 'Already checked in today. Cannot check in twice.',
      allowedActions: validActions,
    };
  }

  // Guard: Cannot act if checked out
  if (checkedOut && requestedEvent !== 'CHECK_IN') {
    return {
      allowed: false,
      reason: 'Your working session for today is complete. No further actions allowed.',
      allowedActions: [],
    };
  }

  // Guard: Cannot start break/lunch/meeting/field if not checked in
  if (!checkedIn && requestedEvent !== 'CHECK_IN') {
    return {
      allowed: false,
      reason: 'Please check in first before logging any activity.',
      allowedActions: ['CHECK_IN'],
    };
  }

  // Duplicate state guard
  if (requestedEvent === 'BREAK_START' && currentStatus === 'ON_BREAK') {
    return { allowed: false, reason: 'Already on tea break. End current break first.', allowedActions: validActions };
  }
  if (requestedEvent === 'LUNCH_START' && currentStatus === 'ON_LUNCH') {
    return { allowed: false, reason: 'Already on lunch break. End lunch first.', allowedActions: validActions };
  }
  if (requestedEvent === 'MEETING_OUT' && currentStatus === 'IN_MEETING') {
    return { allowed: false, reason: 'Already in a meeting. End current meeting first.', allowedActions: validActions };
  }

  // Check allowed list
  if (!validActions.includes(requestedEvent)) {
    return {
      allowed: false,
      reason: `Action "${requestedEvent}" is not allowed while status is "${currentStatus}". Finish current activity first.`,
      allowedActions: validActions,
    };
  }

  return { allowed: true };
}

/**
 * Employee self-service: trigger a validated attendance event.
 * This is the ONLY safe way for employees to log events — all validation runs here.
 */
export async function triggerEmployeeEvent(
  employeeId: string,
  employeeName: string,
  department: string,
  requestedEvent: AttendanceEventType,
  device: string = 'Employee Portal',
  method: string = 'Manual',
  notes?: string
): Promise<{
  success: boolean;
  event?: AttendanceEvent;
  currentState?: AttendanceStatus;
  allowedActions?: AttendanceEventType[];
  error?: string;
}> {
  // Ensure latest events from Supabase are synced into memory first
  await syncSupabaseEvents();

  // Validate the transition
  const validation = validateEventTransition(employeeId, requestedEvent);
  if (!validation.allowed) {
    return {
      success: false,
      error: validation.reason || 'Action not allowed.',
      allowedActions: validation.allowedActions || [],
      currentState: getEmployeeCurrentState(employeeId),
    };
  }

  // Log the validated event
  const result = await logAttendanceEvent({
    employeeId,
    employeeName,
    department,
    eventType: requestedEvent,
    device,
    method,
    notes: notes || `State transition: ${requestedEvent} via ${device}`,
  });

  const newState = getEmployeeCurrentState(employeeId);
  const checkedOut = hasCheckedOut(employeeId);
  const nextAllowed = getValidActionsForState(newState, checkedOut);

  return {
    success: true,
    event: result.event,
    currentState: newState,
    allowedActions: nextAllowed,
  };
}
