const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function inspectEmployees() {
  const { data: emps } = await supabase.from('employees').select('id, employee_code, name, fingerprint_enrolled, face_enrolled, card_enrolled, is_enrolled');
  console.log('Employees table:');
  console.table(emps);

  const { data: devUsers } = await supabase.from('device_users').select('*');
  console.log('\ndevice_users table:');
  console.table(devUsers);

  const { data: tmpls } = await supabase.from('fingerprint_templates').select('*');
  console.log('\nfingerprint_templates table:');
  console.table(tmpls);
}

inspectEmployees().catch(console.error);
