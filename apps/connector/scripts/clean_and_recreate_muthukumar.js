const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanAndRecreate() {
  const TODAY = '2026-08-10';
  console.log('🧹 Purging outdated/mismatched events for Muthukumar P (EMP-14 / EMP-014)...');

  // 1. Delete all legacy events for Muthukumar for today
  const { error: delEvtErr } = await supabase
    .from('attendance_events')
    .delete()
    .or('employee_id.eq.EMP-14,employee_id.eq.EMP-014,employee_name.ilike.%Muthukumar%');
  console.log('Deleted legacy attendance_events:', delEvtErr || 'SUCCESS');

  // 2. Delete legacy session for Muthukumar for today
  const { error: delSessErr } = await supabase
    .from('attendance_sessions')
    .delete()
    .eq('session_date', TODAY)
    .or('employee_id.eq.EMP-14,employee_id.eq.EMP-014,employee_name.ilike.%Muthukumar%');
  console.log('Deleted legacy attendance_sessions:', delSessErr || 'SUCCESS');

  // 3. Delete legacy attendance_records for Muthukumar
  const { error: delRecErr } = await supabase
    .from('attendance_records')
    .delete()
    .or('employee_id.eq.EMP-14,employee_id.eq.EMP-014,employee_name.ilike.%Muthukumar%');
  console.log('Deleted legacy attendance_records:', delRecErr || 'SUCCESS');

  // 4. Create proper IST Check-In timestamp: 12:18:54 PM IST on 2026-08-10 (2026-08-10T06:48:54.000Z / 2026-08-10T12:18:54+05:30)
  const istCheckInIso = '2026-08-10T06:48:54.000Z'; // In IST (+05:30), this is 12:18:54 PM

  console.log('\n✨ Creating clean Check-In event & session for Muthukumar P at 12:18:54 PM IST...');

  // 5. Insert clean Check-In event
  const { data: newEvt, error: insEvtErr } = await supabase.from('attendance_events').insert([{
    id: `EVT-CHECK_IN-EMP-14-${Date.now()}`,
    session_id: `SESS-${TODAY}-EMP-14`,
    employee_id: 'EMP-14',
    employee_name: 'Muthukumar P',
    event_type: 'CHECK_IN',
    event_time: istCheckInIso,
    device: 'ZK Device (192.168.1.56)',
    method: 'fingerprint',
    location: 'HQ Terminal',
    notes: 'Biometric Check-In (Hardware Verified)',
  }]).select().single();
  console.log('Created clean attendance_event:', insEvtErr || newEvt?.id);

  const crypto = require('crypto');
  const sessUuid = crypto.randomUUID();

  // 6. Insert clean attendance_session
  const { data: newSess, error: insSessErr } = await supabase.from('attendance_sessions').insert([{
    id: sessUuid,
    employee_id: 'EMP-14',
    employee_name: 'Muthukumar P',
    session_date: TODAY,
    status: 'PRESENT',
    check_in_time: istCheckInIso,
    check_out_time: null,
    total_time_mins: 0,
    net_work_mins: 0,
    payable_hours: 0,
    is_finalized: false,
    created_at: new Date().toISOString(),
  }]).select().single();
  console.log('Created clean attendance_session:', insSessErr || newSess?.id);

  // 7. Insert clean attendance_record for dashboard
  const { data: newRec, error: insRecErr } = await supabase.from('attendance_records').insert([{
    id: `LOG-${TODAY}-EMP-14`,
    employee_id: 'EMP-14',
    employee_name: 'Muthukumar P',
    employee_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    department: 'Software Development',
    check_in_time: '12:18:54 pm',
    check_out_time: '—',
    date: 'Today',
    method: 'fingerprint',
    status: 'present',
    device_name: 'ZK Device (192.168.1.56)',
    confidence_score: 99.8,
    location: 'HQ Main Terminal',
    verified: true,
  }]).select().single();
  console.log('Created clean attendance_record:', insRecErr || newRec?.id);

  console.log('\n🎉 Muthukumar P attendance successfully recreated with 12:18:54 PM IST!');
}

cleanAndRecreate().catch(console.error);
