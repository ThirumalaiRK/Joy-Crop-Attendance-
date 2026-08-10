const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function testSeed() {
  const { data: existing } = await supabase.from('timetables').select('*').eq('name', 'Default');
  let timetableId;

  if (existing && existing.length > 0) {
    timetableId = existing[0].id;
    await supabase.from('timetables').update({
      mode: 'Regular',
      check_in_time: '09:00',
      check_out_time: '16:00',
      color: '#0066FF',
      active_additional_setting: true,
      check_in_start_at: '07:00',
      check_in_end_at: '11:00',
      check_out_start_at: '16:00',
      check_out_end_at: '18:00',
      calculate_as_mins: 420,
      late_in_mins: 5,
      early_out_mins: 5,
      use_first_checkin_last_checkout: true,
      updated_at: new Date().toISOString(),
    }).eq('id', timetableId);
    console.log('Updated existing Default Timetable:', timetableId);
  } else {
    const { data: created, error } = await supabase.from('timetables').insert([{
      name: 'Default',
      mode: 'Regular',
      check_in_time: '09:00',
      check_out_time: '16:00',
      color: '#0066FF',
      active_additional_setting: true,
      check_in_start_at: '07:00',
      check_in_end_at: '11:00',
      check_out_start_at: '16:00',
      check_out_end_at: '18:00',
      calculate_as_mins: 420,
      late_in_mins: 5,
      early_out_mins: 5,
      use_first_checkin_last_checkout: true,
    }]).select();

    if (error) {
      console.error('Error creating timetable:', error.message);
      return;
    }
    timetableId = created[0].id;
    console.log('Created Default Timetable:', timetableId);
  }

  // Clear existing breaks for this timetable to prevent stale 12:00-13:00 break
  await supabase.from('timetable_breaks').delete().eq('timetable_id', timetableId);

  // Insert 1:00 PM - 2:00 PM lunch break (13:00 - 14:00)
  const { data: tb, error: tbErr } = await supabase.from('timetable_breaks').insert([{
    timetable_id: timetableId,
    break_name: 'Lunch Break',
    start_time: '13:00',
    ahead_to: '13:30',
    end_time: '14:00',
    delay_to: '14:30',
    break_duration_mins: 60,
    deduct_type: 'auto_deduct',
  }]).select();

  console.log('Inserted Lunch Break (13:00 - 14:00, 60 mins):', tbErr ? tbErr.message : 'OK', tb);
}

testSeed().catch(console.error);
