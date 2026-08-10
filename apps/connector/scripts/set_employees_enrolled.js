const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function setEnrolled() {
  console.log('Updating employee enrollment status in Supabase...');

  // Set all registered employees who have biometric devices/punches as enrolled
  const { data, error } = await supabase
    .from('employees')
    .update({
      fingerprint_enrolled: true,
      is_enrolled: true,
      updated_at: new Date().toISOString(),
    })
    .in('employee_code', ['EMP-014', 'EMP-09', 'EMP-01', 'EMP-10', 'EMP-11'])
    .select();

  console.log('Update result:', error ? '❌ ' + error.message : '✅ Updated', data?.length, 'employees');

  const { data: final } = await supabase.from('employees').select('employee_code, name, fingerprint_enrolled, is_enrolled');
  console.table(final);
}

setEnrolled().catch(console.error);
