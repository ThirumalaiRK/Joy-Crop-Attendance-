/**
 * MockDataGenerator.ts
 *
 * Implements mock contracts but returns empty datasets to ensure only 
 * actual live production database records are used.
 */

export interface MockAttendance {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branch: string;
  shift: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtime: number;
  lateMins: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
  device: string;
  location: string;
  method: string;
}

export interface MockEmployee {
  photo: string | null;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  phone: string;
  joiningDate: string;
  branch: string;
  manager: string;
  biometricStatus: 'REGISTERED' | 'NOT_REGISTERED' | 'FINGERPRINT_ONLY';
  fingerprints: number;
  faces: number;
  cardNumber: string;
  status: 'Active' | 'Inactive';
  shift: string;
  salaryGrade: string;
}

export interface MockDevice {
  name: string;
  ip: string;
  mac: string;
  firmware: string;
  model: string;
  users: number;
  templates: number;
  logs: number;
  cpu: number;
  memory: string;
  temp: number;
  status: 'ONLINE' | 'OFFLINE';
  latency: number;
  packetLoss: number;
  syncStatus: 'SYNCED' | 'OUT_OF_SYNC';
  todayLogs: number;
  todayErrors: number;
}

export interface MockDepartment {
  name: string;
  employeesCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  otHours: number;
  avgHours: number;
  productivity: number;
  attendanceRate: number;
  manager: string;
}

export interface MockBranch {
  name: string;
  employeesCount: number;
  attendanceRate: number;
  deviceHealth: string;
  shiftCoverage: number;
  lateRate: number;
  avgWorkingHours: number;
  payrollReadyRate: number;
}

export interface MockVisitor {
  name: string;
  purpose: string;
  host: string;
  company: string;
  checkIn: string;
  checkOut: string | null;
  photo: string | null;
  durationMins: number;
  badge: string;
  status: 'CHECKED_IN' | 'CHECKED_OUT';
}

export interface MockSecurityEvent {
  eventType: string;
  details: string;
  source: string;
  timestamp: string;
  riskScore: number;
  resolved: boolean;
}

export interface MockApiLog {
  endpoint: string;
  requestsCount: number;
  errorsCount: number;
  avgResponseMs: number;
  queueSize: number;
  retries: number;
  tcpStatus: 'CONNECTED' | 'DISCONNECTED';
  supabaseSyncRate: number;
  realtimeDelayMs: number;
}

export class MockDataGenerator {
  public static getEmployees(): MockEmployee[] {
    return [];
  }

  public static getAttendance(dateRange: { from: Date; to: Date }): MockAttendance[] {
    return [];
  }

  public static getDevices(): MockDevice[] {
    return [];
  }

  public static getDepartments(): MockDepartment[] {
    return [];
  }

  public static getBranches(): MockBranch[] {
    return [];
  }

  public static getVisitors(): MockVisitor[] {
    return [];
  }

  public static getSecurityEvents(): MockSecurityEvent[] {
    return [];
  }

  public static getApiLogs(): MockApiLog[] {
    return [];
  }
}
