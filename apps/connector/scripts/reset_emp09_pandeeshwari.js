const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const TODAY_UTC_START = `${TODAY}T00:00:00+05:30`; // IST midnight = UTC-5:30

async function resetEMP09() {
  console.log(`\n🧹 Resetting EMP-09 (Pandeeshwari S) for today: ${TODAY}`);
  console.log('   The 07:28:58 am event was a ghost scan from before she was enrolled.\n');

  // 1. Show current state
  const { data: currentEvts } = await supabase
    .from('attendance_events')
    .select('id, event_type, event_time')
    .eq('employee_id', 'EMP-09')
    .order('event_time', { ascending: true });

  console.log('Current EMP-09 events in DB:');
  currentEvts?.forEach(e => {
    const ist = new Date(e.event_time).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    console.log(`  [${e.event_type}] ${e.event_time} → IST: ${ist}`);
  });

  // 2. Delete ALL EMP-09 attendance_events for today (incl. the ghost 07:28 AM)
  const { error: evtErr } = await supabase
    .from('attendance_events')
    .delete()
    .eq('employee_id', 'EMP-09')
    .gte('event_time', TODAY_UTC_START);
  console.log(`\n✅ Deleted today's EMP-09 attendance_events: ${evtErr ? '❌ ' + evtErr.message : 'OK'}`);

  // Also delete any with employee_name matching
  await supabase.from('attendance_events').delete()
    .ilike('employee_name', '%Pandeeshwari%')
    .gte('event_time', TODAY_UTC_START);

  // 3. Delete EMP-09 attendance_records (the one we manually created)
  const { error: recErr } = await supabase
    .from('attendance_records')
    .delete()
    .eq('employee_id', 'EMP-09');
  console.log(`✅ Deleted EMP-09 attendance_records: ${recErr ? '❌ ' + recErr.message : 'OK'}`);

  // 4. Delete EMP-09 session
  const { error: sessErr } = await supabase
    .from('attendance_sessions')
    .delete()
    .eq('employee_id', 'EMP-09');
  console.log(`✅ Deleted EMP-09 attendance_sessions: ${sessErr ? '❌ ' + sessErr.message : 'OK'}`);

  // 5. Verify cleanup
  const { data: remaining } = await supabase.from('attendance_events').select('*').eq('employee_id', 'EMP-09');
  console.log(`\n✅ Remaining EMP-09 events in DB: ${remaining?.length || 0}`);
  console.log('\n🎉 Done! Pandeeshwari S can now scan again and it will be treated as a fresh CHECK_IN.');
  console.log('   Ask her to place her finger on the device now.\n');
}

resetEMP09().catch(console.error);
