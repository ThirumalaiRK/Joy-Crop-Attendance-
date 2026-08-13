import { ZKTecoDevice, ConnectionState } from '@hrms/biometrics-sdk';
import { EventEmitter } from 'events';
import { AppDataSource, DeviceCache as SQLiteDeviceCache } from './db';
import { supabase } from './supabase';
import { deviceCache } from './cache/DeviceCache';
import { eventQueue } from './queue/EventQueue';
import { DateTime } from 'luxon';

const APP_TIMEZONE = 'Asia/Kolkata';

/**
 * Maps ZKTeco verifyMode integer to a human-readable verification type.
 * These are the documented ZKTeco verification mode codes.
 */
function resolveVerificationType(verifyMode: any): string {
  const mode = parseInt(String(verifyMode ?? ''), 10);
  if (isNaN(mode)) return 'FINGERPRINT';
  switch (mode) {
    case 0:  return 'FINGERPRINT';
    case 1:  return 'FINGERPRINT';
    case 2:  return 'FINGERPRINT';
    case 3:  return 'CARD';
    case 4:  return 'CARD';
    case 11: return 'CARD';
    case 15: return 'PASSWORD';
    case 20: return 'FACE';
    default: return 'FINGERPRINT';
  }
}

/**
 * Validates that a machine timestamp string is a real device timestamp.
 * Rejects empty, zero, or clearly wrong timestamps.
 */
function isValidMachineTimestamp(ts: any): boolean {
  if (!ts) return false;
  const str = String(ts).trim();
  if (!str || str === '0' || str === 'null' || str === 'undefined') return false;
  // Accept "YYYY-MM-DD HH:mm:ss" or ISO-8601
  if (/^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/.test(str)) return true;
  return false;
}

export class DeviceManager extends EventEmitter {
  private devices: Map<string, ZKTecoDevice> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectDelays: Map<string, number> = new Map();
  private lastDbWriteTime: Map<string, number> = new Map();
  private isAutoConnecting = false;
  private static readonly DB_WRITE_THROTTLE_MS = 30_000;

  constructor() {
    super();
  }

  /**
   * Primary entry point: Connect to device over persistent TCP socket
   */
  async connectToDevice(ip: string, port = 4370): Promise<boolean> {
    if (this.devices.has(ip)) {
      const existing = this.devices.get(ip);
      if (existing && existing.connectionState === 'ONLINE') {
        return true;
      }
    }

    this.stopReconnectTimer(ip);

    const device = new ZKTecoDevice(ip, port);
    deviceCache.updateStatus(ip, 'CONNECTING');
    this.emit('device:connecting', { ip, port });

    console.log(`🔌 [DeviceManager] Initiating persistent TCP socket to ${ip}:${port}...`);
    const isConnected = await device.connect();

    if (isConnected) {
      console.log(`✅ [DeviceManager] TCP Socket ONLINE at ${ip}:${port}`);
      this.devices.set(ip, device);
      this.reconnectDelays.set(ip, 1000);

      let cachedDeviceName = `Identix Terminal (${ip})`;
      let info: any = null;

      try {
        info = await device.getDeviceInfo();
        cachedDeviceName = info.deviceName || cachedDeviceName;
        deviceCache.set({
          ip, port,
          sn: info.sn,
          name: cachedDeviceName,
          model: info.platform,
          firmware: info.firmware,
          mac: info.mac,
          status: 'ONLINE',
          latency_ms: info.latency_ms || 0,
          userCount: info.userCount || 0,
          templateCount: info.templateCount || 0,
          memoryUsage: info.memoryUsage,
          lastHeartbeat: new Date().toISOString(),
        });
      } catch (_) {
        deviceCache.updateStatus(ip, 'ONLINE');
      }

      try {
        await device.enableRealTimeLogs();
      } catch (err: any) {
        console.warn(`⚠️ [DeviceManager] realTimeLogs warning for ${ip}:`, err?.message);
      }

      // ─────────────────────────────────────────────────────────────────────
      // CRITICAL: Handle real-time TCP punch packets.
      //
      // The machine sends data.recordTime as a local timestamp string in IST
      // (e.g. "2026-08-13 09:20:59"). We MUST preserve this exactly.
      //
      // received_at_utc is the agent-side receipt time — a SEPARATE field.
      // These two must NEVER be confused.
      // ─────────────────────────────────────────────────────────────────────
      device.on('attendance_received', (data: any) => {
        const userId = data?.userId ?? data?.uid ?? data?.deviceUserId;
        const userIdStr = String(userId ?? '').trim();

        if (!userIdStr || userIdStr === '0' || userIdStr === '0' ) {
          this.emit('unknown_fingerprint', { ip, ...data, attemptTime: new Date().toISOString() });
          this.logUnknownFingerprint(ip, cachedDeviceName, data?.verifyMode);
          return;
        }

        // ── Validate machine timestamp ─────────────────────────────────────
        const rawMachineTs = data?.recordTime ?? data?.timestamp ?? data?.time;

        if (!isValidMachineTimestamp(rawMachineTs)) {
          console.warn(
            `⚠️ [DeviceManager] Punch from ${ip} user=${userIdStr} has no valid machine timestamp.` +
            ` Packet dropped. Raw data: ${JSON.stringify(data)}`
          );
          return; // NEVER fabricate a punch timestamp from server time
        }

        const machineTimestamp = String(rawMachineTs).trim();
        const receivedAtUtc = new Date().toISOString(); // agent receipt time — separate concept

        eventQueue.push({
          device_ip:         ip,
          device_user_id:    userIdStr,
          machine_timestamp: machineTimestamp,        // exact device string (IST)
          received_at_utc:   receivedAtUtc,           // when WE got it — NOT the punch time
          machine_log_id:    data?.logId ? String(data.logId) : undefined,
          verification_type: resolveVerificationType(data?.verifyMode),
          device_name:       cachedDeviceName,
          raw_payload:       JSON.stringify(data),
        });
      });

      device.on('state_changed', (evt: any) => {
        deviceCache.updateStatus(ip, evt.state);
        this.emit('device_status', { ip, ...evt });
        if (evt.state === 'ERROR' || evt.state === 'OFFLINE') {
          this.scheduleReconnect(ip, port);
        }
      });

      this.updateDeviceStatusDB(ip, port, info, 'online').catch(() => {});
      this.emit('device_connected', { ip, port, name: cachedDeviceName });
      this.emit('device:online', { ip, port, name: cachedDeviceName });

      // Sync hardware clock to IST
      device.syncTime().then((synced) => {
        if (synced) console.log(`⏱️ [DeviceManager] Synchronized ${ip} hardware clock to IST.`);
      }).catch(() => {});

      this.startHeartbeat(ip, port);
      return true;
    } else {
      console.error(`❌ [DeviceManager] TCP Socket connection failed for ${ip}:${port}`);
      deviceCache.updateStatus(ip, 'OFFLINE');
      this.updateDeviceStatusDB(ip, port, null, 'offline').catch(() => {});
      this.emit('device_disconnected', { ip });
      this.emit('device:offline', { ip });
      this.scheduleReconnect(ip, port);
      return false;
    }
  }

