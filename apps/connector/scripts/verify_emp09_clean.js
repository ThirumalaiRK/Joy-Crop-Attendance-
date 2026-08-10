const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function checkAll() {
  console.log('Checking all tables for EMP-09 / Pandeeshwari / 9...');
  
  const tables = ['attendance_events', 'attendance_records', 'attendance_sessions'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*')
      .or('employee_id.eq.EMP-09,employee_id.eq.9,employee_id.eq.EMP-9,employee_name.ilike.%Pandeeshwari%');
    console.log(`Table ${t}: count = ${data ? data.length : 0}`);
    if (data && data.length > 0) {
      console.log(data);
    }
  }

  // Also check timetables
  const { data: tt } = await supabase.from('timetables').select('*');
  console.log('\nTimetables in DB:', tt);
}

checkAll().catch(console.error);
