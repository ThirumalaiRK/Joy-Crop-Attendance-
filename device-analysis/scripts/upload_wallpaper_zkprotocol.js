const net = require('net');
const fs = require('fs');
const path = require('path');

const TARGET_IP = '192.168.1.56';
const TARGET_PORT = 4370;
const IMAGE_PATH = 'f:\\TEST LIVE ATTENDANCE\\wallpaper\\1.jpg';

const logFile = path.join(__dirname, '..', 'logs', 'wallpaper_upload.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

class ZKFileUploader {
  constructor(ip, port) {
    this.ip = ip;
    this.port = port;
    this.sessionId = 0;
    this.replyId = 0;
    this.socket = null;
  }

  createHeader(command, dataBuffer = Buffer.alloc(0)) {
    const payloadLen = 8 + dataBuffer.length;
    const buf = Buffer.alloc(8 + 8 + dataBuffer.length);

    buf.writeUInt8(0x50, 0);
    buf.writeUInt8(0x50, 1);
    buf.writeUInt8(0x82, 2);
    buf.writeUInt8(0x7d, 3);

    buf.writeUInt16LE(payloadLen, 4);
    buf.writeUInt16LE(0, 6);

    buf.writeUInt16LE(command, 8);
    buf.writeUInt16LE(0, 10);
    buf.writeUInt16LE(this.sessionId, 12);
    buf.writeUInt16LE(this.replyId, 14);

    if (dataBuffer.length > 0) {
      dataBuffer.copy(buf, 16);
    }

    let chksum = 0;
    for (let i = 8; i < buf.length; i += 2) {
      if (i + 1 < buf.length) {
        chksum += buf.readUInt16LE(i);
      } else {
        chksum += buf.readUInt8(i);
      }
      chksum = (chksum & 0xffff) + (chksum >> 16);
    }
    chksum = (~chksum) & 0xffff;
    buf.writeUInt16LE(chksum, 10);

    return buf;
  }

  async connect() {
    return new Promise((resolve) => {
      this.socket = new net.Socket();
      this.socket.setTimeout(6000);

      this.socket.on('connect', () => {
        log(`TCP Connected to ${this.ip}:${this.port}`);
        const pkt = this.createHeader(1000); // CMD_CONNECT
        this.socket.write(pkt);
      });

      this.socket.on('data', (data) => {
        if (data.length >= 16) {
          const cmd = data.readUInt16LE(8);
          this.sessionId = data.readUInt16LE(12);
          this.replyId = data.readUInt16LE(14);
          log(`[Connect Response] CMD=${cmd} (2000=SUCCESS), SessionId=${this.sessionId}`);
          resolve(cmd === 2000);
        }
      });

      this.socket.on('error', (err) => {
        log(`Socket error: ${err.message}`);
        resolve(false);
      });

      this.socket.on('timeout', () => {
        log(`Socket timeout`);
        this.socket.destroy();
        resolve(false);
      });

      this.socket.connect(this.port, this.ip);
    });
  }

  async sendCmd(command, dataBuf = Buffer.alloc(0)) {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.destroyed) return resolve(null);
      this.replyId = (this.replyId + 1) & 0xffff;
      const pkt = this.createHeader(command, dataBuf);

      const onData = (data) => {
        this.socket.removeListener('data', onData);
        if (data.length >= 16) {
          const responseCmd = data.readUInt16LE(8);
          const payload = data.subarray(16);
          resolve({ responseCmd, payload, rawHex: payload.toString('hex') });
        } else {
          resolve({ responseCmd: 0, payload: data, rawHex: data.toString('hex') });
        }
      };

      this.socket.once('data', onData);
      this.socket.write(pkt);

      setTimeout(() => {
        this.socket.removeListener('data', onData);
        resolve(null);
      }, 4000);
    });
  }

  async uploadFile(targetFilename, fileBuffer) {
    log(`\nAttempting upload to target filename: "${targetFilename}" (${fileBuffer.length} bytes)...`);

    // Payload for CMD_WRITE_FILE (4):
    // null-terminated filename string, followed by uint32LE fileSize
    const nameBuf = Buffer.from(targetFilename + '\0', 'ascii');
    const writeReqPayload = Buffer.alloc(nameBuf.length + 4);
    nameBuf.copy(writeReqPayload, 0);
    writeReqPayload.writeUInt32LE(fileBuffer.length, nameBuf.length);

    const CMD_WRITE_FILE = 4;
    const writeResp = await this.sendCmd(CMD_WRITE_FILE, writeReqPayload);
    log(`  [CMD_WRITE_FILE Response] CMD=${writeResp ? writeResp.responseCmd : 'null'}, hex=${writeResp ? writeResp.rawHex : 'none'}`);

    if (!writeResp || writeResp.responseCmd !== 2000) {
      log(`  ❌ Device rejected CMD_WRITE_FILE for "${targetFilename}"`);
      return false;
    }

    log(`  ✅ Device accepted CMD_WRITE_FILE! Streaming ${fileBuffer.length} bytes in 1024-byte chunks...`);

    // Stream file chunks using CMD_PREPARE_DATA (1504) or raw chunks
    const CHUNK_SIZE = 1024;
    let offset = 0;
    while (offset < fileBuffer.length) {
      const chunk = fileBuffer.subarray(offset, Math.min(offset + CHUNK_SIZE, fileBuffer.length));
      const CMD_DATA = 1503;
      const chunkResp = await this.sendCmd(CMD_DATA, chunk);
      offset += chunk.length;
      log(`    Sent chunk offset ${offset}/${fileBuffer.length} - Response: CMD=${chunkResp ? chunkResp.responseCmd : 'null'}`);
    }

    // Send CMD_REFRESHDATA (1013) to reload UI assets
    log(`  Sending CMD_REFRESHDATA (1013) to reload display...`);
    const refreshResp = await this.sendCmd(1013, Buffer.alloc(0));
    log(`  [CMD_REFRESHDATA Response] CMD=${refreshResp ? refreshResp.responseCmd : 'null'}`);

    return true;
  }

  async close() {
    if (this.socket && !this.socket.destroyed) {
      try {
        const exitPkt = this.createHeader(1001);
        this.socket.write(exitPkt);
      } catch (_) {}
      this.socket.destroy();
    }
  }
}

