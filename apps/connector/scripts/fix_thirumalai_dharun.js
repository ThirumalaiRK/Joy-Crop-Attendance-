const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTczMjMzNSwiZXhwIjoyMTAxMzA4MzM1fQ.gjNPMe4E8zuhnaJJrQPjteZLiVvrVNbp1t9299u9pZA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Hardware device timestamps for today's scans
const hwLogs = [
  { empId: 'EMP-10', empName: 'Thirumalai R K', dept: 'Software Development', recordTimeUtc: '2026-08-10T03:50:30.000Z' },
  { empId: 'EMP-01', empName: 'Dharun B',       dept: 'Marketing',            recordTimeUtc: '2026-08-10T04:19:52.000Z' },
];

function toISTString(isoUtc) {
  return new Date(isoUtc).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

async function cleanAndRecreate() {
  for (const log of hwLogs) {
    const istTime = toISTString(log.recordTimeUtc);
    console.log(`\n🧹 Cleaning ${log.empName} (${log.empId})...`);
    console.log(`  Hardware UTC: ${log.recordTimeUtc}`);
    console.log(`  Correct IST:  ${istTime}`);

    // 1. Delete old bad session (session_date = '2026-08-09' - wrong!)
    await supabase.from('attendance_sessions').delete()
      .or(`employee_id.eq.${log.empId},employee_name.ilike.%${log.empName.split(' ')[0]}%`);

    // 2. Delete old attendance_records
    await supabase.from('attendance_records').delete()
      .or(`employee_id.eq.${log.empId},employee_name.ilike.%${log.empName.split(' ')[0]}%`);

    // 3. Delete old attendance_events for this employee
    await supabase.from('attendance_events').delete()
      .or(`employee_id.eq.${log.empId},employee_name.ilike.%${log.empName.split(' ')[0]}%`);

    console.log(`  ✅ Purged old records`);

    // 4. Create clean session with correct date and UTC ISO
    const { randomUUID } = require('crypto');
    const sessId = randomUUID();
    const { error: sessErr } = await supabase.from('attendance_sessions').insert([{
      id: sessId,
      employee_id: log.empId,
      employee_name: log.empName,
      session_date: '2026-08-10', // IST date
      status: 'PRESENT',
      check_in_time: log.recordTimeUtc,  // correct UTC ISO
      check_out_time: null,
      total_time_mins: 0,
      net_work_mins: 0,
      payable_hours: 0,
      is_finalized: false,
      created_at: new Date().toISOString(),
    }]);
    console.log(`  Session insert: ${sessErr ? sessErr.message : '✅ OK (id: ' + sessId + ')'}`);

    // 5. Create clean attendance_event
    const evtId = `EVT-CHECK_IN-${log.empId}-${Date.now()}`;
    const { error: evtErr } = await supabase.from('attendance_events').insert([{
      id: evtId,
      session_id: sessId,
      employee_id: log.empId,
      employee_name: log.empName,
      event_type: 'CHECK_IN',
      event_time: log.recordTimeUtc, // UTC ISO
      device: 'ZK Device (192.168.1.56)',
      method: 'fingerprint',
      location: 'HQ Terminal',
      notes: 'Biometric Check-In (Hardware Verified)',
    }]);
    console.log(`  Event insert:   ${evtErr ? evtErr.message : '✅ OK (id: ' + evtId + ')'}`);

    // 6. Create clean attendance_record with IST display time
    const recId = `LOG-2026-08-10-${log.empId}`;
    const { error: recErr } = await supabase.from('attendance_records').insert([{
      id: recId,
      employee_id: log.empId,
      employee_name: log.empName,
      department: log.dept,
      check_in_time: istTime,   // "09:20:30 am" — IST formatted
      check_out_time: '—',
      date: 'Today',
      method: 'fingerprint',
      status: 'present',
      device_name: 'ZK Device (192.168.1.56)',
      confidence_score: 99.8,
      location: 'HQ Main Terminal',
      verified: true,
    }]);
    console.log(`  Record insert:  ${recErr ? recErr.message : '✅ OK (id: ' + recId + ')'}`);
  }
  console.log('\n🎉 Done! Thirumalai R K and Dharun B now have correct IST check-in times.');
}

cleanAndRecreate().catch(console.error);
