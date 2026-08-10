import { ZKTecoDevice } from '@hrms/biometrics-sdk';

async function syncTimeNow() {
  const ip = '192.168.1.56';
  const device = new ZKTecoDevice(ip, 4370);
  try {
    await device.connect();
    console.log('🔄 Syncing hardware RTC clock to PC current local time:', new Date().toString());
    const ok = await device.syncTime();
    console.log('✅ Hardware clock sync result:', ok ? 'SUCCESS' : 'FAILED');
    await device.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

syncTimeNow();
