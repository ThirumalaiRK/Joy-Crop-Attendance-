const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://powyigqkkzfpbalqunyl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA'
);

const IST_TZ = 'Asia/Kolkata';

function toIST(isoUtc) {
  if (!isoUtc) return null;
  return new Date(isoUtc).toLocaleTimeString('en-IN', {
    timeZone: IST_TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

function toISTDate(isoUtc) {
  if (!isoUtc) return null;
  return new Date(isoUtc).toLocaleDateString('en-CA', { timeZone: IST_TZ });
}

async function diagnoseAndFix() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ });
  console.log('=== DIAGNOSIS REPORT ===');
  console.log(`IST Today: ${today}\n`);

  // 1. Check attendance_events — the source of truth for time-engine
  const { data: evts } = await supabase
    .from('attendance_events')
    .select('*')
    .order('event_time', { ascending: false })
    .limit(50);

  console.log('--- attendance_events (latest 50) ---');
  const evtsByEmp = {};
  evts?.forEach(e => {
    const istDate = toISTDate(e.event_time);
    const istTime = toIST(e.event_time);
    const empKey = e.employee_id || e.employee_name;
    if (!evtsByEmp[empKey]) evtsByEmp[empKey] = [];
    evtsByEmp[empKey].push({ type: e.event_type, utc: e.event_time, istDate, istTime });
  });

  Object.entries(evtsByEmp).forEach(([emp, events]) => {
    console.log(`\n  Employee: ${emp}`);
    events.forEach(e => {
      const flag = e.istDate !== today ? '⚠️ WRONG DATE' : '✅';
      console.log(`    ${flag} [${e.type}] UTC=${e.utc} → IST Date: ${e.istDate} Time: ${e.istTime}`);
    });
  });

  // 2. Check attendance_records
  const { data: recs } = await supabase
    .from('attendance_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n--- attendance_records ---');
  recs?.forEach(r => {
    const flag = !r.date || r.date === 'Today' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ? '⚠️ BAD DATE' : '✅';
    console.log(`  ${flag} ${r.employee_name}: date=${r.date}, checkIn=${r.check_in_time}, checkOut=${r.check_out_time}, status=${r.status}`);
  });

  // 3. Auto-fix: update any attendance_events that are stored as attendance_records
  //    where check_in_time is a UTC-formatted AM/PM string (e.g. "07:28:58 am" for a 1:00 PM IST check-in)
  console.log('\n--- Auto-fixing attendance_records with UTC-formatted check_in_time ---');
  for (const r of recs || []) {
    if (!r.check_in_time) continue;
    // Find the matching event by employee_id to get the real UTC ISO timestamp
    const matchEvt = evts?.find(e =>
      (e.employee_id === r.employee_id || (r.employee_name && e.employee_name?.toLowerCase().includes(r.employee_name.split(' ')[0].toLowerCase()))) &&
      ['CHECK_IN', 'RAW_PUNCH'].includes(e.event_type) &&
      toISTDate(e.event_time) === (r.date || today)
    );

    if (matchEvt) {
      const correctISTTime = toIST(matchEvt.event_time);
      const correctDate = toISTDate(matchEvt.event_time);
      if (r.check_in_time !== correctISTTime || !r.date || r.date === 'Today') {
        const { error } = await supabase.from('attendance_records')
          .update({ check_in_time: correctISTTime, date: correctDate })
          .eq('id', r.id);
        console.log(`  ✅ Fixed ${r.employee_name}: "${r.check_in_time}" → "${correctISTTime}" (date: ${r.date} → ${correctDate}) ${error ? '❌ ' + error.message : ''}`);
      } else {
        console.log(`  ⏭  ${r.employee_name}: already correct (${r.check_in_time})`);
      }
    } else {
      console.log(`  ⚠️  ${r.employee_name}: no matching event found for date=${r.date || today}`);
    }
  }

  console.log('\n=== DONE ===');
}

diagnoseAndFix().catch(console.error);
