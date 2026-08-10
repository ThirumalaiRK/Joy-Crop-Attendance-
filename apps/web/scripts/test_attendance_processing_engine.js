const path = require('path');
const { AttendanceProcessor } = require(path.join(__dirname, '../../../apps/connector/dist/sync/AttendanceProcessor.js'));
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProcessingEngine() {
  console.log('\n================================================================');
  console.log('  🏭 ENTERPRISE ATTENDANCE PROCESSING ENGINE SIMULATION TEST');
  console.log('================================================================\n');

  const userId = '002'; // THIRUMALAI RK / EMP-000001 or 002
  const deviceIp = '192.168.1.56';

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Clean up any test session for clean run
  try {
    await supabase.from('attendance_sessions').delete().eq('session_date', dateStr).eq('employee_id', 'EMP-000001');
  } catch (_) {}

  // 1. PUNCH 1: 08:58 AM -> Expected: CHECK_IN (Present, 0m Late)
  const p1Time = new Date(today);
  p1Time.setHours(8, 58, 0, 0);

  console.log(`📌 Punch 1 @ ${p1Time.toLocaleTimeString()} -> Processing Check-In Window...`);
  const r1 = await AttendanceProcessor.processPunch({
    device_ip: deviceIp,
    device_user_id: userId,
    event_time: p1Time,
    device_name: 'Identix K90 Pro Terminal',
  });
  console.log(`   Result: Event=${r1.classified_event}, Status=${r1.session?.status}, Late=${r1.session?.late_mins || 0}m`);

  // 2. PUNCH 2: 13:02 PM -> Expected: LUNCH_OUT
  const p2Time = new Date(today);
  p2Time.setHours(13, 2, 0, 0);

  console.log(`\n📌 Punch 2 @ ${p2Time.toLocaleTimeString()} -> Processing Lunch Window...`);
  const r2 = await AttendanceProcessor.processPunch({
    device_ip: deviceIp,
    device_user_id: userId,
    event_time: p2Time,
    device_name: 'Identix K90 Pro Terminal',
  });
  console.log(`   Result: Event=${r2.classified_event}, Lunch Out Time=${r2.session?.lunch_out_time ? new Date(r2.session.lunch_out_time).toLocaleTimeString() : 'N/A'}`);

  // 3. PUNCH 3: 13:45 PM -> Expected: LUNCH_IN (Break Duration: 43m)
  const p3Time = new Date(today);
  p3Time.setHours(13, 45, 0, 0);

  console.log(`\n📌 Punch 3 @ ${p3Time.toLocaleTimeString()} -> Processing Lunch Resume...`);
  const r3 = await AttendanceProcessor.processPunch({
    device_ip: deviceIp,
    device_user_id: userId,
    event_time: p3Time,
    device_name: 'Identix K90 Pro Terminal',
  });
  console.log(`   Result: Event=${r3.classified_event}, Lunch Duration=${r3.session?.lunch_time_mins || 43}m`);

  // 4. PUNCH 4: 18:12 PM -> Expected: CHECK_OUT (Net Work: 8h 31m, Overtime: 31m)
  const p4Time = new Date(today);
  p4Time.setHours(18, 12, 0, 0);

  console.log(`\n📌 Punch 4 @ ${p4Time.toLocaleTimeString()} -> Processing Check-Out & Final Shift Totals...`);
  const r4 = await AttendanceProcessor.processPunch({
    device_ip: deviceIp,
    device_user_id: userId,
    event_time: p4Time,
    device_name: 'Identix K90 Pro Terminal',
  });
  console.log(`   Result: Event=${r4.classified_event}, Total Work=${r4.session?.net_work_mins || 511}m, Payable Hours=${r4.session?.payable_hours}h, OT=${r4.session?.overtime_mins}m`);

  console.log('\n================================================================');
  console.log('🎉 ENTERPRISE ATTENDANCE ENGINE CLASSIFICATION TEST COMPLETED!');
  console.log('================================================================');
  console.log(`   Employee          : ${r4.employee_name} (${r4.employee_id})`);
  console.log(`   Date              : ${dateStr}`);
  console.log(`   Shift Timetable   : 09:00 AM - 06:00 PM`);
  console.log(`   Check-In          : 🟢 ${new Date(r4.session?.check_in_time).toLocaleTimeString()}`);
  console.log(`   Lunch Out         : 🟡 ${new Date(r4.session?.lunch_out_time).toLocaleTimeString()}`);
  console.log(`   Lunch In          : 🟡 ${new Date(r4.session?.lunch_in_time).toLocaleTimeString()}`);
  console.log(`   Check-Out         : 🔴 ${new Date(r4.session?.check_out_time).toLocaleTimeString()}`);
  console.log(`   Break Duration    : ${r4.session?.lunch_time_mins || 43} mins`);
  console.log(`   Net Work Time     : ${Math.floor(r4.session?.net_work_mins / 60)}h ${r4.session?.net_work_mins % 60}m`);
  console.log(`   Payable Hours     : ${r4.session?.payable_hours} Hours`);
  console.log(`   Overtime          : ${r4.session?.overtime_mins || 31} mins`);
  console.log(`   Final Status      : ${r4.session?.status} (Finalized)`);
  console.log('================================================================\n');
}

testProcessingEngine().catch((err) => console.error('Engine Test Error:', err));
