import { ZKTecoDevice, ConnectionState } from '@hrms/biometrics-sdk';
import { EventEmitter } from 'events';
import { AppDataSource, DeviceCache as SQLiteDeviceCache } from './db';
import { supabase } from './supabase';
import { deviceCache } from './cache/DeviceCache';
import { eventQueue } from './queue/EventQueue';

export class DeviceManager extends EventEmitter {
  private devices: Map<string, ZKTecoDevice> = new Map();
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private reconnectDelays: Map<string, number> = new Map(); // ip -> delay in ms
  private lastDbWriteTime: Map<string, number> = new Map(); // ip -> last Supabase write epoch ms
  private isAutoConnecting = false;
  private static readonly DB_WRITE_THROTTLE_MS = 30_000; // Write to Supabase max once per 30s

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

    // Cancel existing reconnect timer if triggered manually
    this.stopReconnectTimer(ip);

    const device = new ZKTecoDevice(ip, port);
    deviceCache.updateStatus(ip, 'CONNECTING');
    this.emit('device:connecting', { ip, port });

    console.log(`🔌 [DeviceManager] Initiating persistent TCP socket to ${ip}:${port}...`);
    const isConnected = await device.connect();

    if (isConnected) {
      console.log(`✅ [DeviceManager] TCP Socket ONLINE at ${ip}:${port}`);
      this.devices.set(ip, device);
      this.reconnectDelays.set(ip, 1000); // Reset backoff delay on clean connection

      let cachedDeviceName = `Identix Terminal (${ip})`;
      let info: any = null;

      try {
        info = await device.getDeviceInfo();
        cachedDeviceName = info.deviceName || cachedDeviceName;
        deviceCache.set({
          ip,
          port,
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

      // Enable Real-Time TCP Push listener
      try {
        await device.enableRealTimeLogs();
      } catch (err: any) {
        console.warn(`⚠️ [DeviceManager] realTimeLogs warning for ${ip}:`, err?.message);
      }

      // Handle TCP attendance punch packets instantly (<5ms handoff to Queue)
      device.on('attendance_received', (data: any) => {
        if (data && data.userId && data.userId !== '0' && data.userId !== 0) {
          eventQueue.push({
            device_ip: ip,
            device_user_id: data.userId,
            event_time: data.recordTime || new Date().toISOString(),
            verification_type: data.verifyMode ? String(data.verifyMode) : 'fingerprint',
            device_name: cachedDeviceName,
          });
        } else {
          // Unauthorized / Unknown fingerprint scan attempt
          this.emit('unknown_fingerprint', { ip, ...data, attemptTime: new Date().toISOString() });
          this.logUnknownFingerprint(ip, cachedDeviceName, data?.verifyMode);
        }
      });

      // Socket state changes
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

      // Automatically sync hardware clock to exact Indian Standard Time (IST)
      device.syncTime().then((synced) => {
        if (synced) console.log(`⏱️ [DeviceManager] Automatically synchronized ${ip} hardware clock to IST.`);
      }).catch(() => {});

      // Start 10-second Heartbeat loop
      this.startHeartbeat(ip, port);
      return true;
    } else {
      console.error(`❌ [DeviceManager] TCP Socket connection failed for ${ip}:${port}`);
      deviceCache.updateStatus(ip, 'OFFLINE');
      this.updateDeviceStatusDB(ip, port, null, 'offline').catch(() => {});
      this.emit('device_disconnected', { ip });
      this.emit('device:offline', { ip });

      // Trigger exponential backoff auto-reconnect
      this.scheduleReconnect(ip, port);
      return false;
    }
  }

  /** Exponential Backoff Auto-Reconnect Strategy (1s -> 2s -> 5s -> 10s -> 30s) */
  private scheduleReconnect(ip: string, port: number) {
    if (this.reconnectTimers.has(ip)) return; // Timer already active

    const currentDelay = this.reconnectDelays.get(ip) || 1000;
    const nextDelay = Math.min(currentDelay * 2, 30000); // Max 30s backoff
    this.reconnectDelays.set(ip, nextDelay);

    deviceCache.updateStatus(ip, 'RECONNECTING');
    this.emit('device:reconnecting', { ip, port, delayMs: currentDelay });
    console.log(`🔄 [DeviceManager] Scheduling TCP auto-reconnect for ${ip} in ${currentDelay / 1000}s...`);

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

  private startHeartbeat(ip: string, port: number) {
    this.stopHeartbeat(ip);
    const interval = setInterval(async () => {
      const device = this.devices.get(ip);
      if (!device || device.connectionState !== 'ONLINE') return;

      try {
        const latency = await device.ping();

        // Always update in-memory RAM cache (cheap, instant)
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

        // Throttle Supabase DB writes to max once per 30s
        const lastWrite = this.lastDbWriteTime.get(ip) ?? 0;
        const nowMs = Date.now();
        if (nowMs - lastWrite >= DeviceManager.DB_WRITE_THROTTLE_MS) {
          this.lastDbWriteTime.set(ip, nowMs);
          // Fetch full device info only when writing to DB
          const rawInfo = await device.getDeviceInfo().catch(() => null) as any;
          const cached = deviceCache.get(ip);
          // Update RAM cache, falling back to existing cached values for any missing field
          deviceCache.set({
            ip, port,
            sn: rawInfo?.sn ?? cached?.sn,
            name: rawInfo?.deviceName ?? cached?.name ?? `Identix Terminal (${ip})`,
            model: rawInfo?.platform ?? cached?.model,
            firmware: rawInfo?.firmware ?? cached?.firmware,
            mac: rawInfo?.mac ?? cached?.mac,
            status: 'ONLINE',
            latency_ms: latency,
            userCount: rawInfo?.userCount ?? cached?.userCount ?? 0,
            templateCount: rawInfo?.templateCount ?? cached?.templateCount ?? 0,
            memoryUsage: rawInfo?.memoryUsage ?? cached?.memoryUsage,
            lastHeartbeat: now,
          });
          this.updateDeviceStatusDB(ip, port, rawInfo, 'online').catch(() => {});
        }


        // Always emit heartbeat event (index.ts throttles what gets sent to browsers)
        this.emit('heartbeat', { ip, latency_ms: latency, lastHeartbeat: now });
      } catch (err: any) {
        console.warn(`⚠️ [DeviceManager] Heartbeat ping timeout for ${ip}`);
        deviceCache.updateStatus(ip, 'ERROR');
        this.scheduleReconnect(ip, port);
      }
    }, 10_000); // Ping every 10s for accurate latency; DB writes throttled to 30s

    this.heartbeatIntervals.set(ip, interval);
  }

  private stopHeartbeat(ip: string) {
    const interval = this.heartbeatIntervals.get(ip);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(ip);
    }
  }

  getConnectedDevice(ip: string): ZKTecoDevice | null {
    return this.devices.get(ip) || null;
  }

  getDevice(ip: string): ZKTecoDevice | undefined {
    return this.devices.get(ip);
  }

  private async logUnknownFingerprint(ip: string, deviceName: string, verifyMode?: any) {
    try {
      await supabase.from('unknown_fingerprint_logs').insert([{
        device_ip: ip,
        device_name: deviceName,
        verify_mode: verifyMode || 'fingerprint',
        attempt_time: new Date().toISOString(),
      }]);
    } catch (_) {}
  }

  private async updateDeviceStatusDB(ip: string, port: number, info: any, status: 'online' | 'offline') {
    try {
      // 1. Save to local SQLite cache
      const deviceRepo = AppDataSource.getRepository(SQLiteDeviceCache);
      let cached = await deviceRepo.findOne({ where: { ip } });
      if (!cached) {
        cached = new SQLiteDeviceCache();
        cached.ip = ip;
      }
      cached.port = port;
      if (info) {
        cached.sn = info.sn;
        cached.deviceName = info.deviceName || 'ZKTeco Device';
      }
      cached.online = status === 'online';
      await deviceRepo.save(cached);

      // 2. Save to Supabase devices & device_status tables
      await supabase.from('devices').upsert({
        ip_address: ip,
        port: port,
        serial_number: info?.sn || undefined,
        name: cached.deviceName,
        status: status,
        model: info?.platform || undefined,
        mac_address: info?.mac || undefined,
        firmware_version: info?.firmware || undefined,
        user_count: info?.userCount || 0,
        template_count: info?.templateCount || 0,
        memory_usage: info?.memoryUsage || undefined,
        latency_ms: info?.latency_ms || 0,
        last_sync: new Date().toISOString(),
      }, { onConflict: 'ip_address' });

      await supabase.from('device_status').upsert({
        device_ip: ip,
        device_name: cached.deviceName,
        status: status,
        latency_ms: info?.latency_ms || 0,
        firmware: info?.firmware || 'v1.0',
        user_count: info?.userCount || 0,
        template_count: info?.templateCount || 0,
        memory_usage: info?.memoryUsage || '0MB / 128MB',
        last_ping: new Date().toISOString(),
      }, { onConflict: 'device_ip' });
    } catch (_) {}
  }

  getStats() {
    return {
      connectedDevices: this.devices.size,
      connectedIps: Array.from(this.devices.keys()),
      ramCacheDevices: deviceCache.getAll(),
    };
  }

  /** Auto-connect to all devices stored in Supabase on connector startup */
  async autoConnectFromSupabase(): Promise<void> {
    if (this.isAutoConnecting) return;
    this.isAutoConnecting = true;

    try {
      const { data, error } = await supabase
        .from('devices')
        .select('ip_address, port')
        .neq('ip_address', null);

      if (error || !data || data.length === 0) return;

      console.log(`🔌 [DeviceManager] Auto-connecting to ${data.length} device(s) registered in Supabase...`);
      for (const row of data) {
        const ip = row.ip_address as string;
        const port = (row.port as number) || 4370;
        if (!this.devices.has(ip)) {
          this.connectToDevice(ip, port).catch((err) =>
            console.warn(`⚠️ [DeviceManager] Auto-connect failed for ${ip}:`, err?.message)
          );
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [DeviceManager] autoConnectFromSupabase error:', err?.message);
    } finally {
      this.isAutoConnecting = false;
    }
  }

  /** Download raw attendance logs from device */
  async getAttendanceLogs(ip: string): Promise<any[]> {
    const device = this.devices.get(ip);
    if (!device) return [];
    try {
      return await device.getAttendanceLogs();
    } catch (err: any) {
      console.error(`❌ [DeviceManager] Error fetching attendance logs from ${ip}:`, err?.message);
      return [];
    }
  }

  /** Clear attendance logs on hardware terminal */
  async clearAttendanceLogs(ip: string): Promise<boolean> {
    const device = this.devices.get(ip);
    if (!device) return false;
    try {
      return await device.clearAttendanceLogs();
    } catch (err: any) {
      console.error(`❌ [DeviceManager] Error clearing attendance logs on ${ip}:`, err?.message);
      return false;
    }
  }
}

export const deviceManager = new DeviceManager();
