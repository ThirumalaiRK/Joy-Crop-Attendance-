import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import { initializeDatabase } from './db';
import deviceRoutes from './routes/devices';
import newDeviceRoutes from './routes/device';
import attendanceRoutes from './routes/attendance';
import { startSyncEngine } from './sync/engine';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { deviceManager } from './DeviceManager';
import { supabase } from './supabase';
import { commandProcessor } from './CommandProcessor';
import { employeeCache } from './cache/EmployeeCache';
import { deviceCache } from './cache/DeviceCache';
import { eventQueue } from './queue/EventQueue';
import { backlogDrainWorker } from './queue/BacklogDrainWorker';
import { UsbLogImporter } from './sync/UsbLogImporter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

let wsClientCount = 0;
/** Throttle heartbeat broadcast to browsers: max once per 30s per device */
const lastHeartbeatBroadcast = new Map<string, number>(); // ip -> epoch ms
const HEARTBEAT_BROADCAST_THROTTLE_MS = 30_000;
/** Cache last attendance event for state restore on reconnect */
let lastAttendanceEvent: any = null;

// ── Machine Connection Log Ring Buffer ────────────────────────────────────────
// Stores the last 50 device TCP lifecycle events in memory for the web UI log panel.
export interface ConnectionLogEntry {
  id: number;
  time: string;     // ISO timestamp
  event: string;    // 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'RECONNECTING' | 'HEARTBEAT' | 'SYSTEM'
  ip: string;
  message: string;
  level: 'info' | 'success' | 'warn' | 'error';
  meta?: Record<string, any>;
}
let logSeq = 0;
const connectionLogBuffer: ConnectionLogEntry[] = [];
const MAX_LOG_BUFFER = 50;

function pushLog(event: string, ip: string, message: string, level: ConnectionLogEntry['level'], meta?: Record<string, any>) {
  connectionLogBuffer.unshift({
    id: ++logSeq,
    time: new Date().toISOString(),
    event,
    ip,
    message,
    level,
    meta,
  });
  if (connectionLogBuffer.length > MAX_LOG_BUFFER) connectionLogBuffer.length = MAX_LOG_BUFFER;
}

// Initialize System Services & Database
initializeDatabase()
  .then(async () => {
    console.log('✅ Local SQLite Database initialized.');

    // 1. Warm up Employee RAM Cache (Sub-millisecond lookup)
    await employeeCache.initialize();

    // 2. Start Offline Backlog Sync Worker
    backlogDrainWorker.start();

    // 3. Start Command Processor & Sync Engine
    startSyncEngine();
    commandProcessor.start();

    // 4. Auto-ingest USB device dump files if present in workspace
    setTimeout(async () => {
      await UsbLogImporter.autoScanAndIngest();
    }, 500);

    // 5. Auto-connect persistent TCP sockets to registered hardware terminals
    setTimeout(() => {
      deviceManager.autoConnectFromSupabase();
    }, 1500);
  })
  .catch((err) => {
    console.error('❌ Failed to initialize connector engine:', err);
  });

// ── Realtime Event Forwarder to Socket.IO ─────────────────────────────────────

// Zero-Latency Immediate Punch Event (<20ms from TCP packet)
eventQueue.on('attendance:new', (payload) => {
  lastAttendanceEvent = payload; // cache for state restore
  io.emit('attendance:new', payload);
  io.emit('attendance_received', payload); // Backward compatibility alias
});

// Device status broadcasts + log ring buffer capture
deviceManager.on('device_connected', (data) => io.emit('device_connected', data));

deviceManager.on('device:online', (data) => {
  io.emit('device:online', data);
  pushLog('ONLINE', data.ip, `TCP socket ONLINE — ${data.name || data.ip}:${data.port || 4370}`, 'success', { port: data.port, name: data.name });
  io.emit('connection_log', connectionLogBuffer[0]);
});

deviceManager.on('device_disconnected', (data) => io.emit('device_disconnected', data));

deviceManager.on('device:offline', (data) => {
  io.emit('device:offline', data);
  pushLog('OFFLINE', data.ip, `TCP socket OFFLINE — ${data.ip} lost connection`, 'error');
  io.emit('connection_log', connectionLogBuffer[0]);
});

deviceManager.on('device:connecting', (data) => {
  io.emit('device:connecting', data);
  pushLog('CONNECTING', data.ip, `Initiating TCP socket to ${data.ip}:${data.port || 4370}...`, 'info', { port: data.port });
  io.emit('connection_log', connectionLogBuffer[0]);
});

deviceManager.on('device:reconnecting', (data) => {
  io.emit('device:reconnecting', data);
  pushLog('RECONNECTING', data.ip, `Auto-reconnect scheduled for ${data.ip} (delay: ${data.delayMs}ms)`, 'warn', { delayMs: data.delayMs });
  io.emit('connection_log', connectionLogBuffer[0]);
});

deviceManager.on('device_status', (data) => io.emit('device_status', data));

