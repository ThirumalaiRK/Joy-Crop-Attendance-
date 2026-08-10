const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function testServiceRoleUpsert() {
  console.log('Testing service role upsert on timetables table...');

  const { data: existing } = await supabase.from('timetables').select('*').limit(1);
  const targetId = existing?.[0]?.id || 'd4469044-1178-47f3-9192-288fc88aa4c4';

  const { data, error } = await supabase
    .from('timetables')
    .upsert([{
      id: targetId,
      name: 'Default',
      mode: 'Regular',
      check_in_time: '09:00',
      check_out_time: '18:00',
      color: '#0066FF',
      active_additional_setting: true,
      check_in_start_at: '07:00',
      check_in_end_at: '11:00',
      check_out_start_at: '16:00',
      check_out_end_at: '20:00',
      calculate_as_mins: 540,
      late_in_mins: 5,
      early_out_mins: 5,
      use_first_checkin_last_checkout: true,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'id' })
    .select();

  console.log('Service role upsert result:', error ? '❌ ' + error.message : '✅ SUCCESS');
  console.log('Saved timetable:', data?.[0]?.name, '(', data?.[0]?.id, ')');
}

testServiceRoleUpsert().catch(console.error);
