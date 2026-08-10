const path = require('path');
const ZKLib = require(path.join(__dirname, '../../../packages/biometrics-sdk/node_modules/node-zklib'));

async function testEnrollVariants() {
  const ip = '192.168.1.56';
  const port = 4370;
  const uid = 5;
  const userId = '5';
  const fingerIndex = 0;

  console.log(`🔌 Connecting to Identix K90 Pro at ${ip}:${port}...`);
  const zkInstance = new ZKLib(ip, port, 10000, 4000);

  try {
    await zkInstance.createSocket();
    console.log('✅ Connected via TCP/UDP!');

    // First: Ensure user exists on device
    console.log(`\n1️⃣ Ensuring User UID ${uid} exists on device...`);
    try {
      await zkInstance.setUser(uid, userId, 'Ramesh Kumar', '', 0, 0);
      await zkInstance.executeCmd(1013, ''); // REFRESH_DATA
      console.log('✅ User written to device!');
    } catch (e) {
      console.warn('setUser warning:', e.message);
    }

    // Cancel any current capture/monitoring state first
    console.log('\n2️⃣ Sending CMD_CANCELCAPTURE (60) to reset sensor state...');
    try {
      const res60 = await zkInstance.executeCmd(60, '');
      console.log('CMD_CANCELCAPTURE (60) response:', res60);
    } catch (e) {
      console.warn('CMD_CANCELCAPTURE (60) error:', e.message);
    }

    await new Promise((r) => setTimeout(r, 500));

    // Variant A: 2-byte UInt16LE UID (3 bytes total)
    console.log('\n3️⃣ Testing Variant A: 2-byte UInt16LE UID (3 bytes total)...');
    const bufA = Buffer.alloc(3);
    bufA.writeUInt16LE(uid, 0);
    bufA.writeUInt8(fingerIndex, 2);
    try {
      const resA = await zkInstance.executeCmd(61, bufA);
      console.log('Variant A (61, 3 bytes) response:', resA);
    } catch (e) {
      console.warn('Variant A error:', e.message);
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Variant B: 4-byte UInt32LE UID + 1-byte fingerIndex (5 bytes total)
    console.log('\n4️⃣ Testing Variant B: 4-byte UInt32LE UID (5 bytes total)...');
    const bufB = Buffer.alloc(5);
    bufB.writeUInt32LE(uid, 0);
    bufB.writeUInt8(fingerIndex, 4);
    try {
      const resB = await zkInstance.executeCmd(61, bufB);
      console.log('Variant B (61, 5 bytes) response:', resB);
    } catch (e) {
      console.warn('Variant B error:', e.message);
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Variant C: 24-byte ASCII UserID + 1-byte fingerIndex (25 bytes total)
    console.log('\n5️⃣ Testing Variant C: 24-byte ASCII UserID (25 bytes total)...');
    const bufC = Buffer.alloc(25);
    bufC.write(userId, 0, 'ascii');
    bufC.writeUInt8(fingerIndex, 24);
    try {
      const resC = await zkInstance.executeCmd(61, bufC);
      console.log('Variant C (61, 25 bytes) response:', resC);
    } catch (e) {
      console.warn('Variant C error:', e.message);
    }

    await new Promise((r) => setTimeout(r, 2000));

    // Variant D: Command 82 (CMD_STARTENROLL_EX)
    console.log('\n6️⃣ Testing Command 82 (CMD_STARTENROLL_EX)...');
    try {
      const res82 = await zkInstance.executeCmd(82, bufA);
      console.log('Command 82 response:', res82);
    } catch (e) {
      console.warn('Command 82 error:', e.message);
    }

    console.log('\n======================================================');
    console.log('🏁 ENROLLMENT VARIANT DIAGNOSTICS COMPLETE!');
    console.log('======================================================');

  } catch (err) {
    console.error('Fatal Test Error:', err);
  } finally {
    try {
      await zkInstance.disconnect();
    } catch (_) {}
  }
}

testEnrollVariants();
