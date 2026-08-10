const { Service } = require('node-windows');
const path = require('path');

// Create a new Windows Service object
const svc = new Service({
  name: 'HRMS Biometric Connector',
  description: 'Enterprise Biometric TCP Gateway & Zero-Latency Attendance Engine for HRMS',
  script: path.join(__dirname, '..', 'dist', 'index.js'),
  workingDirectory: path.join(__dirname, '..'),
  wait: 2,
  grow: 0.25,
  maxRestarts: 10,
  env: [
    { name: 'NODE_ENV', value: 'production' },
    { name: 'PORT', value: '4000' }
  ],
  nodeOptions: [
    '--max_old_space_size=2048'
  ]
});

svc.on('install', function () {
  console.log('✅ HRMS Biometric Connector Service installed successfully!');
  svc.start();
});

svc.on('alreadyinstalled', function () {
  console.log('ℹ️ HRMS Biometric Connector Service is already installed.');
  svc.start();
});

svc.on('start', function () {
  console.log('🚀 Service started and listening on TCP 4370 & HTTP Port 4000.');
  console.log('   Attendance punches will now sync automatically in the background 24/7.');
});

svc.on('error', function (err) {
  console.error('❌ Service installation error:', err);
});

svc.install();
