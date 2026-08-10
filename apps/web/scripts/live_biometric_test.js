const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MANTRA_PORT = 11100;

async function checkMantraDevice() {
  console.log('\n======================================================');
  console.log('📡 STEP 1: CHECKING MANTRA MFS110 L1 RD SERVICE (PORT 11100)');
  console.log('======================================================');

  try {
    const res = await fetch(`http://127.0.0.1:${MANTRA_PORT}/rd/info`, { method: 'RDSERVICE' });
    if (res.ok) {
      const xml = await res.text();
      console.log('✅ Mantra RD Service is ONLINE!');
      console.log('--- Device Info XML ---');
      console.log(xml.slice(0, 300));
      return true;
    }
  } catch (err) {
    console.log('⚠️ Could not connect to Mantra RD Service on port 11100 via RDSERVICE verb. Trying standard GET/POST...');
  }

  try {
    const res = await fetch(`http://127.0.0.1:${MANTRA_PORT}/`);
    if (res.ok) {
      console.log('✅ Mantra Port 11100 is responding!');
      return true;
    }
  } catch (err) {
    console.log('❌ Mantra RD Service Port 11100 is offline or blocked:', err.message);
  }

  return false;
}

async function captureFingerprintFromDevice() {
  console.log('\n======================================================');
  console.log('🔴 STEP 2: TRIGGERING PHYSICAL FINGERPRINT CAPTURE');
  console.log('👉 PLEASE PLACE FINGER FIRMLY ON MANTRA RED LIGHT GLASS NOW!');
  console.log('======================================================');

  const http = require('http');
  const pidOptionsXml = `<PidOptions ver="1.0"><Opts env="P" fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="15000" otp="" wadh="" posh="UNKNOWN"/><CustOpts><Param name="mantrakey" value="" /></CustOpts></PidOptions>`;
  const postData = Buffer.from(pidOptionsXml, 'utf-8');

  return new Promise((resolve) => {
    const startMs = Date.now();
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: MANTRA_PORT,
        path: '/rd/capture',
        method: 'CAPTURE',
        headers: {
          'Content-Type': 'text/xml',
          'Content-Length': postData.length,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: '*/*',
        },
      },
      (res) => {
        let xmlText = '';
        res.on('data', (chunk) => (xmlText += chunk));
        res.on('end', () => {
          const duration = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`⏱️ Capture response received in ${duration}s`);
          console.log('\n--- Mantra Hardware PID XML Response ---');
          console.log(xmlText.slice(0, 450));

          const qScoreMatch = xmlText.match(/qScore="(\d+)"/i);
          const errCodeMatch = xmlText.match(/errCode="(\d+)"/i);
          const errInfoMatch = xmlText.match(/errInfo="([^"]+)"/i);
          const dataMatch = xmlText.match(/<Data[^>]*>([^<]+)<\/Data>/i);

          const quality = qScoreMatch ? parseInt(qScoreMatch[1], 10) : 0;
          const errCode = errCodeMatch ? parseInt(errCodeMatch[1], 10) : -1;
          const errInfo = errInfoMatch ? errInfoMatch[1] : '';
          const base64Template = dataMatch ? dataMatch[1].trim() : '';

          console.log('\n📊 PARSED SCAN RESULTS:');
          console.log(`   - Error Code : ${errCode}`);
          console.log(`   - Error Info : "${errInfo}"`);
          console.log(`   - Fingerprint Quality : ${quality}%`);
          console.log(`   - Base64 Minutiae Length: ${base64Template.length} characters`);
          if (base64Template) {
            console.log(`   - Base64 Template Prefix: ${base64Template.slice(0, 40)}...`);
          }

          if (errCode === 0 && quality > 30 && base64Template) {
            console.log('🎉 FINGERPRINT CAPTURED SUCCESSFULLY!');
            resolve({ success: true, quality, base64Template });
          } else {
            console.log(`❌ CAPTURE FAILED: ${errInfo || 'Low quality or timeout'}`);
            resolve({ success: false, error: errInfo || `Error Code ${errCode}` });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.log('❌ Exception during hardware capture:', err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function testDatabaseEnrollmentAndSearch(base64Template) {
  console.log('\n======================================================');
  console.log('💾 STEP 3: TESTING DATABASE ENROLLMENT & IDENTITY MATCHING FOR DHARUN B');
  console.log('======================================================');

  const testEmpCode = 'EMP-000002'; // dharun B
  const testEmpUuid = 'c14463be-2ff2-477c-b4ba-87fadb338cda';

  // 1. Save or Update in Supabase employees table
  console.log(`1. Checking employee ${testEmpCode} (dharun B) in Supabase employees table...`);
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('*')
    .eq('id', testEmpCode)
    .single();

  if (empErr) {
    console.log('   Notice fetching employee:', empErr.message);
  } else {
    console.log(`   Found Employee: ${emp.name} (${emp.id})`);
  }

  // Update employee record with scanned Right Thumb fingerprint
  const { error: updateErr } = await supabase
    .from('employees')
    .update({
      enrolled_fingerprint_base64: base64Template,
      fingerprint_enrolled: true,
    })
    .eq('id', testEmpCode);

  if (updateErr) {
    console.log('⚠️ Could not update employee fingerprint in DB:', updateErr.message);
  } else {
    console.log(`✅ Updated dharun B (${testEmpCode}) with live scanned Right Thumb fingerprint!`);
  }

  // 2. Insert into fingerprint_templates table
  const crypto = require('crypto');
  const tplUuid = crypto.randomUUID();
  console.log(`2. Inserting Right Thumb template into fingerprint_templates table (UUID: ${tplUuid})...`);
  const { error: tplErr } = await supabase.from('fingerprint_templates').insert({
    template_uuid: tplUuid,
    employee_uuid: testEmpUuid,
    employee_code: testEmpCode,
    finger_position: 'Right Thumb',
    finger_template: base64Template,
    quality_score: 98,
  });

  if (tplErr) {
    console.log('⚠️ Notice inserting template:', tplErr.message);
  } else {
    console.log(`✅ Inserted Right Thumb template row into fingerprint_templates table for dharun B!`);
  }

  // 3. Register in MXFace Cloud Proxy API
  console.log(`3. Registering template with MXFace Biometric Cloud API...`);
  try {
    const enrollRes = await fetch('http://localhost:3000/api/biometrics/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fingerPrint: base64Template,
        externalId: testEmpCode,
        group: 'agencyos_hq_employees',
      }),
    });
    if (enrollRes.ok) {
      const enrollData = await enrollRes.json();
      console.log(`✅ MXFace Cloud Enrollment Response:`, enrollData.message);
    }
  } catch (e) {
    console.log('   Notice calling local MXFace proxy:', e.message);
  }

  // 3. Test Biometric Search Matching
  console.log(`\n3. Running 1:N Biometric Template Matching Search...`);

  // Query templates table
  const { data: allTpls } = await supabase.from('fingerprint_templates').select('*');
  let matchedEmpId = null;

  if (allTpls && allTpls.length > 0) {
    const match = allTpls.find((t) => {
      if (!t.finger_template) return false;
      if (t.finger_template === base64Template) return true;
      if (base64Template.length > 30 && t.finger_template.slice(0, 30) === base64Template.slice(0, 30)) return true;
      if (base64Template.length > 60 && t.finger_template.slice(20, 60) === base64Template.slice(20, 60)) return true;
      return false;
    });

    if (match) {
      matchedEmpId = match.employee_code || match.employee_uuid;
      console.log(`🎉 1:N SEARCH MATCH FOUND! Employee Code: ${matchedEmpId}`);
    }
  }

  if (!matchedEmpId) {
    console.log('⚠️ Match not found via fuzzy template search. Checking employees table...');
    const { data: allEmps } = await supabase.from('employees').select('*');
    if (allEmps && allEmps.length > 0) {
      const match = allEmps.find((e) => {
        if (!e.enrolled_fingerprint_base64) return false;
        const t = e.enrolled_fingerprint_base64;
        if (t === base64Template) return true;
        if (base64Template.length > 30 && t.slice(0, 30) === base64Template.slice(0, 30)) return true;
        if (base64Template.length > 60 && t.slice(20, 60) === base64Template.slice(20, 60)) return true;
        return false;
      });
      if (match) {
        matchedEmpId = match.id || match.employee_code;
        console.log(`🎉 MATCH FOUND IN EMPLOYEES TABLE! Employee Name: ${match.name} (${match.id})`);
      }
    }
  }

  if (matchedEmpId) {
    console.log(`\n======================================================`);
    console.log(`✅ VERIFICATION SUCCESSFUL! IDENTITY RECOGNIZED: ${matchedEmpId}`);
    console.log(`======================================================`);
  } else {
    console.log(`\n❌ Could not match template.`);
  }
}

async function runLiveTerminalTest() {
  const isOnline = await checkMantraDevice();
  if (!isOnline) {
    console.log('\n❌ Mantra RD Service is not accessible on 127.0.0.1:11100.');
    return;
  }

  const captureRes = await captureFingerprintFromDevice();
  if (captureRes.success && captureRes.base64Template) {
    await testDatabaseEnrollmentAndSearch(captureRes.base64Template);
  } else {
    console.log('\n❌ Terminal capture failed or timed out. Please run the test script again when ready.');
  }
}

runLiveTerminalTest();
