const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function main() {
  // Remove stale Aug-7 record for Praveen B that shows on today's dashboard
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .or('employee_id.eq.EMP-11,employee_name.ilike.%Praveen%');
  console.log('Deleted stale Praveen B record:', error || '✅ SUCCESS');

  // Also delete any stale sessions from old days
  const { error: sErr } = await supabase
    .from('attendance_sessions')
    .delete()
    .or('employee_id.eq.EMP-11,employee_name.ilike.%Praveen%');
  console.log('Deleted stale Praveen B sessions:', sErr || '✅ SUCCESS');

  // Verify remaining
  const { data } = await supabase.from('attendance_records').select('employee_name,check_in_time,created_at').order('created_at', { ascending: false });
  console.log('\nFinal attendance_records:');
  data?.forEach(r => console.log(` → ${r.employee_name}: ${r.check_in_time} (created: ${r.created_at})`));
}

main().catch(console.error);
