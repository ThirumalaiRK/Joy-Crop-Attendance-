const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function checkDb() {
  const { data: ads, error: errAds } = await supabase.from('attendance_daily_summary').select('*').limit(1);
  console.log('attendance_daily_summary table:', errAds ? errAds.message : 'EXISTS', ads);

  const { data: tt, error: errTt } = await supabase.from('timetables').select('*');
  console.log('timetables table:', errTt ? errTt.message : 'EXISTS', tt);

  const { data: tb, error: errTb } = await supabase.from('timetable_breaks').select('*');
  console.log('timetable_breaks table:', errTb ? errTb.message : 'EXISTS', tb);
}

checkDb().catch(console.error);
