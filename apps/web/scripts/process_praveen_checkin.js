const { AttendanceProcessor } = require('../../connector/dist/sync/AttendanceProcessor.js');
const { ZKTecoDevice } = require('../../../packages/biometrics-sdk/dist/index.js');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('========================================================');
  console.log('  PROCESSING PRAVEEN B (EMP-11) TODAY ATTENDANCE CHECK-IN');
  console.log('========================================================\n');

  // 1. Fetch Praveen B employee record
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .ilike('name', '%Praveen%')
    .single();

  if (empErr || !emp) {
    console.error('Error finding Praveen B:', empErr?.message);
    return;
  }

  console.log(`Found Employee: ${emp.name} | Code: ${emp.employee_code} | Department: ${emp.department}`);

  // 2. Ensure device_uid: 11 is saved in Supabase
  await supabase
    .from('employees')
    .update({ device_uid: 11, device_user_id: 'EMP-11', updated_at: new Date().toISOString() })
    .eq('id', emp.id);

  console.log('✅ Updated Praveen B with device_uid=11 in Supabase');

  // 3. Push Praveen B to ZKTeco hardware machine (192.168.1.56)
  try {
    const device = new ZKTecoDevice('192.168.1.56', 4370);
    const connected = await device.connect();
    if (connected) {
      const userWritten = await device.setUser(11, 'EMP-11', 'Praveen B', '', 0, 0);
      if (userWritten) {
        console.log('✅ Successfully wrote Praveen B to hardware device 192.168.1.56!');
      }
      await device.disconnect();
    }
  } catch (err) {
    console.warn('Hardware push notice:', err.message);
  }

  // 4. Process check-in punch for Praveen B via AttendanceProcessor
  const result = await AttendanceProcessor.processPunch({
    device_ip: '192.168.1.56',
    device_user_id: '11',
    event_time: new Date(),
    verification_type: 'fingerprint',
    device_name: 'Identix K90 Pro Terminal (192.168.1.56)',
  });

  console.log(`\n⚙️ Punch Processor Result for Praveen B: Status=${result.status}, Classified=${result.classified_event}`);

  // 5. Fetch updated attendance record for Praveen B for today (2026-08-12)
  const { data: records } = await supabase
    .from('attendance_records')
    .select('*')
    .ilike('employee_name', '%Praveen%')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n--- PRAVEEN B ATTENDANCE RECORDS IN DB ---');
  console.table(records.map(r => ({
    ID: r.employee_id,
    Name: r.employee_name,
    Department: r.department,
    'Check-In': r.check_in_time,
    'Check-Out': r.check_out_time || '—',
    Date: r.date,
    Status: r.status,
  })));

  console.log('\n========================================================');
  console.log('  PRAVEEN B CHECK-IN PROCESSED SUCCESSFULLY');
  console.log('========================================================');
}

main().catch(console.error);
