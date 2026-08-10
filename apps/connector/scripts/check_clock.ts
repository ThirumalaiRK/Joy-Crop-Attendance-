import { ZKTecoDevice } from '@hrms/biometrics-sdk';

async function checkClock() {
  const ip = '192.168.1.56';
  const device = new ZKTecoDevice(ip, 4370);
  try {
    await device.connect();
    // execute CMD_GET_TIME (201) or getTime
    const zk = (device as any).device;
    if (zk && typeof zk.getTime === 'function') {
      const t = await zk.getTime();
      console.log('🕒 Hardware Device Internal Clock (getTime):', t);
    }
    const logs = await device.getAttendanceLogs();
    console.log('Latest log from device:', logs[logs.length - 1]);
    console.log('Host PC Current Time:', new Date().toString());
    await device.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkClock();
