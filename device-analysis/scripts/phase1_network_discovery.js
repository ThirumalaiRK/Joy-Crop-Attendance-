const net = require('net');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_IP = '192.168.1.56';
const COMMON_PORTS = [
  21,    // FTP
  22,    // SSH
  23,    // Telnet
  80,    // HTTP
  443,   // HTTPS
  4370,  // ZKTeco UDP/TCP Protocol
  4371,  // Secondary ZK
  5005,  // eSSL / Push
  7788,  // ADMS
  8080,  // Alt HTTP
  8088,  // Push Web API
  9922,  // ADMS Server
];

const logFile = path.join(__dirname, '..', 'logs', 'phase1_network_discovery.log');
const reportFile = path.join(__dirname, '..', 'network-analysis', 'port_scan_report.json');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(logFile, line + '\n');
}

async function pingDevice(ip) {
  log(`Pinging ${ip}...`);
  try {
    const res = execSync(`ping -n 3 ${ip}`, { encoding: 'utf8' });
    log(`Ping Response:\n${res}`);
    return true;
  } catch (err) {
    log(`Ping failed: ${err.message}`);
    return false;
  }
}

function checkPort(ip, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = 'CLOSED';

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      status = 'OPEN';
      socket.destroy();
    });

    socket.on('timeout', () => {
      status = 'TIMEOUT';
      socket.destroy();
    });

    socket.on('error', () => {
      status = 'CLOSED';
    });

    socket.on('close', () => {
      resolve({ port, status });
    });

    socket.connect(port, ip);
  });
}

async function scanPorts(ip) {
  log(`Scanning read-only TCP ports on ${ip}...`);
  const results = [];
  for (const port of COMMON_PORTS) {
    const res = await checkPort(ip, port);
    log(`Port ${port}: ${res.status}`);
    results.push(res);
  }
  return results;
}

async function main() {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });

  log(`=== PHASE 1: SAFE NETWORK DISCOVERY START ===`);
  const pingOk = await pingDevice(TARGET_IP);
  const portResults = await scanPorts(TARGET_IP);

  const report = {
    targetIp: TARGET_IP,
    timestamp: new Date().toISOString(),
    pingSuccessful: pingOk,
    openPorts: portResults.filter(p => p.status === 'OPEN').map(p => p.port),
    allPortsChecked: portResults,
  };

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log(`Network discovery complete. Open ports: ${JSON.stringify(report.openPorts)}`);
  log(`=== PHASE 1 COMPLETE ===\n`);
}

main().catch(console.error);
