const ZKLib = require('node-zklib');
const { COMMANDS } = require('node-zklib/constants');

async function testEnroll() {
  const zkInstance = new ZKLib('192.168.1.56', 4370, 10000, 4000);
  try {
    await zkInstance.createSocket();
    console.log('Connected to device.');
    
    // Command 61 is CMD_STARTENROLL
    // Payload usually contains user ID (e.g., '019') and finger index (0)
    // We'll try sending a basic buffer. Usually it's userId string padded with nulls, then finger index.
    const userId = "019";
    const fingerIndex = 0; // 0-9
    
    const buffer = Buffer.alloc(25); // Allocate 25 bytes
    buffer.write(userId, 0, 'ascii');
    buffer.writeUInt8(fingerIndex, 24); 
    
    console.log('Sending CMD_STARTENROLL...');
    const response = await zkInstance.executeCmd(COMMANDS.CMD_STARTENROLL, buffer);
    console.log('Response:', response);

    await zkInstance.disconnect();
  } catch (e) {
    console.error('Error:', e);
  }
}

testEnroll();
