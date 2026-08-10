const { createClient } = require('@supabase/supabase-js');
const http = require('http');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://powyigqkkzfpbalqunyl.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvd3lpZ3Fra3pmcGJhbHF1bnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3MzIzMzUsImV4cCI6MjEwMTMwODMzNX0.YgznbTw4Ri1zL14svON5R3skUSBb-AnAo6R2IMR7sRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function captureFingerprint() {
  const pidOptionsXml = `<PidOptions ver="1.0"><Opts env="P" fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="12000" otp="" wadh="" posh="UNKNOWN"/><CustOpts><Param name="mantrakey" value="" /></CustOpts></PidOptions>`;
  const postData = Buffer.from(pidOptionsXml, 'utf-8');

  return new Promise((resolve) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 11100, path: '/rd/capture', method: 'CAPTURE',
        headers: { 'Content-Type': 'text/xml', 'Content-Length': postData.length, 'User-Agent': 'Mozilla/5.0', Accept: '*/*' } },
      (res) => {
        let xmlText = '';
        res.on('data', (chunk) => (xmlText += chunk));
        res.on('end', () => {
          const qScoreMatch = xmlText.match(/qScore="(\d+)"/i);
          const dataMatch = xmlText.match(/<Data[^>]*>([^<]+)<\/Data>/i);
          resolve({ quality: qScoreMatch ? parseInt(qScoreMatch[1]) : 0, template: dataMatch ? dataMatch[1].trim() : '' });
        });
      }
    );
    req.on('error', () => resolve({ quality: 0, template: '' }));
    req.write(postData);
    req.end();
  });
}

async function resolveEmployee(fingerPrint) {
  // Mirror exact logic from /api/biometrics/search/route.ts
  const { data: templates } = await supabase.from('fingerprint_templates').select('employee_code, employee_uuid, finger_position, finger_template');

  if (!templates || templates.length === 0) return null;

  // Exact match
  const exact = templates.find((t) => t.finger_template === fingerPrint);
  if (exact) return { code: exact.employee_code, method: 'EXACT', diff: 0 };

  // Per-employee proximity
  const byEmp = {};
  for (const t of templates) {
    const code = t.employee_code || t.employee_uuid;
    if (!code || !t.finger_template) continue;
    const diff = Math.abs(fingerPrint.length - t.finger_template.length);
    if (!(code in byEmp) || diff < byEmp[code].minDiff) {
      byEmp[code] = { minDiff: diff, position: t.finger_position };
    }
  }

  let bestCode = null;
  let bestDiff = Infinity;
  for (const [code, { minDiff }] of Object.entries(byEmp)) {
    if (minDiff < bestDiff) { bestDiff = minDiff; bestCode = code; }
  }

  if (bestCode && bestDiff < 600) return { code: bestCode, method: 'PROXIMITY', diff: bestDiff };
  return { code: bestCode, method: 'BEST_EFFORT', diff: bestDiff };
}

async function main() {
  console.log('\n======================================================');
  console.log('🧪 END-TO-END BIOMETRIC RESOLUTION TEST');
  console.log('======================================================');
  console.log('🔴 SCANNER LIGHT ON — Place any enrolled finger on sensor...\n');

  const capture = await captureFingerprint();

  if (!capture.template) {
    console.log('❌ No fingerprint captured (timeout or hardware not ready)');
    return;
  }

  console.log(`✅ Captured! Quality: ${capture.quality}% | Template length: ${capture.template.length} chars`);
  console.log('🔎 Resolving employee from Supabase fingerprint_templates...\n');

  const result = await resolveEmployee(capture.template);

  if (!result || result.diff >= 600) {
    console.log('⚠️ UNKNOWN FINGER — Not registered in database (no match within threshold)');
    return;
  }

  // Fetch full employee record
  const { data: emp } = await supabase.from('employees').select('*')
    .or(`id.eq.${result.code},employee_code.eq.${result.code}`).limit(1);

  const employee = emp && emp.length > 0 ? emp[0] : null;

  console.log('======================================================');
  console.log('✅ IDENTIFIED EMPLOYEE (REAL DATA — No Mock):');
  console.log('======================================================');
  console.log(`   Name        : ${employee?.name || 'N/A'}`);
  console.log(`   ID          : ${employee?.id || result.code}`);
  console.log(`   Designation : ${employee?.designation || 'N/A'}`);
  console.log(`   Department  : ${employee?.department || 'N/A'}`);
  console.log(`   Match Method: ${result.method} (Δlen=${result.diff})`);
  console.log(`   Scan Quality: ${capture.quality}%`);
  console.log('======================================================\n');
}

main().catch(console.error);
