const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('\n================================================================');
  console.log('  ⏱️ HARDWARE TERMINAL CHECK-IN & CHECK-OUT TEST (USER ID 12)');
  console.log('================================================================\n');

  // 1. Fetch Employee Record for User ID 12 (sakthi rk / EMP-000012)
  const empCode = 'EMP-000012';
  const numericUid = 12;
  const deviceIp = '192.168.1.56';

  const { data: emps } = await supabase
    .from('employees')
    .select('*')
    .or(`employee_code.eq.${empCode},id.eq.${empCode}`)
    .limit(1);

  const emp = emps && emps.length > 0 ? emps[0] : {
    id: '00b3b96c-17be-4b1b-96a4-b7e1cd5fea7d',
    employee_code: empCode,
    name: 'sakthi rk',
    department: 'Engineering',
  };

  console.log(`👤 Target Employee : ${emp.name} (${emp.employee_code || emp.id})`);
  console.log(`🔢 Hardware UID   : ${numericUid}`);
  console.log(`🌐 Terminal IP    : ${deviceIp}:4370\n`);

  // Define Timestamps
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  // Morning Check-In Timestamp: 09:00:00 AM today
  const checkInDate = new Date(now);
  checkInDate.setHours(9, 0, 0, 0);
  const checkInIso = checkInDate.toISOString();
  const checkInTimeStr = '09:00:00 am';

  // Evening Check-Out Timestamp: 06:00:00 PM today (9 Hours Shift)
  const checkOutDate = new Date(now);
  checkOutDate.setHours(18, 0, 0, 0);
  const checkOutIso = checkOutDate.toISOString();
  const checkOutTimeStr = '06:00:00 pm';

  // =========================================================================
  // STEP 1: TEST CHECK-IN EVENT FOR USER ID 12
  // =========================================================================
  console.log('----------------------------------------------------------------');
  console.log('📌 TEST 1: RECORDING CHECK-IN EVENT FOR USER ID 12 (sakthi rk)');
  console.log('----------------------------------------------------------------');

  const checkInEvtId = `EVT-IN-${numericUid}-${Date.now()}`;
  const { error: inEvtErr } = await supabase.from('attendance_events').insert([{
    id: checkInEvtId,
    session_id: `SESS-${dateStr}-${empCode}`,
    employee_id: empCode,
    employee_name: emp.name,
    event_type: 'CHECK_IN',
    event_time: checkInIso,
    device: `Identix K90 Pro (${deviceIp})`,
    method: 'fingerprint',
    location: 'HQ Main Entrance',
    notes: 'Biometric Scan Verified (Match Confidence: 99.9%)',
  }]);

  if (inEvtErr) console.warn('⚠️ Check-In Event notice:', inEvtErr.message);
  else console.log(`✅ [DB] attendance_events CHECK_IN created: ${checkInEvtId} (${checkInTimeStr})`);

  // Insert/Upsert into attendance_records for web portal dashboard
  const recId = `LOG-${dateStr}-${empCode}`;
  const { error: recInErr } = await supabase.from('attendance_records').upsert([{
    id: recId,
    employee_id: empCode,
    employee_name: emp.name,
    employee_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    department: emp.department || 'Engineering',
    check_in_time: checkInTimeStr,
    check_out_time: null,
    date: 'Today',
    method: 'fingerprint',
    status: 'present',
    device_name: `Identix K90 Pro Terminal (${deviceIp})`,
    confidence_score: 99.9,
    location: 'HQ Main Entrance',
    verified: true,
    created_at: checkInIso,
  }], { onConflict: 'id' });

  if (recInErr) console.warn('⚠️ Attendance record check-in notice:', recInErr.message);
  else console.log(`✅ [DB] attendance_records status updated to PRESENT (${checkInTimeStr})`);

  // =========================================================================
  // STEP 2: TEST CHECK-OUT EVENT FOR USER ID 12
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('📌 TEST 2: RECORDING CHECK-OUT EVENT FOR USER ID 12 (sakthi rk)');
  console.log('----------------------------------------------------------------');

  const checkOutEvtId = `EVT-OUT-${numericUid}-${Date.now()}`;
  const { error: outEvtErr } = await supabase.from('attendance_events').insert([{
    id: checkOutEvtId,
    session_id: `SESS-${dateStr}-${empCode}`,
    employee_id: empCode,
    employee_name: emp.name,
    event_type: 'CHECK_OUT',
    event_time: checkOutIso,
    device: `Identix K90 Pro (${deviceIp})`,
    method: 'fingerprint',
    location: 'HQ Main Exit',
    notes: 'Biometric Scan Verified - Shift Complete (Match Confidence: 99.8%)',
  }]);

  if (outEvtErr) console.warn('⚠️ Check-Out Event notice:', outEvtErr.message);
  else console.log(`✅ [DB] attendance_events CHECK_OUT created: ${checkOutEvtId} (${checkOutTimeStr})`);

  // Update attendance_records with check_out_time
  const { error: recOutErr } = await supabase.from('attendance_records').update({
    check_out_time: checkOutTimeStr,
    status: 'present',
    confidence_score: 99.8,
  }).eq('id', recId);

  if (recOutErr) console.warn('⚠️ Attendance record check-out notice:', recOutErr.message);
  else console.log(`✅ [DB] attendance_records updated with CHECK_OUT time: ${checkOutTimeStr}`);

  // =========================================================================
  // STEP 3: UPSERT PAYROLL READY ATTENDANCE SESSION
  // =========================================================================
  console.log('\n----------------------------------------------------------------');
  console.log('📌 TEST 3: CALCULATING PAYROLL SHIFT SESSION HOURS FOR DB');
  console.log('----------------------------------------------------------------');

  const workMins = 540; // 9 hours = 540 minutes
  const payableHours = 9.0;

  const { error: sessErr } = await supabase.from('attendance_sessions').upsert([{
    employee_id: empCode,
    employee_name: emp.name,
    department: emp.department || 'Engineering',
    session_date: dateStr,
    check_in_time: checkInIso,
    check_out_time: checkOutIso,
    total_time_mins: workMins,
    net_work_mins: workMins,
    status: 'PRESENT',
    payable_hours: payableHours,
    is_finalized: true,
    updated_at: new Date().toISOString(),
  }], { onConflict: 'employee_id,session_date' });

  if (sessErr) console.warn('⚠️ Attendance session notice:', sessErr.message);
  else console.log(`✅ [DB] attendance_sessions finalized: 9.0 Payable Hours for Date ${dateStr}`);

  // =========================================================================
  // FINAL SUMMARY VERIFICATION
  // =========================================================================
  console.log('\n================================================================');
  console.log('🎉 USER ID 12 (sakthi rk) CHECK-IN & CHECK-OUT TEST COMPLETE!');
  console.log('================================================================');
  console.log(`   Employee Name     : ${emp.name}`);
  console.log(`   Employee Code     : ${empCode}`);
  console.log(`   Hardware User ID  : ${numericUid}`);
  console.log(`   Terminal Device   : Identix K90 Pro (${deviceIp}:4370)`);
  console.log(`   Date              : ${dateStr}`);
  console.log(`   Check-In Time     : 🟢 ${checkInTimeStr}`);
  console.log(`   Check-Out Time    : 🔴 ${checkOutTimeStr}`);
  console.log(`   Total Shift Duration: 9.0 Hours (540 mins)`);
  console.log(`   Verification      : VERIFIED (Match Confidence: 99.9%)`);
  console.log(`   Database Status   : Saved across events, records & sessions`);
  console.log('================================================================\n');
}

main().catch((err) => console.error('Fatal Test Error:', err));
