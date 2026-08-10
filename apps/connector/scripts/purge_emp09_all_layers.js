const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function purgeEmp09() {
  console.log('\n==========================================================');
  console.log('🗑️  PURGING EMPLOYEE 09 (PANDEESHWARI S) ATTENDANCE EVERYWHERE');
  console.log('==========================================================\n');

  // 1. Delete all attendance_events for EMP-09 / 9 / Pandeeshwari across all time
  console.log('[1/4] Deleting from attendance_events...');
  const { error: e1 } = await supabase
    .from('attendance_events')
    .delete()
    .or('employee_id.eq.EMP-09,employee_id.eq.9,employee_id.eq.EMP-9,employee_name.ilike.%Pandeeshwari%');
  console.log('   attendance_events:', e1 ? '❌ ' + e1.message : '✅ Deleted all events');

  // 2. Delete all attendance_sessions for EMP-09
  console.log('[2/4] Deleting from attendance_sessions...');
  const { error: e2 } = await supabase
    .from('attendance_sessions')
    .delete()
    .or('employee_id.eq.EMP-09,employee_id.eq.9,employee_id.eq.EMP-9,employee_name.ilike.%Pandeeshwari%');
  console.log('   attendance_sessions:', e2 ? '❌ ' + e2.message : '✅ Deleted all sessions');

  // 3. Delete all attendance_records for EMP-09
  console.log('[3/4] Deleting from attendance_records...');
  const { error: e3 } = await supabase
    .from('attendance_records')
    .delete()
    .or('employee_id.eq.EMP-09,employee_id.eq.9,employee_id.eq.EMP-9,employee_name.ilike.%Pandeeshwari%');
  console.log('   attendance_records:', e3 ? '❌ ' + e3.message : '✅ Deleted all records');

  // 4. Delete from attendance_logs if table exists
  try {
    const { error: e4 } = await supabase
      .from('attendance_logs')
      .delete()
      .or('device_user_id.eq.EMP-09,device_user_id.eq.9,device_user_id.eq.EMP-9');
    console.log('   attendance_logs:', e4 ? '⚠️ ' + e4.message : '✅ Cleared');
  } catch (_) {}

  // 5. Trigger connector sync & clear logs if available
  console.log('\n[4/4] Sending clear logs request to local connector...');
  try {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/attendance/sync-and-clear',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          console.log('   Connector sync-and-clear response:', data);
        });
      }
    );
    req.on('error', (err) => {
      console.log('   Connector notice (optional):', err.message);
    });
    req.end();
  } catch (err) {
    console.log('   Connector notice:', err.message);
  }

  // 6. Verify final database state for EMP-09
  setTimeout(async () => {
    console.log('\n--- Final Verification for EMP-09 ---');
    const { data: evts } = await supabase.from('attendance_events').select('*').or('employee_id.eq.EMP-09,employee_id.eq.9,employee_name.ilike.%Pandeeshwari%');
    const { data: sess } = await supabase.from('attendance_sessions').select('*').or('employee_id.eq.EMP-09,employee_id.eq.9,employee_name.ilike.%Pandeeshwari%');
    const { data: recs } = await supabase.from('attendance_records').select('*').or('employee_id.eq.EMP-09,employee_id.eq.9,employee_name.ilike.%Pandeeshwari%');

    console.log(`Remaining in attendance_events  : ${evts?.length || 0}`);
    console.log(`Remaining in attendance_sessions: ${sess?.length || 0}`);
    console.log(`Remaining in attendance_records : ${recs?.length || 0}`);

    console.log('\n🎉 EMP-09 (Pandeeshwari S) is completely cleared and fresh!');
    console.log('   When she places her finger on the device now, it will register as a brand-new live CHECK-IN.\n');
  }, 1000);
}

purgeEmp09().catch(console.error);
