const path = require('path');
const ZKLib = require(path.join(__dirname, '../../../packages/biometrics-sdk/node_modules/node-zklib'));

async function testUserWrqAndEnroll() {
  const ip = '192.168.1.56';
  const port = 4370;
  const uid = 5;
  const userId = '5';
  const name = 'Ramesh Kumar';
  const fingerIndex = 0;

  console.log(`🔌 Connecting to Identix K90 Pro at ${ip}:${port}...`);
  const zkInstance = new ZKLib(ip, port, 10000, 4000);

  try {
    await zkInstance.createSocket();
    console.log('✅ Connected via TCP!');

    // STEP 1: Construct exact 72-byte CMD_USER_WRQ (Command Code 8) buffer
    console.log(`\n1️⃣ Constructing CMD_USER_WRQ (8) buffer for UID=${uid}, UserID="${userId}", Name="${name}"...`);
    const userBuf = Buffer.alloc(72);
    userBuf.writeUInt16LE(uid, 0);       // UID (2 bytes)
    userBuf.writeUInt8(0, 2);             // Role: 0 (Normal User)
    userBuf.write('', 3, 8, 'ascii');     // Password (8 bytes)
    userBuf.write(name, 11, 24, 'ascii'); // Display Name on LCD screen (24 bytes)
    userBuf.writeUInt32LE(0, 35);         // Card Number (4 bytes)
    userBuf.writeUInt8(1, 39);            // Flag / Group: 1
    userBuf.writeUInt16LE(0, 40);         // Timezone: 0
    userBuf.write(userId, 48, 24, 'ascii'); // Hardware User ID string (24 bytes)

    const CMD_USER_WRQ = 8;
    console.log('Sending CMD_USER_WRQ (8)...');
    const wrqRes = await zkInstance.executeCmd(CMD_USER_WRQ, userBuf);
    console.log('CMD_USER_WRQ Response:', wrqRes);

    // Refresh memory cache on device
    const CMD_REFRESHDATA = 1013;
    await zkInstance.executeCmd(CMD_REFRESHDATA, '');
    console.log('✅ User record written and refreshed on device LCD screen!');

    // STEP 2: Send CMD_CANCELCAPTURE (60)
    console.log('\n2️⃣ Resetting sensor via CMD_CANCELCAPTURE (60)...');
    await zkInstance.executeCmd(60, '');
    await new Promise((r) => setTimeout(r, 500));

    // STEP 3: Send CMD_STARTENROLL (61) with 25-byte buffer
    console.log('\n3️⃣ Triggering CMD_STARTENROLL (61) on sensor for UserID="5"...');
    const enrollBuf = Buffer.alloc(25);
    enrollBuf.write(userId, 0, 'ascii');
    enrollBuf.writeUInt8(fingerIndex, 24);

    const CMD_STARTENROLL = 61;
    const enrollRes = await zkInstance.executeCmd(CMD_STARTENROLL, enrollBuf);
    console.log('CMD_STARTENROLL Response:', enrollRes);

    console.log('\n======================================================');
    console.log('🚨 CHECK IDENTIX K90 PRO DISPLAY & FINGERPRINT SENSOR!');
    console.log('======================================================\n');

  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    try {
      await zkInstance.disconnect();
    } catch (_) {}
  }
}

testUserWrqAndEnroll();
