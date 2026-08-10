const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/device/clear-records',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('✅ Clear terminal records result:', body);
  });
});

req.on('error', err => console.log('Error:', err.message));
req.write(JSON.stringify({ ip: '192.168.1.56' }));
req.end();
