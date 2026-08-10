const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('=== SUPABASE TERMINAL DATABASE INSPECTOR ===\n');

  // 1. Fetch Employees
  console.log('--- 1. EMPLOYEES ---');
  const { data: employees, error: empErr } = await supabase.from('employees').select('*');
  if (empErr) {
    console.error('Error fetching employees:', empErr.message);
  } else {
    console.log(`Found ${employees.length} employee records:`);
    employees.forEach((emp) => {
      console.log(` - [${emp.id || emp.employee_code}] ${emp.name} (${emp.designation || 'N/A'}, ${emp.department || 'N/A'})`);
      console.log(`   Fingerprint Enrolled: ${emp.fingerprint_enrolled}, UUID: ${emp.employee_uuid}`);
    });
  }

  // 2. Fetch Stored Fingerprint Templates
  console.log('\n--- 2. FINGERPRINT TEMPLATES ---');
  const { data: templates, error: tmplErr } = await supabase.from('fingerprint_templates').select('*');
  if (tmplErr) {
    console.error('Error fetching fingerprint_templates:', tmplErr.message);
  } else {
    console.log(`Found ${templates.length} stored fingerprint templates:`);
    templates.forEach((t, idx) => {
      console.log(` [${idx + 1}] Code: ${t.employee_code} | Position: ${t.finger_position || 'Default'} | Quality: ${t.quality_score}% | Created: ${t.created_at || 'N/A'}`);
      console.log(`     Template (Base64 length): ${t.finger_template ? t.finger_template.length : 0} chars`);
    });
  }

  // 3. Fetch __fingerprintsubjects
  console.log('\n--- 3. __FINGERPRINTSUBJECTS (MXFace SDK Table) ---');
  const { data: subjects, error: subjErr } = await supabase.from('__fingerprintsubjects').select('*');
  if (subjErr) {
    // Try PascalCase table name __FingerprintSubjects
    const { data: subjects2, error: subjErr2 } = await supabase.from('__FingerprintSubjects').select('*');
    if (subjErr2) {
      console.log('Notice fetching __fingerprintsubjects:', subjErr2.message);
    } else {
      console.log(`Found ${subjects2.length} subject entries:`);
      subjects2.forEach((s) => console.log(` - Subject ID: ${s.subjectid || s.subject_id} | Group: ${s.Group || s.group_name}`));
    }
  } else {
    console.log(`Found ${subjects.length} subject entries:`);
    subjects.forEach((s) => console.log(` - Subject ID: ${s.subjectid || s.subject_id} | Group: ${s.Group || s.group_name}`));
  }

  // 4. Fetch Attendance Records
  console.log('\n--- 4. ATTENDANCE RECORDS (Latest 5) ---');
  const { data: logs, error: logErr } = await supabase.from('attendance_records').select('*').order('created_at', { ascending: false }).limit(5);
  if (logErr) {
    console.error('Error fetching attendance_records:', logErr.message);
  } else {
    console.log(`Found ${logs.length} recent attendance logs:`);
    logs.forEach((l) => console.log(` - [${l.date || 'Today'}] ${l.employee_name} (${l.employee_id}) - ${l.method} check-in at ${l.check_in_time}`));
  }

  console.log('\n=== END OF SUPABASE INSPECTION ===');
}

main().catch(console.error);
