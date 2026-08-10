const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function testFetch() {
  const { data } = await supabase.from('employees').select('*');
  console.log('Employees from Supabase:');
  data.forEach(e => {
    console.log(` - ${e.name} (${e.employee_code}): fingerprint_enrolled=${e.fingerprint_enrolled}, is_enrolled=${e.is_enrolled}`);
  });
}

testFetch().catch(console.error);
