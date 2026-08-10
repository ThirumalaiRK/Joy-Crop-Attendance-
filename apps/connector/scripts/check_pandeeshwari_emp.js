const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function checkEmp() {
  const { data: emps } = await supabase.from('employees').select('*').or('employee_id.eq.EMP-09,employee_id.eq.9,employee_id.eq.EMP-9,name.ilike.%Pandeeshwari%');
  console.log('Employees found for Pandeeshwari S:', emps);
}

checkEmp().catch(console.error);
