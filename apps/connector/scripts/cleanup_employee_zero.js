const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanEmployeeZero() {
  console.log('🧹 Purging Employee 0 & Invalid Dummy Records from Supabase...');

  // 1. Delete from attendance_records
  const { data: recs, error: e1 } = await supabase
    .from('attendance_records')
    .delete()
    .or('employee_id.eq.EMP-0,employee_id.eq.0,employee_name.eq.Employee 0,employee_name.ilike.%Employee 0%');
  console.log('1. attendance_records cleaned:', e1 ? e1.message : 'OK');

  // 2. Delete from attendance_sessions
  const { data: sess, error: e2 } = await supabase
    .from('attendance_sessions')
    .delete()
    .or('employee_id.eq.EMP-0,employee_id.eq.0,employee_name.eq.Employee 0,employee_name.ilike.%Employee 0%');
  console.log('2. attendance_sessions cleaned:', e2 ? e2.message : 'OK');

  // 3. Delete from attendance_events
  const { data: evts, error: e3 } = await supabase
    .from('attendance_events')
    .delete()
    .or('employee_id.eq.EMP-0,employee_id.eq.0,employee_name.eq.Employee 0,employee_name.ilike.%Employee 0%');
  console.log('3. attendance_events cleaned:', e3 ? e3.message : 'OK');

  // 4. Delete from employees table
  const { data: emps, error: e4 } = await supabase
    .from('employees')
    .delete()
    .or('employee_code.eq.EMP-0,employee_code.eq.0,device_user_id.eq.0,name.eq.Employee 0,name.ilike.%Employee 0%');
  console.log('4. employees cleaned:', e4 ? e4.message : 'OK');

  // 5. Delete from fingerprint_templates and employee_accounts
  await supabase.from('fingerprint_templates').delete().or('employee_code.eq.EMP-0,employee_code.eq.0');
  await supabase.from('employee_accounts').delete().or('employee_code.eq.EMP-0,employee_code.eq.0');

  console.log('✨ Cleanup Complete! All traces of Employee 0 removed.');
}

cleanEmployeeZero().catch(console.error);
