const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function removeDuplicates() {
  // Remove old records that have null check_in_time - keep the ones with proper data
  const { error } = await supabase.from('attendance_records').delete()
    .is('check_in_time', null);
  console.log('Removed null check_in_time records:', error ? '❌ ' + error.message : '✅');

  // Final state
  const { data } = await supabase.from('attendance_records').select('*').order('employee_name');
  console.log('\nFinal clean records:');
  data?.forEach(r => {
    console.log(`  ✅ ${r.employee_name} (${r.employee_id}): date=${r.date}, in=${r.check_in_time}, status=${r.status}`);
  });
}

removeDuplicates().catch(console.error);
