const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

const IST_TZ = 'Asia/Kolkata';

function getISTMinutes(d) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: IST_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(d));
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  return h * 60 + m;
}

function formatTimeIST(d) {
  if (!d) return null;
  return new Date(d).toLocaleTimeString('en-IN', {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(mins) {
  if (!mins || mins <= 0) return '0m';
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

const TODAY_STR = new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });

async function recalculateAll() {
  console.log(`\n======================================================`);
  console.log(`🚀 RECALCULATING ATTENDANCE ENGINE (1:00 PM – 2:00 PM LUNCH)`);
  console.log(`   Target Date: ${TODAY_STR} (IST)`);
  console.log(`======================================================\n`);

  // 1. Fetch all employees
  const { data: emps, error: empErr } = await supabase.from('employees').select('*');
  if (empErr) {
    console.error('Error fetching employees:', empErr.message);
    return;
  }
  console.log(`Found ${emps.length} registered employees.\n`);

  // 2. Fetch all raw events for today (IST day window)
  const startUTC = `${TODAY_STR}T00:00:00+05:30`;
  const endUTC = `${TODAY_STR}T23:59:59+05:30`;

  const { data: events, error: evErr } = await supabase
    .from('attendance_events')
    .select('*')
    .gte('event_time', startUTC)
    .lte('event_time', endUTC)
    .order('event_time', { ascending: true });

  if (evErr) {
    console.error('Error fetching attendance_events:', evErr.message);
    return;
  }
  console.log(`Found ${events?.length || 0} events for today across all employees.\n`);

  // Group events by employee
  const eventsByEmp = new Map();
  events?.forEach((e) => {
    const raw = (e.employee_id || e.employee_name || '').trim();
    const num = parseInt(raw.replace(/\D/g, ''), 10);
    const key = !isNaN(num) ? `EMP-${num}` : raw;

    if (!eventsByEmp.has(key)) eventsByEmp.set(key, []);
    eventsByEmp.get(key).push(e);
  });

  // Default shift rules: 09:00 - 16:00 (Grace 5m), Lunch 13:00 - 14:00 (60m auto deduct)
  const SHIFT_IN_MINS = 9 * 60; // 540
  const SHIFT_OUT_MINS = 16 * 60; // 960
  const LUNCH_START_MINS = 13 * 60; // 780 (1:00 PM)
  const LUNCH_END_MINS = 14 * 60; // 840 (2:00 PM)
  const MAX_LUNCH_MINS = 60;

  for (const emp of emps) {
    const empCode = emp.employee_code || emp.id;
    const num = parseInt(empCode.replace(/\D/g, ''), 10);
    const empKey = !isNaN(num) ? `EMP-${num}` : empCode;

    const empEvents = eventsByEmp.get(empKey) || eventsByEmp.get(emp.device_user_id) || [];
    if (empEvents.length === 0) {
      console.log(`⏭  ${emp.name} (${empCode}): No punch events today — marked ABSENT / Not checked in.`);
      continue;
    }

    // Sort events
    const sorted = [...empEvents].sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());

    // First check in
    const checkInEvt = sorted.find((e) => e.event_type === 'CHECK_IN') ||
      sorted.find((e) => e.event_type === 'RAW_PUNCH') ||
      sorted[0];

    const lastEvent = sorted[sorted.length - 1];
    const isCurrentlyCheckedOut = lastEvent.event_type === 'CHECK_OUT';
    const checkOutEvt = isCurrentlyCheckedOut ? lastEvent : null;

    const startMs = new Date(checkInEvt.event_time).getTime();
    const endMs = checkOutEvt ? new Date(checkOutEvt.event_time).getTime() : Date.now();
    const grossMinutes = Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));

    // Explicit Tea Breaks
    let breakMinutes = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].event_type === 'BREAK_START') {
        const endEvt = sorted.slice(i + 1).find((e) => e.event_type === 'BREAK_END');
        if (endEvt) {
          const diff = Math.round((new Date(endEvt.event_time).getTime() - new Date(sorted[i].event_time).getTime()) / (1000 * 60));
          breakMinutes += Math.max(0, diff);
        }
      }
    }

    // Explicit Lunch Breaks
    let explicitLunchMinutes = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].event_type === 'LUNCH_START') {
        const endEvt = sorted.slice(i + 1).find((e) => e.event_type === 'LUNCH_END');
        if (endEvt) {
          const diff = Math.round((new Date(endEvt.event_time).getTime() - new Date(sorted[i].event_time).getTime()) / (1000 * 60));
          explicitLunchMinutes += Math.max(0, diff);
        }
      }
    }

    let lunchDeductionMinutes = 0;
    let lunchMode = 'NONE';
    let lunchLabel = 'No lunch overlap (0m)';

    if (explicitLunchMinutes > 0) {
      // PRIORITY 2: Explicit Lunch Punches exist -> use actual duration
      lunchDeductionMinutes = explicitLunchMinutes;
      lunchMode = 'ACTUAL';
      lunchLabel = `Actual ${explicitLunchMinutes}m`;
    } else {
      // PRIORITY 3: Auto-Deduct Lunch Overlap (13:00 - 14:00)
      const startIST = getISTMinutes(new Date(startMs));
      const endIST = getISTMinutes(new Date(endMs));

      const overlapStart = Math.max(startIST, LUNCH_START_MINS);
      const overlapEnd = Math.min(endIST, LUNCH_END_MINS);
      const overlapMins = Math.max(0, overlapEnd - overlapStart);

      if (overlapMins > 0) {
        lunchDeductionMinutes = Math.min(overlapMins, MAX_LUNCH_MINS);
        lunchMode = 'AUTO';
        lunchLabel = `Auto 1:00 PM – 2:00 PM (${lunchDeductionMinutes}m deducted)`;
      }
    }

    // Net Working Minutes
    const netWorkingMinutes = Math.max(0, grossMinutes - breakMinutes - lunchDeductionMinutes);
    const payableHours = parseFloat((netWorkingMinutes / 60).toFixed(2));

    // Late Minutes (09:00 + 5m grace = 09:05)
    const checkInISTMins = getISTMinutes(new Date(checkInEvt.event_time));
    const lateMinutes = checkInISTMins > SHIFT_IN_MINS + 5 ? checkInISTMins - SHIFT_IN_MINS : 0;

    // Overtime (> 480 mins)
    const overtimeMinutes = Math.max(0, netWorkingMinutes - 480);

    const checkInFormatted = formatTimeIST(checkInEvt.event_time);
    const checkOutFormatted = checkOutEvt ? formatTimeIST(checkOutEvt.event_time) : null;
    const status = isCurrentlyCheckedOut ? 'present' : (lateMinutes > 0 ? 'late' : 'present');

    console.log(`👤 ${emp.name} (${empCode}):`);
    console.log(`   Check-In      : ${checkInFormatted}`);
    console.log(`   Check-Out     : ${checkOutFormatted || 'In Progress (Working Now)'}`);
    console.log(`   Gross Span    : ${formatDuration(grossMinutes)} (${grossMinutes} mins)`);
    console.log(`   Tea Breaks    : ${breakMinutes} mins`);
    console.log(`   Lunch Break   : ${lunchDeductionMinutes} mins [${lunchMode}: ${lunchLabel}]`);
    console.log(`   Net Working   : ${formatDuration(netWorkingMinutes)} (${netWorkingMinutes} mins)`);
    console.log(`   Late Arrival  : ${lateMinutes} mins`);
    console.log(`   Overtime      : ${overtimeMinutes} mins`);

    // 1. Update attendance_sessions (id is UUID)
    const { data: existingSess } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('employee_id', empCode)
      .eq('session_date', TODAY_STR)
      .limit(1);

    const sessionId = (existingSess && existingSess.length > 0) ? existingSess[0].id : require('crypto').randomUUID();

    const { error: sessErr } = await supabase.from('attendance_sessions').upsert([{
      id: sessionId,
      employee_id: empCode,
      employee_name: emp.name,
      department: emp.department || 'General',
      session_date: TODAY_STR,
      check_in_time: new Date(checkInEvt.event_time).toISOString(),
      check_out_time: checkOutEvt ? new Date(checkOutEvt.event_time).toISOString() : null,
      total_time_mins: grossMinutes,
      break_time_mins: breakMinutes,
      lunch_time_mins: lunchDeductionMinutes,
      net_work_mins: netWorkingMinutes,
      overtime_mins: overtimeMinutes,
      late_mins: lateMinutes,
      early_exit_mins: 0,
      status: lateMinutes > 0 ? 'LATE' : 'PRESENT',
      payable_hours: payableHours,
      is_finalized: !!checkOutEvt,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' });

    if (sessErr) console.warn('   ⚠️ Session upsert warning:', sessErr.message);

    // 2. Update attendance_records
    const recordId = `LOG-${TODAY_STR}-${empCode}`;
    const { error: recErr } = await supabase.from('attendance_records').upsert([{
      id: recordId,
      employee_id: empCode,
      employee_name: emp.name,
      employee_avatar: emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      department: emp.department || 'General',
      check_in_time: checkInFormatted,
      check_out_time: checkOutFormatted,
      date: TODAY_STR,
      method: checkInEvt.method || 'fingerprint',
      status: status,
      device_name: checkInEvt.device || 'Identix K90 Pro Terminal (192.168.1.56)',
      confidence_score: 99.8,
      location: 'HQ Main Terminal',
      verified: true,
    }], { onConflict: 'id' });

    if (recErr) console.warn('   ⚠️ Record upsert warning:', recErr.message);
    console.log(`   ✅ Synced to Supabase!\n`);
  }

  console.log(`🎉 All attendance records recalculated with 1:00 PM – 2:00 PM Lunch Break!`);
}

recalculateAll().catch(console.error);
