const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseKey);

const CANONICAL_EMPLOYEES = [
  {
    employee_code: 'EMP-000001',
    name: 'THIRUMALAI RK',
    department: 'Executive Management',
    branch: 'HQ Main Office',
    device_user_id: '002',
    device_uid: 2,
    status: 'Active',
  },
  {
    employee_code: 'EMP-000002',
    name: 'THIRUMALAI .R K',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '2',
    device_uid: 2,
    status: 'Active',
  },
  {
    employee_code: 'EMP-000005',
    name: 'Ramesh Kumar',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '5',
    device_uid: 5,
    status: 'Active',
  },
  {
    employee_code: 'EMP-000012',
    name: 'sakthi rk',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '12',
    device_uid: 12,
    status: 'Active',
  },
  {
    employee_code: 'EMP-000019',
    name: 'Dharun .B',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '19',
    device_uid: 19,
    status: 'Active',
  },
  {
    employee_code: 'EMP-000027',
    name: 'Employee 27',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '27',
    device_uid: 27,
    status: 'Active',
  },
  {
    employee_code: 'EMP-061044',
    name: 'Employee EMP-61044',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '61044',
    device_uid: 61044,
    status: 'Active',
  },
  {
    employee_code: 'EMP-098723',
    name: 'Employee EMP-98723',
    department: 'Engineering',
    branch: 'HQ Main Office',
    device_user_id: '98723',
    device_uid: 98723,
    status: 'Active',
  },
];

async function main() {
  console.log('🧹 Purging duplicate employee rows in Supabase...');

  // Fetch all existing employee IDs
  const { data: allEmps, error: fetchErr } = await supabase.from('employees').select('id');
  if (fetchErr) {
    console.error('Error fetching employees:', fetchErr.message);
    return;
  }

  console.log(`Found ${allEmps.length} rows in employees table.`);

  // Delete all existing rows
  if (allEmps && allEmps.length > 0) {
    const ids = allEmps.map((e) => e.id);
    // Delete in chunks of 50
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      await supabase.from('employees').delete().in('id', chunk);
    }
    console.log('✅ Cleared all stale/duplicate employee records.');
  }

  // Insert exactly the 8 canonical employee records
  const { data: inserted, error: insertErr } = await supabase.from('employees').insert(CANONICAL_EMPLOYEES).select();

  if (insertErr) {
    console.error('❌ Error inserting canonical employees:', insertErr.message);
  } else {
    console.log(`✅ Successfully seeded exactly ${inserted.length} canonical active employees into Supabase!`);
  }

  // Verify final count
  const { count } = await supabase.from('employees').select('count', { count: 'exact', head: true });
  console.log(`📊 Verified count in public.employees: ${count}`);
}

main().catch(console.error);