// Heartbeat: throttle browser updates to 30s per device (TCP pings every 10s)
deviceManager.on('heartbeat', (data) => {
  const now = Date.now();
  const last = lastHeartbeatBroadcast.get(data.ip) ?? 0;
  if (now - last >= HEARTBEAT_BROADCAST_THROTTLE_MS) {
    lastHeartbeatBroadcast.set(data.ip, now);
    io.emit('heartbeat', data);
    pushLog('HEARTBEAT', data.ip, `Heartbeat OK — latency ${data.latency_ms ?? '?'}ms`, 'info', { latency_ms: data.latency_ms });
    io.emit('connection_log', connectionLogBuffer[0]);
  }
});
deviceManager.on('unknown_fingerprint', (data) => io.emit('unknown_fingerprint', data));

// Enrollment lifecycle
deviceManager.on('enrollment_started', (data) => io.emit('enrollment_started', data));
deviceManager.on('enrollment_progress', (data) => io.emit('enrollment_progress', data));
deviceManager.on('enrollment_success', (data) => io.emit('enrollment_success', data));
deviceManager.on('enrollment_failed', (data) => io.emit('enrollment_failed', data));

// ── API Telemetry Status endpoint ──────────────────────────────────────────────
app.get('/api/status', async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const localIp =
      Object.values(os.networkInterfaces())
        .flat()
        .find((n) => n && n.family === 'IPv4' && !n.internal)?.address || '127.0.0.1';

    const connectedDevices = deviceCache.getAll();
    const onlineCount = connectedDevices.filter((d) => d.status === 'ONLINE').length;

    res.json({
      running: true,
      service: 'JRM Zero-Latency Biometric TCP Connector',
      version: '2.0.0-production',
      architecture: 'Persistent TCP + Event Driven + RAM Cache',
      machineName: os.hostname(),
      nodeVersion: process.version,
      localIp,
      listeningPort: PORT,
      tcpConnectedCount: onlineCount,
      totalTrackedDevices: connectedDevices.length,
      devices: connectedDevices,
      employeeCacheSize: employeeCache.size(),
      inMemoryQueueSize: eventQueue.size(),
      wsClients: wsClientCount,
      memoryMB: Math.round(memUsage.rss / 1024 / 1024),
      memoryTotalMB: Math.round(os.totalmem() / 1024 / 1024),
      cpuPercent: Math.round(os.loadavg()[0] * 10),
      uptime: Math.round(process.uptime()),
      lastHeartbeat: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ running: true, error: err?.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Zero-Latency TCP Connector Engine',
    uptime: process.uptime(),
    queueSize: eventQueue.size(),
    employeeCacheKeys: employeeCache.size(),
    devicesOnline: deviceCache.getAll().filter((d) => d.status === 'ONLINE').length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/logs', (req, res) => {
  // Structured JSON log endpoint — returns the in-memory connection log ring buffer
  // Also prepends a live system status entry at position 0
  const systemEntry: ConnectionLogEntry = {
    id: 0,
    time: new Date().toISOString(),
    event: 'SYSTEM',
    ip: 'connector',
    message: `Connector v2.0.0 active on :${PORT} | Employee cache: ${employeeCache.size()} | Queue: ${eventQueue.size()}`,
    level: 'info',
  };
  res.json({ logs: [systemEntry, ...connectionLogBuffer] });
});

// Routes
app.use('/devices', deviceRoutes);
app.use('/api/device', newDeviceRoutes);
app.use('/attendance', attendanceRoutes);

io.on('connection', (socket) => {
  wsClientCount++;
  console.log(`🔌 Client connected to Socket.IO [${socket.id}]`);

  // State restore: send current device states immediately so new clients
  // don't have to wait for the next heartbeat or event to see device status.
  const currentDevices = deviceCache.getAll();
  if (currentDevices.length > 0) {
    socket.emit('devices:state', currentDevices);
    // Also emit individual device:online events for each online device
    for (const d of currentDevices) {
      if (d.status === 'ONLINE') {
        socket.emit('device:online', { ip: d.ip, port: d.port, name: d.name, latency_ms: d.latency_ms, lastHeartbeat: d.lastHeartbeat });
      }
    }
  }
  // Replay last attendance event so dashboard shows last scan immediately
  if (lastAttendanceEvent) {
    socket.emit('attendance:new', lastAttendanceEvent);
  }

  socket.on('disconnect', () => {
    wsClientCount = Math.max(0, wsClientCount - 1);
    console.log(`🔌 Client disconnected from Socket.IO [${socket.id}]`);
  });
});

process.on('uncaughtException', (err) => {
  console.warn('[Connector] Global uncaughtException (handled):', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('subarray') || msg.includes('TIMEOUT') || msg.includes('ZKError')) {
    // Non-fatal ZK socket timeout/reset warning
    return;
  }
  console.warn('[Connector] Global unhandledRejection:', msg);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Zero-Latency TCP Biometric Connector running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO Event Engine active on port ${PORT}`);
});
