const ZKLib = require('node-zklib');

async function test() {
  const zkInstance = new ZKLib('192.168.1.56', 4370, 10000, 4000);
  try {
    await zkInstance.createSocket();
    console.log('Connected.');
    const logs = await zkInstance.getAttendances();
    console.log('Attendance Logs:');
    console.log(JSON.stringify(logs.data.slice(0, 5), null, 2));

    await zkInstance.disconnect();
  } catch (e) {
    console.error(e);
  }
}

test();
