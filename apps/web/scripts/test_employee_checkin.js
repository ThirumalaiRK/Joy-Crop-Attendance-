const { AttendanceProcessor } = require('../../connector/dist/sync/AttendanceProcessor.js');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('========================================================');
  console.log('  TESTING REAL-TIME EMPLOYEE CHECK-IN ENGINE & LOGS');
  console.log('========================================================\n');

  // Test employees to simulate real hardware check-ins for
  const testEmployees = [
    { code: 'EMP-114', id: '114', name: 'Marimuthu T' },
    { code: 'EMP-01', id: '1', name: 'Dharun B' },
    { code: 'EMP-10', id: '10', name: 'THIRUMALAI RK' },
    { code: 'EMP-14', id: '14', name: 'Muthukumar P' }
  ];

  for (const emp of testEmployees) {
    console.log(`📡 Simulating biometric check-in for ${emp.name} (${emp.code})...`);
    const result = await AttendanceProcessor.processPunch({
      device_ip: '192.168.1.56',
      device_user_id: emp.id,
      event_time: new Date(),
      verification_type: 'fingerprint',
      device_name: 'Identix K90 Pro Terminal (192.168.1.56)'
    });
    console.log(`   Result: Status=${result.status}, Event=${result.classified_event || result.reason}`);
  }

  console.log('\n--------------------------------------------------------');
  console.log('  FETCHING LATEST ATTENDANCE RECORDS FROM SUPABASE TABLE');
  console.log('--------------------------------------------------------\n');

  const { data: records, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching records:', error.message);
  } else {
    console.table(records.map(r => ({
      ID: r.employee_id,
      Name: r.employee_name,
      Department: r.department,
      'Check-In': r.check_in_time,
      'Check-Out': r.check_out_time || '—',
      Date: r.date,
      Status: r.status,
      Device: r.device_name
    })));
  }

  console.log('\n========================================================');
  console.log('  CHECK-IN ANALYSIS & VERIFICATION COMPLETE');
  console.log('========================================================');
}

main().catch(console.error);
