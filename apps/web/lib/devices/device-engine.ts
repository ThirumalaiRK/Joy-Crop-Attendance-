import { checkMantraRDStatus } from '../biometrics/mantra-rd';

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'MANTRA_FINGERPRINT' | 'FACE_SCANNER' | 'QR_TERMINAL' | 'MOBILE_GPS';
  serialNumber: string;
  location: string;
  ipAddress?: string;
  status: 'ONLINE' | 'OFFLINE' | 'WARNING';
  latencyMs: number;
  lastPingAt: string;
  firmwareVersion: string;
  rdServiceStatus: string;
}

/**
 * Ping Mantra MFS110 L1 Device & Diagnostics
 */
export async function getMantraDeviceHealth(): Promise<DeviceInfo> {
  const start = Date.now();
  try {
    const rdRes = await checkMantraRDStatus();
    const latency = Date.now() - start;

    if (rdRes.connected) {
      return {
        id: 'DEV-MANTRA-01',
        name: 'Mantra MFS110 L1 Optical Scanner',
        type: 'MANTRA_FINGERPRINT',
        serialNumber: 'MN-94827104',
        location: 'Coimbatore HQ Main Entrance Gate 1',
        ipAddress: '127.0.0.1:11100',
        status: 'ONLINE',
        latencyMs: latency,
        lastPingAt: new Date().toISOString(),
        firmwareVersion: 'v2.1.0-L1',
        rdServiceStatus: 'READY (200 OK)',
      };
    }
  } catch (e) {}

  return {
    id: 'DEV-MANTRA-01',
    name: 'Mantra MFS110 L1 Optical Scanner',
    type: 'MANTRA_FINGERPRINT',
    serialNumber: 'MN-94827104',
    location: 'Coimbatore HQ Main Entrance Gate 1',
    ipAddress: '127.0.0.1:11100',
    status: 'OFFLINE',
    latencyMs: 0,
    lastPingAt: new Date().toISOString(),
    firmwareVersion: 'v2.1.0-L1',
    rdServiceStatus: 'SERVICE NOT DETECTED (Start Mantra RD Service)',
  };
}
