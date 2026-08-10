import { ZKTecoDevice } from '@hrms/biometrics-sdk';

async function testDeviceTime() {
  const ip = '192.168.1.56';
  const device = new ZKTecoDevice(ip, 4370);
  try {
    await device.connect();
    const logs = await device.getAttendanceLogs();
    console.log('Total attendance logs on device:', logs.length);
    if (logs.length > 0) {
      console.log('Latest 3 logs on device:');
      logs.slice(-3).forEach(l => {
        console.log('  Log recordTime:', l.recordTime, 'type:', typeof l.recordTime, 'parsed toLocaleString:', new Date(l.recordTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
      });
    }
    console.log('Host PC Current Time:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    await device.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

testDeviceTime();
