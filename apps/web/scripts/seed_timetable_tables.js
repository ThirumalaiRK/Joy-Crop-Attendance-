const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('⏳ Seeding ZKTime.Net default timetable rules in Supabase...');

  // Ensure default timetable row exists
  const { data: existing } = await supabase.from('timetables').select('*').eq('name', 'Default').limit(1);

  let timetableId;

  if (!existing || existing.length === 0) {
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
      console.error('❌ Insert error:', error.message);
      return;
    }
    timetableId = created[0].id;
    console.log('✅ Created Default Timetable:', timetableId);
  } else {
    timetableId = existing[0].id;
    console.log('✅ Default Timetable exists:', timetableId);
  }

  // Ensure default break exists
  const { data: existingBreaks } = await supabase.from('timetable_breaks').select('*').eq('timetable_id', timetableId);
  if (!existingBreaks || existingBreaks.length === 0) {
    await supabase.from('timetable_breaks').insert([{
      timetable_id: timetableId,
      break_name: 'Lunch Break',
      start_time: '12:00',
      ahead_to: '12:30',
      end_time: '13:00',
      delay_to: '13:30',
      break_duration_mins: 60,
      deduct_type: 'auto_deduct',
    }]);
    console.log('✅ Created Default Lunch Break');
  } else {
    console.log('✅ Timetable breaks exist:', existingBreaks.length);
  }
}

main().catch(console.error);
