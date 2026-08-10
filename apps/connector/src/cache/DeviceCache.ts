import { ConnectionState } from '@hrms/biometrics-sdk';

export interface DeviceRAMState {
  ip: string;
  port: number;
  sn?: string;
  name: string;
  model?: string;
  firmware?: string;
  mac?: string;
  status: ConnectionState;
  latency_ms: number;
  userCount: number;
  templateCount: number;
  memoryUsage?: string;
  lastHeartbeat: string;
}

export class DeviceCache {
  private static instance: DeviceCache;
  private cache: Map<string, DeviceRAMState> = new Map();

  private constructor() {}

  public static getInstance(): DeviceCache {
    if (!DeviceCache.instance) {
      DeviceCache.instance = new DeviceCache();
    }
    return DeviceCache.instance;
  }

  public clear(): void {
    this.cache.clear();
  }

  public get(ip: string): DeviceRAMState | undefined {
    return this.cache.get(ip);
  }

  public set(state: DeviceRAMState): void {
    this.cache.set(state.ip, state);
  }

  public updateStatus(ip: string, status: ConnectionState, latency_ms = 0): void {
    const existing = this.cache.get(ip);
    if (existing) {
      existing.status = status;
      existing.latency_ms = latency_ms;
      existing.lastHeartbeat = new Date().toISOString();
      this.cache.set(ip, existing);
    } else {
      this.cache.set(ip, {
        ip,
        port: 4370,
        name: `ZKTeco (${ip})`,
        status,
        latency_ms,
        userCount: 0,
        templateCount: 0,
        lastHeartbeat: new Date().toISOString(),
      });
    }
  }

  public getAll(): DeviceRAMState[] {
    return Array.from(this.cache.values());
  }

  public size(): number {
    return this.cache.size;
  }
}

export const deviceCache = DeviceCache.getInstance();
