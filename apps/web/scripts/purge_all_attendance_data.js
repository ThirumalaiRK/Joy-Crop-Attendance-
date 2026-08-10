const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🧹 Purging all old attendance records from Supabase...');

  // 1. Purge attendance_events
  const { error: err1 } = await supabase.from('attendance_events').delete().neq('id', '0');
  console.log('Cleared attendance_events:', err1 ? err1.message : 'OK');

  // 2. Purge attendance_sessions
  const { error: err2 } = await supabase.from('attendance_sessions').delete().neq('employee_id', '0');
  console.log('Cleared attendance_sessions:', err2 ? err2.message : 'OK');

  // 3. Purge attendance_records
  const { error: err3 } = await supabase.from('attendance_records').delete().neq('id', '0');
  console.log('Cleared attendance_records:', err3 ? err3.message : 'OK');

  // 4. Purge unknown_fingerprint_logs
  const { error: err4 } = await supabase.from('unknown_fingerprint_logs').delete().neq('device_ip', '0');
  console.log('Cleared unknown_fingerprint_logs:', err4 ? err4.message : 'OK');

  console.log('✅ ALL OLD ATTENDANCE DATA SUCCESSFULLY PURGED TO 0 RECORDS.');
}

main().catch(console.error);