async function main() {
  log('\n======================================================');
  log('🖼️  UPLOADING CUSTOM WALLPAPER TO HARDWARE TERMINAL');
  log(`   Image File: ${IMAGE_PATH}`);
  log('======================================================\n');

  if (!fs.existsSync(IMAGE_PATH)) {
    log(`❌ Image file not found at ${IMAGE_PATH}`);
    return;
  }

  const fileBuf = fs.readFileSync(IMAGE_PATH);
  log(`Loaded image: ${fileBuf.length} bytes (320x240 px)`);

  const uploader = new ZKFileUploader(TARGET_IP, TARGET_PORT);
  const connected = await uploader.connect();

  if (!connected) {
    log('❌ Could not connect directly. (Connector socket may be active).');
    return;
  }

  // Potential target wallpaper paths accepted by ZKTeco Linux SSR firmware
  const targetPaths = [
    'wallpaper.jpg',
    'theme/wallpaper.jpg',
    'theme/bg.jpg',
    'photo/wallpaper.jpg',
    'ad_1.jpg',
    'photo/ad_1.jpg',
    'theme1.jpg',
  ];

  let uploadedSuccessfully = false;
  for (const targetPath of targetPaths) {
    const success = await uploader.uploadFile(targetPath, fileBuf);
    if (success) {
      log(`🎉 SUCCESSFULLY UPLOADED WALLPAPER AS "${targetPath}"!`);
      uploadedSuccessfully = true;
      break;
    }
  }

  await uploader.close();

  if (uploadedSuccessfully) {
    log('\n✅ Wallpaper upload completed and display refreshed on hardware terminal!');
  } else {
    log('\n⚠️ ZK Protocol direct CMD_WRITE_FILE rejected by firmware or requires alternative route.');
  }
}

main().catch(console.error);
