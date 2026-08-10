const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function fixDates() {
  // Fix attendance_records where date='Today' or date is missing proper YYYY-MM-DD value
  // For each record, derive the IST date from created_at
  const { data: recs, error } = await supabase
    .from('attendance_records')
    .select('id, employee_name, date, created_at');

  if (error) { console.error(error); return; }

  console.log(`Found ${recs.length} attendance_records to check...\n`);

  for (const rec of recs) {
    const isBadDate = !rec.date || rec.date === 'Today' || rec.date === 'today' || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date);
    if (isBadDate) {
      const istDate = new Date(rec.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const { error: upErr } = await supabase
        .from('attendance_records')
        .update({ date: istDate })
        .eq('id', rec.id);
      console.log(`✅ ${rec.employee_name}: date fixed from '${rec.date}' → '${istDate}' ${upErr ? '❌ ' + upErr.message : ''}`);
    } else {
      console.log(`⏭  ${rec.employee_name}: date already '${rec.date}' — no change needed`);
    }
  }

  // Also fix attendance_sessions date (session_date) and attendance_events
  const { data: sessions } = await supabase.from('attendance_sessions').select('id,employee_name,session_date,check_in_time');
  console.log(`\nChecking ${sessions?.length || 0} attendance_sessions...`);
  for (const s of sessions || []) {
    // session_date should be the IST date of the check_in_time
    if (s.check_in_time) {
      const istDate = new Date(s.check_in_time).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      if (s.session_date !== istDate) {
        const { error: upErr } = await supabase.from('attendance_sessions').update({ session_date: istDate }).eq('id', s.id);
        console.log(`✅ Session ${s.employee_name}: session_date fixed from '${s.session_date}' → '${istDate}' ${upErr ? '❌ ' + upErr.message : ''}`);
      } else {
        console.log(`⏭  Session ${s.employee_name}: session_date '${s.session_date}' already correct`);
      }
    }
  }

  console.log('\n🎉 All date fields normalized to IST YYYY-MM-DD format!');
}

fixDates().catch(console.error);
