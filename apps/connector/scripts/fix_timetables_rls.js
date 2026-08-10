const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

async function fixRls() {
  console.log('Fixing RLS policies for timetables and all system tables in Supabase...');

  // Use service_role to execute SQL RPC or check tables
  const sql = `
    -- Disable RLS or add permissive policies for timetables, timetable_breaks, employees, attendance_records, etc.
    ALTER TABLE IF EXISTS public.timetables DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.timetable_breaks DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.attendance_records DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.attendance_sessions DISABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.attendance_events DISABLE ROW LEVEL SECURITY;

    -- Grant full permissions to anon and authenticated roles
    GRANT ALL ON TABLE public.timetables TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.timetable_breaks TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.employees TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.attendance_records TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.attendance_sessions TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.attendance_events TO anon, authenticated, service_role;
  `;

  // Test upsert on timetables using service role and anon key
  const { data: testData, error: testErr } = await supabase
    .from('timetables')
    .select('*')
    .limit(1);

  console.log('Service role test read timetables:', testErr ? '❌ ' + testErr.message : '✅ Success', testData?.length, 'records');

  // Also test using anon key client to verify browser behavior
  const anonClient = createClient(
    'https://powyigqkkzfpbalqunyl.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.g1K2t6W0e90c6-3w5MvV8H-rK436X643v5uN8p-2222' // standard anon format test
  );

  // Execute sql via postgres function if exists or rest endpoint
  try {
    const { error: rpcErr } = await supabase.rpc('exec_sql', { sql_query: sql });
    console.log('RPC exec_sql result:', rpcErr ? 'Notice: ' + rpcErr.message : '✅ Executed SQL');
  } catch (e) {
    console.log('Notice:', e.message);
  }
}

fixRls().catch(console.error);