  /** Exponential Backoff Auto-Reconnect (1s → 2s → 5s → 15s → 30s → 60s) */
  private scheduleReconnect(ip: string, port: number) {
    if (this.reconnectTimers.has(ip)) return;

    const currentDelay = this.reconnectDelays.get(ip) || 1000;
    // Steps: 1s, 2s, 4s, 8s, 16s, 30s, 60s (capped at 60s)
    const nextDelay = Math.min(currentDelay * 2, 60000);
    this.reconnectDelays.set(ip, nextDelay);

    deviceCache.updateStatus(ip, 'RECONNECTING');
    this.emit('device:reconnecting', { ip, port, delayMs: currentDelay });
    console.log(`🔄 [DeviceManager] Auto-reconnect for ${ip} in ${currentDelay / 1000}s (next: ${nextDelay / 1000}s)...`);

    const timer = setTimeout(async () => {
      this.stopReconnectTimer(ip);
      await this.connectToDevice(ip, port);
    }, currentDelay);

    this.reconnectTimers.set(ip, timer);
  }

  private stopReconnectTimer(ip: string) {
    const timer = this.reconnectTimers.get(ip);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(ip);
    }
  }

  async disconnectDevice(ip: string): Promise<boolean> {
    this.stopHeartbeat(ip);
    this.stopReconnectTimer(ip);
    this.reconnectDelays.delete(ip);

    const device = this.devices.get(ip);
    if (!device) return true;

    const result = await device.disconnect();
    this.devices.delete(ip);

    deviceCache.updateStatus(ip, 'OFFLINE');
    this.updateDeviceStatusDB(ip, 4370, null, 'offline').catch(() => {});
    this.emit('device_disconnected', { ip });
    this.emit('device:offline', { ip });
    return result;
  }

  private missedPings: Map<string, number> = new Map();

  private startHeartbeat(ip: string, port: number) {
    this.stopHeartbeat(ip);
    this.missedPings.set(ip, 0);

    const interval = setInterval(async () => {
      const device = this.devices.get(ip);
      if (!device || device.connectionState !== 'ONLINE') return;

      try {
        const latency = await device.ping();
        this.missedPings.set(ip, 0);

        const now = new Date().toISOString();
        deviceCache.set({
          ip, port,
          sn: deviceCache.get(ip)?.sn,
          name: deviceCache.get(ip)?.name || `Identix Terminal (${ip})`,
          model: deviceCache.get(ip)?.model,
          firmware: deviceCache.get(ip)?.firmware,
          mac: deviceCache.get(ip)?.mac,
          status: 'ONLINE',
          latency_ms: latency,
          userCount: deviceCache.get(ip)?.userCount || 0,
          templateCount: deviceCache.get(ip)?.templateCount || 0,
          memoryUsage: deviceCache.get(ip)?.memoryUsage,
          lastHeartbeat: now,
        });

        this.emit('heartbeat', { ip, port, latency_ms: latency, timestamp: now });

        // Throttle DB writes: max once per 30s
        const lastWrite = this.lastDbWriteTime.get(ip) || 0;
        if (Date.now() - lastWrite >= DeviceManager.DB_WRITE_THROTTLE_MS) {
          this.lastDbWriteTime.set(ip, Date.now());
          this.updateDeviceStatusDB(ip, port, null, 'online', latency).catch(() => {});
        }
      } catch (err: any) {
        const missed = (this.missedPings.get(ip) || 0) + 1;
        this.missedPings.set(ip, missed);
        console.warn(`⚠️ [DeviceManager] Heartbeat miss #${missed} for ${ip}: ${err?.message}`);

        if (missed >= 3) {
          console.error(`❌ [DeviceManager] ${ip} missed ${missed} heartbeats — marking OFFLINE`);
          deviceCache.updateStatus(ip, 'OFFLINE');
          this.emit('device:offline', { ip });
          this.stopHeartbeat(ip);
          this.devices.delete(ip);
          this.scheduleReconnect(ip, port);
        }
      }
    }, 10_000); // 10-second heartbeat

    this.heartbeatIntervals.set(ip, interval);
  }

  private stopHeartbeat(ip: string) {
    const interval = this.heartbeatIntervals.get(ip);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(ip);
    }
  }

  getConnectedDevice(ip: string): ZKTecoDevice | undefined {
    return this.devices.get(ip);
  }

  isDeviceOnline(ip: string): boolean {
    const d = this.devices.get(ip);
    return !!d && d.connectionState === 'ONLINE';
  }

  getAllConnectedIPs(): string[] {
    return [...this.devices.keys()];
  }

  async autoConnectFromSupabase() {
    if (this.isAutoConnecting) return;
    this.isAutoConnecting = true;
    try {
      const { data: deviceRows } = await supabase.from('devices').select('ip_address, port');
      if (!deviceRows || deviceRows.length === 0) {
        console.log('[DeviceManager] No devices registered in Supabase to auto-connect.');
        return;
      }
      for (const row of deviceRows) {
        if (row.ip_address) {
          console.log(`[DeviceManager] Auto-connecting to ${row.ip_address}:${row.port || 4370}...`);
          await this.connectToDevice(row.ip_address, row.port || 4370);
        }
      }
    } catch (err: any) {
      console.error('[DeviceManager] autoConnectFromSupabase error:', err?.message);
    } finally {
      this.isAutoConnecting = false;
    }
  }

  getDevice(ip: string): ZKTecoDevice | null {
    return this.devices.get(ip) || null;
  }

  async getAttendanceLogs(ip: string): Promise<any[]> {
    const device = this.devices.get(ip);
    if (!device) return [];
    return await device.getAttendanceLogs();
  }

  async clearAttendanceLogs(ip: string): Promise<boolean> {
    const device = this.devices.get(ip);
    if (!device) return false;
    return await device.clearAttendanceLogs();
  }

  getStats() {
    const all = deviceCache.getAll();
    const connectedIps = this.getAllConnectedIPs();
    return {
      total: all.length,
      online: all.filter((d) => d.status === 'ONLINE').length,
      offline: all.filter((d) => d.status === 'OFFLINE').length,
      reconnecting: all.filter((d) => d.status === 'RECONNECTING').length,
      connectedDevices: connectedIps.length,
      connectedIps,
    };
  }

  private async updateDeviceStatusDB(
    ip: string, port: number, info: any, status: string, latency?: number
  ) {
    try {
      await supabase.from('device_status').upsert({
        device_ip: ip,
        device_name: info?.deviceName || deviceCache.get(ip)?.name || `Identix Terminal (${ip})`,
        status,
        latency_ms: latency ?? 0,
        firmware: info?.firmware || deviceCache.get(ip)?.firmware,
        user_count: info?.userCount || deviceCache.get(ip)?.userCount || 0,
        template_count: info?.templateCount || deviceCache.get(ip)?.templateCount || 0,
        memory_usage: info?.memoryUsage || deviceCache.get(ip)?.memoryUsage,
        last_ping: new Date().toISOString(),
      }, { onConflict: 'device_ip' });
    } catch (_) {}
  }

  private async logUnknownFingerprint(ip: string, deviceName: string, verifyMode: any) {
    try {
      await supabase.from('attendance_unknown_events').insert([{
        device_ip: ip,
        device_user_id: 'UNKNOWN',
        event_time: new Date().toISOString(),
        verification_type: resolveVerificationType(verifyMode),
        notes: 'Unknown fingerprint — not enrolled in device',
      }]);
    } catch (_) {}
  }
}

export const deviceManager = new DeviceManager();

