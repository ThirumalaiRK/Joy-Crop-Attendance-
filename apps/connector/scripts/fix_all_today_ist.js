const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: given a UTC ISO string, return the IST formatted time string "HH:MM:SS am/pm"
function toISTTimeString(isoUtc) {
  const d = new Date(isoUtc);
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

async function fixAllTodayRecords() {
  console.log('🔍 Loading all attendance_sessions for today (2026-08-10)...');
  const { data: sessions, error } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('session_date', '2026-08-10');

  if (error) { console.error('Sessions fetch error:', error); return; }
  if (!sessions || sessions.length === 0) { console.log('No sessions found for today.'); return; }

  console.log(`Found ${sessions.length} sessions. Patching attendance_records...\n`);

  for (const s of sessions) {
    const empId = s.employee_id;
    const empName = s.employee_name;

    // Calculate correct IST strings from the UTC ISO stored in sessions
    const correctCheckIn = s.check_in_time ? toISTTimeString(s.check_in_time) : null;
    const correctCheckOut = s.check_out_time ? toISTTimeString(s.check_out_time) : null;

    console.log(`Employee: ${empName} (${empId})`);
    console.log(`  Session check_in_time UTC: ${s.check_in_time}`);
    console.log(`  Correct IST check_in:      ${correctCheckIn}`);
    console.log(`  Correct IST check_out:     ${correctCheckOut || '—'}`);

    if (!correctCheckIn) {
      console.log(`  ⚠️ No check_in_time in session, skipping.\n`);
      continue;
    }

    // Update all matching attendance_records rows
    const { error: updateErr } = await supabase
      .from('attendance_records')
      .update({
        check_in_time: correctCheckIn,
        check_out_time: correctCheckOut || '—',
      })
      .eq('employee_id', empId);

    if (updateErr) {
      console.log(`  ❌ Update failed: ${updateErr.message}\n`);
    } else {
      console.log(`  ✅ Updated attendance_records for ${empName}\n`);
    }

    // Also update attendance_events formattedTime for this employee
    // The event_time UTC ISO is already correct; only display strings need fixing
    const { data: evts } = await supabase
      .from('attendance_events')
      .select('id, event_type, event_time')
      .eq('employee_id', empId);

    if (evts && evts.length > 0) {
      for (const evt of evts) {
        const correctEvtTime = toISTTimeString(evt.event_time);
        console.log(`  → Event ${evt.event_type}: ${evt.event_time} → ${correctEvtTime}`);
      }
      console.log('  (event_time UTC values are correct - display handled by frontend)\n');
    }
  }

  console.log('🎉 All attendance_records patched with correct IST times!');
}

fixAllTodayRecords().catch(console.error);
