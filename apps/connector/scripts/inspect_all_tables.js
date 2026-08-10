const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function inspectAll() {
  const tables = [
    'attendance_events',
    'attendance_sessions',
    'attendance_records',
    'timetables',
    'timetable_breaks',
    'employees',
    'companies',
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(2);
    console.log(`\n=== Table: ${t} ===`);
    if (error) {
      console.log('Error:', error.message);
    } else {
      console.log(`Count rows returned: ${data?.length}`);
      if (data && data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample:', data[0]);
      }
    }
  }
}

inspectAll().catch(console.error);
