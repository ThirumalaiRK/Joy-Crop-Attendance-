const http = require('http');

function testNativeHttpCapture() {
  const pidOptionsXml = `<PidOptions ver="1.0"><Opts env="P" fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="" posh="UNKNOWN"/><CustOpts><Param name="mantrakey" value="" /></CustOpts></PidOptions>`;

  console.log('Sending native Node.js HTTP CAPTURE request to 127.0.0.1:11100...\n');
  console.log('👉 PLEASE PLACE YOUR FINGER FIRMLY ON MANTRA SCANNER NOW!');

  const postData = Buffer.from(pidOptionsXml, 'utf-8');

  const options = {
    hostname: '127.0.0.1',
    port: 11100,
    path: '/rd/capture',
    method: 'CAPTURE',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': postData.length,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': '*/*',
    },
  };

  const startMs = Date.now();
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const duration = ((Date.now() - startMs) / 1000).toFixed(1);
      console.log(`\n⏱️ Response received in ${duration}s (HTTP ${res.statusCode}):`);
      console.log('--------------------------------------------------');
      console.log(data);
      console.log('--------------------------------------------------');

      const errMatch = data.match(/errCode="([^"]+)"/i);
      const errInfoMatch = data.match(/errInfo="([^"]+)"/i);
      const qScoreMatch = data.match(/qScore="(\d+)"/i);
      const dataMatch = data.match(/<Data[^>]*>([^<]+)<\/Data>/i);

      const errCode = errMatch ? errMatch[1] : 'unknown';
      const errInfo = errInfoMatch ? errInfoMatch[1] : '';
      const quality = qScoreMatch ? qScoreMatch[1] : '0';
      const base64 = dataMatch ? dataMatch[1].trim() : '';

      console.log(`\n📊 PARSED RESULTS:`);
      console.log(`   - errCode : ${errCode}`);
      console.log(`   - errInfo : "${errInfo}"`);
      console.log(`   - Quality : ${quality}%`);
      console.log(`   - Base64 Length : ${base64.length}`);

      if (errCode === '0') {
        console.log('\n🎉 SUCCESS! FINGERPRINT CAPTURED FROM HARDWARE DEVICE!');
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ HTTP Error: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testNativeHttpCapture();
