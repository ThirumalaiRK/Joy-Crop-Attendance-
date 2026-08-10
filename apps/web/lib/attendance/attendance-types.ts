export type AttendanceEventType =
  | 'CHECK_IN'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'MEETING_OUT'
  | 'MEETING_IN'
  | 'FIELD_VISIT_START'
  | 'FIELD_VISIT_END'
  | 'CHECK_OUT';

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'OVERTIME'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'MISSING_CHECKOUT'
  | 'ON_BREAK'
  | 'ON_LUNCH'
  | 'IN_MEETING'
  | 'ON_FIELD_VISIT';

export type ShiftType = 'FIXED' | 'FLEXIBLE' | 'ROTATING' | 'NIGHT' | 'SPLIT';

export type BreakType = 'TEA' | 'LUNCH' | 'PRAYER' | 'MEDICAL' | 'MEETING' | 'FIELD_VISIT' | 'PERSONAL';

export interface AttendanceEvent {
  id: string; // UUID
  sessionId: string;
  employeeId: string;
  employeeName: string;
  eventType: AttendanceEventType;
  eventTime: string; // ISO string
  formattedTime: string; // e.g. 09:01 AM
  device: string; // e.g. Mantra MFS110 L1 / Web Terminal
  method: string; // Fingerprint, Face, QR, GPS, Manual
  location?: string;
  notes?: string;
}

export interface AttendanceSession {
  id: string; // UUID
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  avatar?: string;
  shiftId: string;
  shiftName: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  device: string;
  method: string;
  events: AttendanceEvent[];
  createdAt: string;
}

export interface CalculationBreakdown {
  firstCheckIn: string;
  lastCheckOut: string;
  grossSpanMinutes: number;
  teaBreakMinutes: number;
  lunchBreakMinutes: number;
  lunchBreakType: 'AUTO_DEDUCT' | 'EXPLICIT_PUNCH' | 'NONE';
  lunchBreakDetails: string;
  otherBreakMinutes: number;
  netWorkingMinutes: number;
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  isCompleted: boolean;
}

export interface AttendanceSummary {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalTimeMinutes: number; // Gross attendance span minutes
  grossWorkingMinutes?: number;
  breakDurationMinutes: number; // Tea/other breaks
  explicitBreakMinutes?: number;
  automaticBreakMinutes?: number;
  lunchDurationMinutes: number;
  lunchBreakMode?: 'AUTO' | 'ACTUAL' | 'NONE';
  lunchDetails?: string;
  meetingDurationMinutes: number;
  fieldDurationMinutes: number;
  workingTimeMinutes: number; // Net Working Hours = Gross - Tea Breaks - Lunch
  lateMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  payableHours: number; // For payroll
  status: AttendanceStatus;
  shiftTargetMinutes: number; // e.g. 480 (8 hours)
  eventsCount: number;
  calculationBreakdown?: CalculationBreakdown;
}

export interface ShiftRule {
  id: string;
  name: string;
  type: ShiftType;
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "06:00 PM"
  gracePeriodMins: number; // e.g. 15
  minWorkingHours: number; // e.g. 8
  mandatoryLunchMins: number; // e.g. 45
  maxBreakMins: number; // e.g. 30
  overtimeAllowed: boolean;
}

export interface BreakRule {
  type: BreakType;
  label: string;
  allowedMinutes: number;
  mandatoryAfterHours?: number;
  isPaid: boolean;
}

export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  sessionId: string;
  requestType: 'MISSING_CHECKIN' | 'MISSING_CHECKOUT' | 'WRONG_BREAK' | 'WRONG_LUNCH' | 'DEVICE_FAILURE';
  requestedTime: string;
  reason: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  managerId?: string;
  managerName?: string;
  hrNotes?: string;
  createdAt: string;
}

export interface AttendanceAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  alertType: 'LUNCH_EXCEEDED' | 'BREAK_EXCEEDED' | 'MISSING_CHECKOUT' | 'EXCESS_OVERTIME' | 'IDLE_TOO_LONG' | 'ABSENT' | 'LATE_ARRIVAL';
  message: string;
  timestamp: string;
}

export interface ExportFilterOptions {
  startDate: string;
  endDate: string;
  department?: string;
  branch?: string;
  shift?: string;
  status?: string;
  searchQuery?: string;
}
