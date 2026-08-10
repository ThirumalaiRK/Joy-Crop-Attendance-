const ZKLib = require('node-zklib');

async function testDeviceTime() {
  const ip = '192.168.1.56';
  const zk = new ZKLib(ip, 4370, 5000, 5200);
  try {
    await zk.createSocket();
    const time = await zk.getTime();
    console.log('🕒 Hardware Device Time (from machine):', time);
    console.log('🕒 Host PC Current Time (Local):', new Date().toString());
    console.log('🕒 Host PC Current Time (ISO):', new Date().toISOString());
    console.log('🕒 Host PC Locale String:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    await zk.disconnect();
  } catch (err) {
    console.error('Error reading device time:', err);
  }
}

testDeviceTime();
