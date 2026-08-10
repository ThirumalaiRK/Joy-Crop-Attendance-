const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function main() {
  // Fix check_out_time: '—' → null  so it no longer reads as truthy
  const { error, data } = await supabase
    .from('attendance_records')
    .update({ check_out_time: null })
    .or("check_out_time.eq.—,check_out_time.eq.-");
  
  console.log('Cleared em-dash check_out_time:', error ? error.message : '✅ SUCCESS');

  // Verify final state
  const { data: recs } = await supabase
    .from('attendance_records')
    .select('employee_name, check_in_time, check_out_time, status')
    .order('created_at', { ascending: false });

  console.log('\nFinal attendance_records:');
  recs?.forEach(r => {
    console.log(` → ${r.employee_name}: IN=${r.check_in_time} | OUT=${r.check_out_time} | STATUS=${r.status}`);
  });
}

main().catch(console.error);
