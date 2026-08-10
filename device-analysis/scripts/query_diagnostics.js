const http = require('http');
const fs = require('fs');
const path = require('path');

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/device/diagnostics',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('✅ Hardware Diagnostics Response:\n', JSON.stringify(json, null, 2));

      const outPath = path.join(__dirname, '..', 'device-info', 'device_diagnostics.json');
      fs.writeFileSync(outPath, JSON.stringify(json, null, 2));
      console.log(`\nSaved diagnostics to: ${outPath}`);
    } catch (e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', err => console.log('Error:', err.message));
req.write(JSON.stringify({ ip: '192.168.1.56' }));
req.end();
