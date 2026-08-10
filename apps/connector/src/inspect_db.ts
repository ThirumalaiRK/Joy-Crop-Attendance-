import { supabase } from './supabase';

async function checkTables() {
  const [sessions, events, records] = await Promise.all([
    supabase.from('attendance_sessions').select('*').limit(5),
    supabase.from('attendance_events').select('*').limit(5),
    supabase.from('attendance_records').select('*').limit(5),
  ]);

  console.log('--- SESSIONS TABLE ---');
  console.dir(sessions, { depth: null });

  console.log('--- EVENTS TABLE ---');
  console.dir(events, { depth: null });

  console.log('--- RECORDS TABLE ---');
  console.dir(records, { depth: null });
}

checkTables();
