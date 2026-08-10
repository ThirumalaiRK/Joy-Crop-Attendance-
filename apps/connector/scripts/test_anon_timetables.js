const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonUpsert() {
  console.log('Testing anon key upsert on timetables table...');

  const payload = {
    name: 'Default Test',
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
  };

  const { data, error } = await supabase
    .from('timetables')
    .upsert([payload])
    .select();

  console.log('Result error:', error ? `❌ Code ${error.code}: ${error.message} (${error.details})` : '✅ Success');
  console.log('Data:', data);
}

testAnonUpsert().catch(console.error);
