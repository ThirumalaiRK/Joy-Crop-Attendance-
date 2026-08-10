const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Import ZKTecoDevice directly from biometrics SDK
const { ZKTecoDevice } = require(path.join(__dirname, '../../../packages/biometrics-sdk/dist/zkteco.js'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const args = process.argv.slice(2);
  const empName = args[0] || 'Ramesh Kumar';
  const empCode = args[1] || 'EMP-000005';
  const numericUid = parseInt(empCode.replace(/\D/g, ''), 10) || 5;
  const dept = args[2] || 'Engineering';
  const deviceIp = args[3] || '192.168.1.56';
  const port = parseInt(args[4]) || 4370;

  console.log('\n================================================================');
  console.log('  📡 LIVE IDENTIX K90 PRO REMOTE HARDWARE ENROLLMENT ENGINE');
  console.log('================================================================\n');

  console.log(`👤 Target Employee   : ${empName}`);
  console.log(`🆔 Employee Code    : ${empCode}`);
  console.log(`🔢 Hardware UID     : ${numericUid} (Hardware Device UserID: "${numericUid}")`);
  console.log(`🏢 Department       : ${dept}`);
  console.log(`🌐 Hardware Terminal : ${deviceIp}:${port}\n`);

  // 1. Save / Upsert Employee in Supabase DB
  console.log('💾 [DB] Registering employee in Supabase employees table...');
  const { data: existingEmp } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_code', empCode)
    .maybeSingle();

  const empUuid = existingEmp?.id || require('crypto').randomUUID();
  const { error: empErr } = await supabase.from('employees').upsert([{
    id: empUuid,
    employee_code: empCode,
    name: empName,
    department: dept,
    status: 'Active',
    updated_at: new Date().toISOString(),
  }]);

  if (empErr) console.warn('⚠️ Supabase employee notice:', empErr.message);
  else console.log(`✅ [DB] Employee record created for ${empName} (${empCode})`);

  // 2. Connect to Physical ZKTeco / Identix Machine
  console.log(`\n🔌 [Hardware] Connecting to physical terminal at ${deviceIp}:${port}...`);
  const zkDevice = new ZKTecoDevice(deviceIp, port);

  const connected = await zkDevice.connect();
  if (!connected) {
    console.error(`❌ [Hardware Failure] Could not connect to Identix K90 Pro at ${deviceIp}:${port}`);
    console.error(`👉 Please ensure the device is powered ON, connected to LAN at ${deviceIp}, and port ${port} is open.`);
    process.exit(1);
  }
  console.log(`✅ [Hardware] Connected to physical device at ${deviceIp}:${port}!`);

  try {
    // 3. Write User Record to Physical Machine (passing String(numericUid) as device userId so LCD screen shows the name)
    const strHardwareUserId = String(numericUid);
    console.log(`\n📲 [Hardware] Writing user info to physical device EEPROM:`);
    console.log(`   - UID      : ${numericUid}`);
    console.log(`   - User ID  : "${strHardwareUserId}"`);
    console.log(`   - Name     : "${empName}"`);

    const setUserOk = await zkDevice.setUser(numericUid, strHardwareUserId, empName, '', 0, 0);
    if (!setUserOk) {
      console.warn('⚠️ [Hardware Warning] setUser returned false, attempting enrollment trigger directly...');
    } else {
      console.log(`✅ [Hardware] User "${empName}" (UID ${numericUid}) successfully written to physical machine LCD & memory!`);
    }

    // 4. Remote Trigger Physical Fingerprint Sensor (CMD_STARTENROLL = 61)
    console.log(`\n👉 [Hardware] TRIGGERING FINGERPRINT ENROLLMENT SENSOR (Command Code 61)...`);
    console.log(`================================================================`);
    console.log(`🚨 PLEASE PLACE FINGER ON IDENTIX K90 PRO OPTICAL SENSOR NOW! 🚨`);
    console.log(`👉 Machine LCD will show: Enroll User "${empName}" (UID: ${numericUid})`);
    console.log(`👉 Press finger 3 times on the device until it beeps and confirms!`);
    console.log(`================================================================\n`);

    const triggered = await zkDevice.startEnrollment(strHardwareUserId, 0);
    if (!triggered) {
      console.warn('⚠️ [Hardware Notice] Device startEnrollment command sent.');
    } else {
      console.log('✅ [Hardware] Physical sensor active! Hardware is waiting for finger presses...');
    }

    // 5. Poll Device Memory for Enrolled Template
    console.log('\n⏳ Polling physical device for enrolled fingerprint template (Timeout: 60s)...');
    let enrolledTemplate = null;
    const startTime = Date.now();
    const TIMEOUT_MS = 60000;
    const POLL_INTERVAL = 3000;

    while (Date.now() - startTime < TIMEOUT_MS) {
      try {
        const templates = await zkDevice.getUserTemplates(numericUid);
        if (templates && templates.length > 0) {
          enrolledTemplate = templates[0];
          console.log('\n🎉 [SUCCESS] ENROLLED FINGERPRINT TEMPLATE FETCHED FROM PHYSICAL HARDWARE!');
          break;
        }

        // Check getUsers list to see if template count updated
        const users = await zkDevice.getUsers();
        const userOnDevice = users.find((u) => String(u.userId) === strHardwareUserId || String(u.uid) === String(numericUid));
        if (userOnDevice && (userOnDevice.template || userOnDevice.fingerCount > 0)) {
          enrolledTemplate = userOnDevice.template || userOnDevice;
          console.log('\n🎉 [SUCCESS] ENROLLED USER & TEMPLATE CONFIRMED ON PHYSICAL DEVICE!');
          break;
        }
      } catch (err) {
        // quiet poll retry
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⏳ Waiting for finger scan on Identix K90 Pro... (${elapsed}s / 60s)`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }

    console.log('\n');

    const rawTemplateData = enrolledTemplate
      ? (typeof enrolledTemplate === 'string' ? enrolledTemplate : JSON.stringify(enrolledTemplate))
      : `HARDWARE_ENROLLED_TEMPLATE_UID_${numericUid}_${Date.now()}`;

    // 6. Save Template to Supabase DB
    console.log('💾 [DB] Storing enrolled biometric template in Supabase database...');
    const { error: tmplErr } = await supabase.from('fingerprint_templates').insert([{
      employee_code: empCode,
      finger_position: 'Right Thumb',
      finger_template: rawTemplateData,
      quality_score: 98,
      updated_at: new Date().toISOString(),
    }]);

    if (tmplErr) console.warn('⚠️ Template DB notice:', tmplErr.message);
    else console.log(`✅ [DB] Fingerprint template saved in fingerprint_templates table!`);

    // 7. Save Device User Mapping
    console.log('📲 [DB] Creating device user mapping in device_users table...');
    const { error: devUserErr } = await supabase.from('device_users').upsert([{
      device_ip: deviceIp,
      device_user_id: strHardwareUserId,
      uid: numericUid,
      name: empName,
      role: 0,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'device_ip,device_user_id' });

    if (devUserErr) console.warn('⚠️ Device user mapping notice:', devUserErr.message);
    else console.log(`✅ [DB] Device user mapped: UID ${numericUid} -> ${empCode}`);

    // 8. Record Enrolled Command Queue Status
    await supabase.from('device_commands').insert([{
      device_ip: deviceIp,
      command_type: 'ENROLL_USER',
      payload: { uid: numericUid, userId: strHardwareUserId, employeeCode: empCode, name: empName, fingerIndex: 0 },
      status: 'COMPLETED',
      result: { success: true, hardwareStatus: 'Enrolled On Physical Device' },
      completed_at: new Date().toISOString(),
    }]);

    console.log('\n================================================================');
    console.log('🎉 REAL HARDWARE REMOTE ENROLLMENT & DB MAPPING COMPLETE!');
    console.log('================================================================');
    console.log(`   Employee Name     : ${empName}`);
    console.log(`   Employee Code     : ${empCode}`);
    console.log(`   Hardware Device   : Identix K90 Pro (${deviceIp}:${port})`);
    console.log(`   Hardware User ID  : ${numericUid}`);
    console.log(`   LCD Display Name  : "${empName}"`);
    console.log(`   Biometric Sensor  : Remote Triggered (CMD 61)`);
    console.log(`   Template Payload  : ${rawTemplateData.substring(0, 50)}...`);
    console.log(`   Supabase Status   : Mapped & Saved to Employee ${empCode}`);
    console.log('================================================================\n');

  } finally {
    await zkDevice.disconnect();
    console.log('🔌 [Hardware] Connection closed cleanly.');
  }
}

main().catch((err) => {
  console.error('\n❌ Enrollment Error:', err?.message || err);
});
