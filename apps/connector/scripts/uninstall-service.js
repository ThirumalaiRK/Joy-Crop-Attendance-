const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'HRMS Biometric Connector',
  script: path.join(__dirname, '..', 'dist', 'index.js'),
});

svc.on('uninstall', function () {
  console.log('✅ HRMS Biometric Connector Service uninstalled cleanly.');
});

svc.on('error', function (err) {
  console.error('❌ Service uninstall error:', err);
});

svc.uninstall();
