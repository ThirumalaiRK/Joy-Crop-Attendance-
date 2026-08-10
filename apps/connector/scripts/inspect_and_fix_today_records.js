const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTimezone() {
  const TODAY = '2026-08-10';
  console.log('🔍 Inspecting attendance_records for today:', TODAY);
  const { data: recs, error } = await supabase.from('attendance_records').select('*');
  if (recs) {
    for (const r of recs) {
      console.log(`Employee: ${r.employee_name} (${r.employee_id}) | CheckIn: ${r.check_in_time} | CheckOut: ${r.check_out_time} | CreatedAt: ${r.created_at}`);
    }
  }

  console.log('\n🔍 Inspecting attendance_sessions for today:', TODAY);
  const { data: sess } = await supabase.from('attendance_sessions').select('*').eq('session_date', TODAY);
  if (sess) {
    for (const s of sess) {
      console.log(`Session Employee: ${s.employee_name} (${s.employee_id}) | CheckIn: ${s.check_in_time} | Status: ${s.status}`);
      if (s.check_in_time) {
        const formattedCheckIn = new Date(s.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        console.log(`   -> IST Time for this checkIn: ${formattedCheckIn}`);
        // Update attendance_records check_in_time to IST
        await supabase
          .from('attendance_records')
          .update({ check_in_time: formattedCheckIn })
          .eq('employee_id', s.employee_id);
      }
    }
  }
}

fixTimezone().catch(console.error);
