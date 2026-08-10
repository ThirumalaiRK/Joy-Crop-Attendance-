export type AttendanceMethod = 'face' | 'fingerprint' | 'aadhaar' | 'qr' | 'gps' | 'selfie_gps' | 'manual';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'wfh' | 'on_leave' | 'half_day' | 'overtime';

export type DeviceStatus = 'online' | 'offline' | 'syncing' | 'warning' | 'maintenance';

export type ShiftType = 'morning' | 'evening' | 'night' | 'flexible' | 'split' | 'rotating';

export interface FingerprintTemplate {
  templateUuid: string;
  employeeUuid: string;
  employeeCode: string;
  deviceId: string;
  fingerPosition: string;
  fingerTemplate: string;
  qualityScore: number;
  createdAt: string;
}

export interface EnrollmentSession {
  sessionUuid: string;
  employeeUuid: string;
  employeeCode: string;
  deviceId: string;
  status: 'in_progress' | 'completed' | 'cancelled' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface Employee {
  id: string;
  employeeUuid?: string;
  employeeCode?: string;
  companyId?: string;
  name: string;
  fullName?: string;
  avatar: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  manager: string;
  employmentStatus: 'Full Time' | 'Contract' | 'Remote';
  status?: 'Active' | 'Inactive' | 'Pending';
  shift: string;
  attendanceScore: number; // 0 - 100
  productivityScore: number; // 0 - 100
  currentStreak: number;
  avgArrival: string; // e.g. "09:04 AM"
  avgExit: string; // e.g. "06:15 PM"
  deskLocation?: {
    floor: string;
    zone: string;
    deskNo: string;
    x: number; // percentage
    y: number; // percentage
  };
  biometricStatus: {
    fingerprint: boolean;
    face: boolean;
    aadhaar: boolean;
    qr: boolean;
    gps: boolean;
    card?: boolean;
    isEnrolled?: boolean;
  };
  isEnrolled?: boolean;
  enrolledFingerprintBase64?: string;
  fingerprintTemplates?: FingerprintTemplate[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  checkInTime: string;
  checkOutTime?: string;
  date: string;
  method: AttendanceMethod;
  status: AttendanceStatus;
  deviceName: string;
  confidenceScore?: number; // e.g. 99.4
  location?: string;
  verified: boolean;
  lateMinutes?: number;
  overtimeHours?: number;
  timeline?: {
    checkIn: string;
    breakStart?: string;
    breakEnd?: string;
    lunchStart?: string;
    lunchEnd?: string;
    meetingStart?: string;
    meetingEnd?: string;
    checkOut?: string;
  };
}

export interface BiometricDevice {
  id: string;
  name: string;
  model: string;
  ipAddress: string;
  port?: number;
  macAddress?: string;
  serialNumber?: string;
  location: string;
  status: DeviceStatus;
  batteryLevel: number;
  temperature: number;
  firmwareVersion: string;
  lastSync: string;
  signalStrength: number;
  registeredUsers: number;
  maxUserCapacity: number;
  todayLogsCount: number;
  faceCapacity: number;
  fingerCapacity: number;
  cloudSyncStatus: 'Healthy' | 'Pending' | 'Error';
  errorCount: number;
  // New telemetry fields
  templateCount?: number;
  memoryUsage?: string;
  latencyMs?: number;
  platform?: string;
  networkType?: 'DHCP' | 'Static' | 'Unknown';
  lastHeartbeat?: string;
  deviceTime?: string;
}

export interface ShiftRule {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  autoOvertimeAfterHours: number;
  activeEmployees: number;
}

export interface VisitorRecord {
  id: string;
  visitorName: string;
  visitorPhone: string;
  company: string;
  hostEmployeeName: string;
  purpose: string;
  passCode: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'Expected' | 'Checked In' | 'Checked Out' | 'Expired';
  badgeIssued: boolean;
}

export interface FloorZone {
  id: string;
  name: string;
  capacity: number;
  presentCount: number;
  employees: {
    id: string;
    name: string;
    avatar: string;
    deskNo: string;
    status: 'present' | 'break' | 'away';
    x: number;
    y: number;
  }[];
}

export interface AIInsight {
  id: string;
  type: 'prediction' | 'anomaly' | 'buddy_punch' | 'device' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  ipAddress: string;
  status: 'Success' | 'Warning' | 'Blocked';
  details: string;
}
