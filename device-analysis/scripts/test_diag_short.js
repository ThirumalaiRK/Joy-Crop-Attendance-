const http = require('http');

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
    console.log('Diagnostics check');
  });
});
req.write(JSON.stringify({ ip: '192.168.1.56' }));
req.end();
