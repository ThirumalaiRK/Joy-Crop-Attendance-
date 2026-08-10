const net = require('net');
const fs = require('fs');
const path = require('path');

const TARGET_IP = '192.168.1.56';
const TARGET_PORT = 4370;

const logFile = path.join(__dirname, '..', 'logs', 'phase2_3_4_analysis.log');
const infoFile = path.join(__dirname, '..', 'device-info', 'device_details.json');
const protoFile = path.join(__dirname, '..', 'protocol-analysis', 'protocol_details.json');
const capFile = path.join(__dirname, '..', 'device-info', 'capabilities.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

class PureZKTcpClient {
  constructor(ip, port) {
    this.ip = ip;
    this.port = port;
    this.socket = null;
    this.sessionId = 0;
    this.replyId = 0;
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
      this.socket.setTimeout(5000);

      this.socket.on('connect', () => {
        log(`[TCP] Connected to ${this.ip}:${this.port}`);
        // Send CMD_CONNECT (1000)
        const pkt = this.createHeader(1000);
        this.socket.write(pkt);
      });

      this.socket.on('data', (data) => {
        if (data.length >= 16) {
          const cmd = data.readUInt16LE(8);
          this.sessionId = data.readUInt16LE(12);
          this.replyId = data.readUInt16LE(14);
          log(`[TCP Connect Handshake] Response CMD=${cmd} (2000=SUCCESS), SessionId=${this.sessionId}`);
          resolve(cmd === 2000);
        }
      });

      this.socket.on('error', (err) => {
        log(`[TCP Error] ${err.message}`);
        resolve(false);
      });

      this.socket.on('timeout', () => {
        log(`[TCP Timeout]`);
        this.socket.destroy();
        resolve(false);
      });

      this.socket.connect(this.port, this.ip);
    });
  }

  async sendCmd(command, dataStrOrBuf = '') {
    return new Promise((resolve) => {
      if (!this.socket || this.socket.destroyed) return resolve(null);
      this.replyId = (this.replyId + 1) & 0xffff;

      let dataBuf = Buffer.isBuffer(dataStrOrBuf) ? dataStrOrBuf : Buffer.from(dataStrOrBuf, 'ascii');
      const pkt = this.createHeader(command, dataBuf);

      const onData = (data) => {
        this.socket.removeListener('data', onData);
        if (data.length >= 16) {
          const responseCmd = data.readUInt16LE(8);
          const payload = data.subarray(16);
          const rawStr = payload.toString('ascii').replace(/\0/g, '').trim();
          resolve({ responseCmd, payload, rawString: rawStr });
        } else {
          resolve({ responseCmd: 0, payload: data, rawString: data.toString('ascii') });
        }
      };

      this.socket.once('data', onData);
      this.socket.write(pkt);

      setTimeout(() => {
        this.socket.removeListener('data', onData);
        resolve(null);
      }, 3000);
    });
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
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.mkdirSync(path.dirname(infoFile), { recursive: true });
  fs.mkdirSync(path.dirname(protoFile), { recursive: true });
  fs.mkdirSync(path.dirname(capFile), { recursive: true });

  log(`\n======================================================`);
  log(`🔍 STARTING PHASE 2, 3, 4: PURE TCP READ-ONLY DEVICE & PROTOCOL ANALYSIS`);
  log(`   Target: ${TARGET_IP}:${TARGET_PORT}`);
  log(`======================================================\n`);

  const client = new PureZKTcpClient(TARGET_IP, TARGET_PORT);
  const ok = await client.connect();

  if (!ok) {
    log('❌ Failed to establish ZKTeco TCP session.');
    return;
  }

  log('✅ Connected to ZKTeco TCP socket. Session active.');

  // 1. Query Version (CMD 1100)
  log('\n--- Querying Firmware Version (CMD 1100) ---');
  const verRes = await client.sendCmd(1100, '');
  log(`Firmware Version (CMD 1100): ${verRes ? verRes.rawString : 'N/A'}`);

  // 2. Query System Info (CMD 1101)
  log('\n--- Querying System Info (CMD 1101) ---');
  const sysRes = await client.sendCmd(1101, '');
  log(`System Info (CMD 1101): ${sysRes ? sysRes.rawString : 'N/A'}`);

  // 3. Query Free Sizes / Capacity (CMD 1102)
  log('\n--- Querying Storage & Capacity (CMD 1102) ---');
  const capRes = await client.sendCmd(1102, '');
  log(`Storage / Free Sizes (CMD 1102): ${capRes ? capRes.rawString : 'N/A'}`);

  // 4. Query Parameter Registers via CMD_OPTIONS_RRQ (11)
  log('\n--- Querying Device Parameters (CMD 11) ---');
  const paramsToTest = [
    '~Platform',
    '~OS',
    '~ZKFPVersion',
    '~OEMVendor',
    '~DeviceName',
    '~SerialNumber',
    '~FirmwareVersion',
    '~MAC',
    '~Language',
    '~IsSupportSSR',
    '~SSR',
    '~LCD',
    '~AdPic',
    '~Pic',
    '~Wallpaper',
    '~Theme',
    '~ScreenSave',
    '~ScreenSaveTime',
    '~Voice',
    '~Volume',
    '~Capture',
    '~OptionSSR',
    '~FreeSizes',
    '~MaxUserCount',
    '~MaxAttLogCount',
    '~MaxFingerCount',
    '~FaceFunOn',
    '~IsSupportUserPic',
    '~PhotoFunOn',
    'Platform',
    'FirmwareVersion',
    'DeviceName',
    'SerialNumber',
    'Wallpaper',
    'Theme',
    'AdPic',
    'LCD',
  ];

  const parameters = {};
  for (const p of paramsToTest) {
    const res = await client.sendCmd(11, p);
    if (res && res.rawString) {
      log(`  ${p.padEnd(20)} => "${res.rawString}" (Code: ${res.responseCmd})`);
      parameters[p] = res.rawString;
    } else {
      log(`  ${p.padEnd(20)} => (empty / code: ${res ? res.responseCmd : 'null'})`);
    }
  }

  // 5. Query batch options via single CMD 11 request with null delimiter
  log('\n--- Querying Combined Option String via CMD 11 ---');
  const combinedQuery = paramsToTest.join(',');
  const combinedRes = await client.sendCmd(11, combinedQuery);
  if (combinedRes && combinedRes.rawString) {
    log(`  [Combined Options] => "${combinedRes.rawString}"`);
  }

  await client.close();
  log('\n[TCP] Connection closed cleanly.');

  // Save Outputs
  const resultData = {
    ip: TARGET_IP,
    port: TARGET_PORT,
    firmwareVersionCmd1100: verRes ? verRes.rawString : null,
    sysInfoCmd1101: sysRes ? sysRes.rawString : null,
    freeSizesCmd1102: capRes ? capRes.rawString : null,
    parametersDiscovered: parameters,
    combinedParameters: combinedRes ? combinedRes.rawString : null,
  };

  fs.writeFileSync(infoFile, JSON.stringify(resultData, null, 2));
  log(`\n✅ Results saved to ${infoFile}`);
}

main().catch(console.error);
