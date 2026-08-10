const fs = require('fs');
const path = require('path');

const imgPath = 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\1.jpg';
const stats = fs.statSync(imgPath);
const buf = fs.readFileSync(imgPath);

console.log('File size:', stats.size, 'bytes');

let width = 0, height = 0;
for (let i = 0; i < buf.length - 8; i++) {
  if (buf[i] === 0xff && (buf[i+1] === 0xc0 || buf[i+1] === 0xc2)) {
    height = buf.readUInt16BE(i + 5);
    width = buf.readUInt16BE(i + 7);
    break;
  }
}

console.log(`Dimensions: ${width} x ${height} px`);
