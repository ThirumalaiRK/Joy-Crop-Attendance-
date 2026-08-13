const { ZKTecoDevice } = require('../../../packages/biometrics-sdk/dist/index.js');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const ip = '192.168.1.56';
  console.log(`Connecting to biometric device at ${ip}:4370...`);
  
  const { data: emp, error } = await supabase.from('employees').select('*').ilike('name', '%Marimuthu%').single();
  if (error || !emp) {
    console.error('Error fetching Marimuthu T:', error);
    return;
  }

  console.log(`Found Employee: ${emp.name} | Code: ${emp.employee_code} | ID: ${emp.id}`);
  
  const device = new ZKTecoDevice(ip, 4370);
  const connected = await device.connect();
  if (!connected) {
    console.error(`Failed to connect to device at ${ip}`);
    return;
  }
  console.log(`✅ Connected to device ${ip}`);

  const numericUid = parseInt(emp.employee_code.replace(/\D/g, ''), 10) || 114;
  console.log(`Writing user to machine: UID=${numericUid}, UserID=${emp.employee_code}, Name=${emp.name}`);

  const userWritten = await device.setUser(numericUid, emp.employee_code, emp.name, '', 0, 0);
  if (userWritten) {
    console.log(`✅ SUCCESS! User ${emp.name} (${emp.employee_code}) successfully written to machine at ${ip}!`);
    
    // Update Supabase employee record to mark device_uid
    const { data: updated, error: updateErr } = await supabase
      .from('employees')
      .update({
        device_uid: numericUid,
        device_user_id: emp.employee_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', emp.id)
      .select();

    if (updateErr) {
      console.error('Warning updating Supabase device_uid:', updateErr.message);
    } else {
      console.log(`✅ Updated Supabase employee record with device_uid=${numericUid}`);
    }
  } else {
    console.error(`❌ Failed to write user to machine`);
  }

  await device.disconnect();
}

main().catch(console.error);
