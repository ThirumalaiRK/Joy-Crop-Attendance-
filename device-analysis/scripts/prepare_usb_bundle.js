const fs = require('fs');
const path = require('path');

const srcPath = 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\1.jpg';
const destDir = 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\usb_ready';

fs.mkdirSync(destDir, { recursive: true });

const targetNames = [
  '1.jpg',
  'wallpaper.jpg',
  'theme.jpg',
  'bg.jpg',
  'ad_1.jpg',
];

targetNames.forEach(name => {
  fs.copyFileSync(srcPath, path.join(destDir, name));
});

console.log('✅ Created USB-ready wallpaper bundle at:', destDir);
