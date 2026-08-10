export type VisitorStatus = 'ACTIVE' | 'BLACKLISTED' | 'INACTIVE';

export type PassApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type PassStatus = 'SCHEDULED' | 'APPROVED' | 'INSIDE' | 'CHECKED_OUT' | 'EXPIRED' | 'DENIED';

export type LogEventType = 'CHECK_IN' | 'CHECK_OUT' | 'DENIED' | 'EXPIRED';

export type LogMethod = 'QR' | 'FACE' | 'FINGERPRINT' | 'MANUAL';

export type NotificationType = 'APPROVAL' | 'REMINDER' | 'ARRIVED' | 'LEFT';

export interface Visitor {
  id: string; // UUID
  visitorCode: string; // e.g. VIS-2026-000234
  fullName: string;
  photoUrl?: string;
  mobile: string;
  email?: string;
  companyName: string;
  governmentIdType: string; // Aadhaar, Passport, Driver License, Govt ID
  governmentIdNumber: string;
  vehicleNumber?: string;
  emergencyContact?: string;
  status: VisitorStatus;
  isBlacklisted?: boolean;
  isVip?: boolean;
  createdAt: string;
}

export interface VisitorPass {
  id: string; // UUID
  visitorId: string;
  visitorName: string;
  visitorCompany: string;
  visitorPhoto?: string;
  visitorMobile: string;
  hostEmployeeId: string;
  hostEmployeeName: string;
  hostDepartment: string;
  branchId: string;
  branchName: string;
  visitDate: string; // YYYY-MM-DD
  expectedCheckin: string; // ISO string
  expectedCheckout: string; // ISO string
  purpose: string; // Meeting, Interview, Delivery, Maintenance, Audit, Other
  meetingRoom?: string;
  notes?: string;
  qrCode: string; // Pass code e.g. VIS-2026-000234
  approvalStatus: PassApprovalStatus;
  passStatus: PassStatus;
  checkInTime?: string;
  checkOutTime?: string;
  actualDuration?: string; // e.g. 1h 45m
  createdAt: string;
}

export interface VisitorLog {
  id: string;
  visitorPassId: string;
  visitorName: string;
  eventType: LogEventType;
  eventTime: string;
  method: LogMethod;
  notes?: string;
}

export interface VisitorNotification {
  id: string;
  visitorPassId: string;
  employeeId: string;
  employeeName: string;
  visitorName: string;
  notificationType: NotificationType;
  message: string;
  status: 'UNREAD' | 'READ';
  createdAt: string;
}

export interface VisitorAuditLog {
  id: string;
  passId: string;
  action: string;
  actor: string; // Host / Receptionist / System
  details: string;
  createdAt: string;
}

export interface VisitorStats {
  currentlyInside: number;
  expectedToday: number;
  checkedInToday: number;
  checkedOutToday: number;
  pendingApprovals: number;
  expiredPasses: number;
  walkInVisitors: number;
  vipVisitors: number;
  blacklistedVisitors: number;
}

export interface QRPayload {
  passId: string;
  visitorId: string;
  expires: string;
  issuedAt: string;
}
