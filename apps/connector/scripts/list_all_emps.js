const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function listEmps() {
  const { data: emps } = await supabase.from('employees').select('*');
  console.log('Total employees:', emps?.length);
  emps?.forEach(e => console.log(` - ID: ${e.id} | Code: ${e.employee_code || e.employee_id || e.code} | Name: ${e.name || e.first_name} | Dept: ${e.department}`));
}

listEmps().catch(console.error);
