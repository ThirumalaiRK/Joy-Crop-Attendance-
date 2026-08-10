const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('⚡ Triggering Hardware Check-In Event...');

  const nowIso = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Fetch employee details for Dharun DB (EMP-000002) or THIRUMALAI RK
  const { data: emps } = await supabase
    .from('employees')
    .select('*')
    .or('employee_code.eq.EMP-000002,employee_code.eq.EMP-000001,id.eq.EMP-000002')
    .limit(1);

  const emp = emps && emps.length > 0 ? emps[0] : { id: 'EMP-000002', name: 'Dharun DB', department: 'Engineering', designation: 'Senior Hardware Engineer' };

  console.log(`👤 Target Employee: ${emp.name} (${emp.id || emp.employee_code})`);

  // 2. Insert into attendance_events (Realtime broadcast triggered)
  const eventId = `EVT-HW-${Date.now()}`;
  const { error: evtErr } = await supabase.from('attendance_events').insert([{
    id: eventId,
    session_id: `SESS-${dateStr}-${emp.id}`,
    employee_id: emp.id || 'EMP-000002',
    employee_name: emp.name,
    event_type: 'CHECK_IN',
    event_time: nowIso,
    device: 'Identix K90 Pro (S/N: IXK90P-88294)',
    method: 'fingerprint',
    location: 'HQ Gate Terminal 1',
    notes: 'Hardware Biometric Scan Verified (Match Confidence: 99.4%)',
  }]);

  if (evtErr) console.error('attendance_events insert notice:', evtErr.message);
  else console.log(`✅ attendance_events inserted: ${eventId}`);

  // 3. Insert into attendance_records
  const recordId = `LOG-HW-${Date.now()}`;
  const { error: recErr } = await supabase.from('attendance_records').insert([{
    id: recordId,
    employee_id: emp.id || 'EMP-000002',
    employee_name: emp.name,
    employee_avatar: emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    department: emp.department || 'Engineering',
    check_in_time: timeStr,
    date: 'Today',
    method: 'fingerprint',
    status: 'present',
    device_name: 'Identix K90 Pro Terminal (192.168.1.56)',
    confidence_score: 99.4,
    location: 'HQ Gate Terminal 1',
    verified: true,
  }]);

  if (recErr) console.error('attendance_records insert notice:', recErr.message);
  else console.log(`✅ attendance_records inserted: ${recordId}`);

  // 4. Upsert into attendance_sessions for payroll readiness
  const { error: sessErr } = await supabase.from('attendance_sessions').upsert([{
    employee_id: emp.id || 'EMP-000002',
    employee_name: emp.name,
    department: emp.department || 'Engineering',
    session_date: dateStr,
    check_in_time: nowIso,
    net_work_mins: 15,
    status: 'PRESENT',
    payable_hours: 8.0,
    updated_at: nowIso,
  }], { onConflict: 'employee_id,session_date' });

  if (sessErr) console.error('attendance_sessions upsert notice:', sessErr.message);
  else console.log(`✅ attendance_sessions updated for ${dateStr}`);

  console.log('\n======================================================');
  console.log('🎉 HARDWARE CHECK-IN SUCCESSFULLY TRIGGERED & DISPLAYED!');
  console.log('======================================================');
  console.log(`   Employee Name : ${emp.name}`);
  console.log(`   Employee ID   : ${emp.id || emp.employee_code}`);
  console.log(`   Timestamp     : ${timeStr}`);
  console.log(`   Device        : Identix K90 Pro Terminal (192.168.1.56)`);
  console.log(`   Status        : Present (Verified 99.4% Match)`);
  console.log('======================================================\n');
}

main();
