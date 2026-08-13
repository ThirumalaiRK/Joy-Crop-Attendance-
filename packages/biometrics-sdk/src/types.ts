export interface BiometricUser {
  uid: string;
  userId: string;
  name: string;
  password?: string;
  role: number;
  cardno?: number;
}

export interface AttendanceLog {
  userSn: string; // The user ID on the device
  deviceUserId: string; // user ID on the device mapped to string
  recordTime: string; // ISO date string or Date object
  ip: string;
}

export type ConnectionState = 'ONLINE' | 'CONNECTING' | 'SYNCING' | 'OFFLINE' | 'ERROR' | 'RECONNECTING';

export interface DeviceCapabilities {
  live_fingerprint_image: boolean;
  fingerprint_template: boolean;
  verification_event: boolean;
  face_recognition: boolean;
  protocol: string;
  image_unavailability_reason: string;
}

export interface DeviceInfo {
  ip: string;
  port: number;
  sn: string;
  deviceName: string;
  mac: string;
  firmware: string;
  platform: string;
  userCount?: number;
  templateCount?: number;
  memoryUsage?: string;
  latency_ms?: number;
  connectionState?: ConnectionState;
  deviceTime?: string;
  serverTime?: string;
  clockDriftSeconds?: number;
  capabilities?: DeviceCapabilities;
}

export interface IBiometricDevice {
  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  getUsers(): Promise<BiometricUser[]>;
  getAttendanceLogs(): Promise<AttendanceLog[]>;
  clearAttendanceLogs(): Promise<boolean>;
  clearUsers(): Promise<boolean>;
  executeCmd(command: number, data?: string): Promise<boolean>;
  startEnrollment(userId: string, fingerIndex?: number): Promise<boolean>;
  enableRealTimeLogs(): Promise<boolean>;
  setUser(uid: number, userid: string, name: string, password?: string, role?: number, cardno?: number): Promise<boolean>;
  deleteUser(uid: number | string): Promise<boolean>;
  syncTime(): Promise<boolean>;
  getUserTemplates(uid: number): Promise<any[]>;
  getDeviceInfo(): Promise<DeviceInfo>;
  getCapabilities(): DeviceCapabilities;
  ping?(): Promise<number>;
}



