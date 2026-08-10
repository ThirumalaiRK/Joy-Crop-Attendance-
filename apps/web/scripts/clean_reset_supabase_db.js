const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanResetDatabase() {
  console.log('\n================================================================');
  console.log('  🧹 SUPABASE DATABASE PURGE & ENTERPRISE RE-SEED');
  console.log('================================================================\n');

  // 1. Delete all attendance events, sessions, records, logs, unknown events
  console.log('🗑️  1. Purging legacy attendance records and event streams...');

  try {
    await supabase.from('attendance_events').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared attendance_events');
  } catch (e) { console.error('   ❌ Failed to clear attendance_events:', e.message); }

  try {
    await supabase.from('attendance_sessions').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared attendance_sessions');
  } catch (e) { console.error('   ❌ Failed to clear attendance_sessions:', e.message); }

  try {
    await supabase.from('attendance_records').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared attendance_records');
  } catch (e) { console.error('   ❌ Failed to clear attendance_records:', e.message); }

  try {
    await supabase.from('attendance_logs').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared attendance_logs');
  } catch (e) { console.error('   ❌ Failed to clear attendance_logs:', e.message); }

  try {
    await supabase.from('unknown_fingerprint_logs').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared unknown_fingerprint_logs');
  } catch (e) { console.error('   ❌ Failed to clear unknown_fingerprint_logs:', e.message); }

  try {
    await supabase.from('device_users').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared device_users');
  } catch (e) { console.error('   ❌ Failed to clear device_users:', e.message); }

  try {
    await supabase.from('employees').delete().neq('id', 'KEEP_NONE');
    console.log('   ✓ Cleared employees');
  } catch (e) { console.error('   ❌ Failed to clear employees:', e.message); }

  // 2. Re-seed Clean Enterprise Employees matching hardware terminals
  console.log('\n🌱 2. Seeding clean Enterprise Employees matching hardware enrolled terminals...');

  const crypto = require('crypto');
  const cleanEmployees = [
    {
      id: crypto.randomUUID(),
      employee_code: 'EMP-000001',
      name: 'THIRUMALAI RK',
      department: 'Executive Management',
      status: 'Active',
      device_user_id: '002',
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      employee_code: 'EMP-000005',
      name: 'Ramesh Kumar',
      department: 'Engineering',
      status: 'Active',
      device_user_id: '5',
      updated_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      employee_code: 'EMP-000012',
      name: 'sakthi rk',
      department: 'Engineering',
      status: 'Active',
      device_user_id: '12',
      updated_at: new Date().toISOString(),
    },
  ];

  const { data: insertedEmps, error: empErr } = await supabase.from('employees').insert(cleanEmployees).select();
  if (empErr) {
    console.error('❌ Employee Seed Error:', empErr.message);
  } else {
    console.log(`   ✅ Successfully provisioned ${insertedEmps.length} clean employee records:`);
    insertedEmps.forEach((e) => {
      console.log(`      • ${e.name} (${e.employee_code}) - Hardware User ID: "${e.device_user_id || 'N/A'}" - Dept: ${e.department}`);
    });
  }

  // 3. Seed device_users mapping
  console.log('\n📲 3. Mapping hardware User IDs in device_users table...');
  const cleanDeviceUsers = [
    { device_user_id: '002', name: 'THIRUMALAI RK', role: 'Admin', uid: 2 },
    { device_user_id: '5', name: 'Ramesh Kumar', role: 'User', uid: 5 },
    { device_user_id: '12', name: 'sakthi rk', role: 'User', uid: 12 },
  ];

  try {
    await supabase.from('device_users').insert(cleanDeviceUsers);
    console.log('   ✅ Hardware device_users mappings seeded successfully.');
  } catch (e) {
    console.warn('   Notice on device_users insert:', e.message);
  }

  console.log('\n================================================================');
  console.log('  🎉 DATABASE RESET COMPLETE — READY FOR LIVE HARDWARE PUNCHES');
  console.log('================================================================\n');
}

cleanResetDatabase().catch((err) => console.error('Reset Error:', err));
