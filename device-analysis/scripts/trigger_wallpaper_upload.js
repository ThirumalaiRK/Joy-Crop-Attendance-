const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/device/upload-wallpaper',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
}, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      console.log('✅ Hardware Wallpaper Upload Results:\n', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response:', body);
    }
  });
});

req.on('error', err => console.log('Error:', err.message));
req.write(JSON.stringify({
  ip: '192.168.1.56',
  filePath: 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\1.jpg',
}));
req.end();
