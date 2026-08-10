const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectEvents() {
  const { data: events, error } = await supabase
    .from('attendance_events')
    .select('*')
    .order('event_time', { ascending: false })
    .limit(20);

  console.log('--- LATEST 20 ATTENDANCE_EVENTS ---');
  if (events) {
    events.forEach(e => {
      console.log(`ID: ${e.id} | Emp: ${e.employee_name} (${e.employee_id}) | Type: ${e.event_type} | event_time: ${e.event_time}`);
    });
  }
}

inspectEvents().catch(console.error);
