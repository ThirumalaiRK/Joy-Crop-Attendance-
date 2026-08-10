import { supabase } from '../supabase';
import {
  Visitor,
  VisitorPass,
  VisitorLog,
  VisitorNotification,
  VisitorAuditLog,
  VisitorStats,
  PassApprovalStatus,
  PassStatus,
  LogMethod,
} from './vms-types';

// Helper function to generate valid UUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate unique sequential visitor pass code (e.g. VIS-2026-000234)
export function generateVisitorPassCode(): string {
  const randomSeq = Math.floor(100000 + Math.random() * 900000);
  return `VIS-2026-${randomSeq}`;
}

// Calculate duration string e.g. 1h 45m or 28 mins
export function calculateVisitDuration(checkInIso: string, checkOutIso: string): string {
  try {
    const start = new Date(checkInIso).getTime();
    const end = new Date(checkOutIso).getTime();
    let diffMs = end - start;
    if (diffMs < 0) diffMs = 0;
    const mins = Math.round(diffMs / (1000 * 60));
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  } catch (e) {
    return '0 mins';
  }
}

// ─── IN-MEMORY RESILIENT DATASET ─────────────────────────────────────────────
const INITIAL_MOCK_VISITORS: Visitor[] = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    visitorCode: 'VIS-2026-100201',
    fullName: 'Ananya Sharma',
    companyName: 'Acme Solutions Ltd',
    mobile: '+91 98765 43210',
    email: 'ananya.s@acmesolutions.com',
    governmentIdType: 'Aadhaar',
    governmentIdNumber: 'XXXX-XXXX-8890',
    vehicleNumber: 'KA-01-MJ-4521',
    status: 'ACTIVE',
    isVip: true,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    visitorCode: 'VIS-2026-100202',
    fullName: 'Vikram Mehta',
    companyName: 'Apex Cloud Systems',
    mobile: '+91 91234 56789',
    email: 'vikram.mehta@apexcloud.io',
    governmentIdType: 'Passport',
    governmentIdNumber: 'Z8942104',
    vehicleNumber: 'KA-03-NC-9012',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    visitorCode: 'VIS-2026-100203',
    fullName: 'Rohan Gupta',
    companyName: 'Fintech Corp',
    mobile: '+91 99887 76655',
    email: 'rohan.g@fintechcorp.com',
    governmentIdType: 'Driver License',
    governmentIdNumber: 'DL-14201100982',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const INITIAL_MOCK_PASSES: VisitorPass[] = [
  {
    id: 'b1b2c3d4-0001-4000-8000-000000000001',
    visitorId: 'a1b2c3d4-0001-4000-8000-000000000001',
    visitorName: 'Ananya Sharma',
    visitorCompany: 'Acme Solutions Ltd',
    visitorMobile: '+91 98765 43210',
    hostEmployeeId: 'EMP-000003',
    hostEmployeeName: 'THIRUMALAI R K',
    hostDepartment: 'Executive Leadership',
    branchId: 'BR-HQ',
    branchName: 'Global HQ - Floor 5',
    visitDate: new Date().toISOString().split('T')[0],
    expectedCheckin: new Date(Date.now() - 3600000 * 2).toISOString(),
    expectedCheckout: new Date(Date.now() + 3600000 * 4).toISOString(),
    purpose: 'Executive Quarterly Audit Meeting',
    meetingRoom: 'Boardroom A',
    qrCode: 'VIS-2026-100201',
    approvalStatus: 'APPROVED',
    passStatus: 'INSIDE',
    checkInTime: new Date(Date.now() - 3600000 * 1.5).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'b1b2c3d4-0002-4000-8000-000000000002',
    visitorId: 'a1b2c3d4-0002-4000-8000-000000000002',
    visitorName: 'Vikram Mehta',
    visitorCompany: 'Apex Cloud Systems',
    visitorMobile: '+91 91234 56789',
    hostEmployeeId: 'EMP-000002',
    hostEmployeeName: 'Dharun DB',
    hostDepartment: 'Product & Design',
    branchId: 'BR-HQ',
    branchName: 'Global HQ - Floor 5',
    visitDate: new Date().toISOString().split('T')[0],
    expectedCheckin: new Date(Date.now() + 3600000).toISOString(),
    expectedCheckout: new Date(Date.now() + 3600000 * 3).toISOString(),
    purpose: 'UI UX Architecture Review',
    meetingRoom: 'Design Lab 3',
    qrCode: 'VIS-2026-100202',
    approvalStatus: 'PENDING',
    passStatus: 'SCHEDULED',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'b1b2c3d4-0003-4000-8000-000000000003',
    visitorId: 'a1b2c3d4-0003-4000-8000-000000000003',
    visitorName: 'Rohan Gupta',
    visitorCompany: 'Fintech Corp',
    visitorMobile: '+91 99887 76655',
    hostEmployeeId: 'EMP-000003',
    hostEmployeeName: 'THIRUMALAI R K',
    hostDepartment: 'Executive Leadership',
    branchId: 'BR-HQ',
    branchName: 'Global HQ - Floor 5',
    visitDate: new Date().toISOString().split('T')[0],
    expectedCheckin: new Date(Date.now() - 3600000 * 5).toISOString(),
    expectedCheckout: new Date(Date.now() - 3600000 * 2).toISOString(),
    purpose: 'Vendor Partnership Agreement',
    meetingRoom: 'Conference Room B',
    qrCode: 'VIS-2026-100203',
    approvalStatus: 'APPROVED',
    passStatus: 'CHECKED_OUT',
    checkInTime: new Date(Date.now() - 3600000 * 4.5).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    checkOutTime: new Date(Date.now() - 3600000 * 2).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    actualDuration: '2h 30m',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

const INITIAL_MOCK_LOGS: VisitorLog[] = [
  {
    id: 'c1b2c3d4-0001-4000-8000-000000000001',
    visitorPassId: 'b1b2c3d4-0001-4000-8000-000000000001',
    visitorName: 'Ananya Sharma',
    eventType: 'CHECK_IN',
    eventTime: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    method: 'QR',
    notes: 'Verified via Reception Camera Scanner',
  },
  {
    id: 'c1b2c3d4-0002-4000-8000-000000000002',
    visitorPassId: 'b1b2c3d4-0003-4000-8000-000000000003',
    visitorName: 'Rohan Gupta',
    eventType: 'CHECK_IN',
    eventTime: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    method: 'MANUAL',
    notes: 'Checked in by Receptionist',
  },
  {
    id: 'c1b2c3d4-0003-4000-8000-000000000003',
    visitorPassId: 'b1b2c3d4-0003-4000-8000-000000000003',
    visitorName: 'Rohan Gupta',
    eventType: 'CHECK_OUT',
    eventTime: new Date(Date.now() - 3600000 * 2).toISOString(),
    method: 'QR',
    notes: 'Gate 1 Turnstile QR Scan',
  },
];

const INITIAL_MOCK_NOTIFS: VisitorNotification[] = [
  {
    id: 'd1b2c3d4-0001-4000-8000-000000000001',
    visitorPassId: 'b1b2c3d4-0002-4000-8000-000000000002',
    employeeId: 'EMP-000002',
    employeeName: 'Dharun DB',
    visitorName: 'Vikram Mehta',
    notificationType: 'APPROVAL',
    message: 'Vikram Mehta (Apex Cloud Systems) is requesting a visit pass for UI UX Architecture Review.',
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'd1b2c3d4-0002-4000-8000-000000000002',
    visitorPassId: 'b1b2c3d4-0001-4000-8000-000000000001',
    employeeId: 'EMP-000003',
    employeeName: 'THIRUMALAI R K',
    visitorName: 'Ananya Sharma',
    notificationType: 'ARRIVED',
    message: 'Ananya Sharma has checked in at HQ Reception Gate 1.',
    status: 'READ',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
];

const INITIAL_MOCK_AUDIT: VisitorAuditLog[] = [
  {
    id: 'e1b2c3d4-0001-4000-8000-000000000001',
    passId: 'b1b2c3d4-0001-4000-8000-000000000001',
    action: 'VISITOR_PASS_CREATED',
    actor: 'Receptionist Gate 1',
    details: 'Pass created for Ananya Sharma (Host: THIRUMALAI R K)',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'e1b2c3d4-0002-4000-8000-000000000002',
    passId: 'b1b2c3d4-0001-4000-8000-000000000001',
    action: 'HOST_APPROVED',
    actor: 'THIRUMALAI R K',
    details: 'Host approved request; QR Pass generated',
    createdAt: new Date(Date.now() - 3600000 * 2.8).toISOString(),
  },
  {
    id: 'e1b2c3d4-0003-4000-8000-000000000003',
    passId: 'b1b2c3d4-0001-4000-8000-000000000001',
    action: 'VISITOR_CHECK_IN',
    actor: 'Reception Terminal',
    details: 'QR Code verified at HQ Reception',
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
];

// Memory store references
let visitorsStore: Visitor[] = [...INITIAL_MOCK_VISITORS];
let passesStore: VisitorPass[] = [...INITIAL_MOCK_PASSES];
let logsStore: VisitorLog[] = [...INITIAL_MOCK_LOGS];
let notifsStore: VisitorNotification[] = [...INITIAL_MOCK_NOTIFS];
let auditStore: VisitorAuditLog[] = [...INITIAL_MOCK_AUDIT];

// Realtime subscribers
type VMSCallback = () => void;
const subscribers: Set<VMSCallback> = new Set();

export function subscribeVMSEvents(callback: VMSCallback) {
  subscribers.add(callback);

  // Subscribe to Supabase Realtime changes on visitor_passes and visitor_logs tables
  try {
    const channel = supabase
      .channel('vms-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_passes' }, () => {
        callback();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
        callback();
      })
      .subscribe();

    return () => {
      subscribers.delete(callback);
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => subscribers.delete(callback);
  }
}

function notifySubscribers() {
  subscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {}
  });
}

// ─── VMS CORE OPERATIONS ─────────────────────────────────────────────────────

export async function fetchVisitors(): Promise<Visitor[]> {
  try {
    const { data, error } = await supabase.from('visitors').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        visitorCode: d.visitor_code || d.id,
        fullName: d.full_name,
        photoUrl: d.photo_url,
        mobile: d.mobile,
        email: d.email,
        companyName: d.company_name,
        governmentIdType: d.government_id_type,
        governmentIdNumber: d.government_id_number,
        vehicleNumber: d.vehicle_number,
        emergencyContact: d.emergency_contact,
        status: d.status || 'ACTIVE',
        isBlacklisted: d.status === 'BLACKLISTED',
        isVip: d.is_vip || false,
        createdAt: d.created_at,
      }));
    }
  } catch (e) {}
  return [...visitorsStore];
}

export async function fetchVisitorPasses(): Promise<VisitorPass[]> {
  try {
    const { data, error } = await supabase.from('visitor_passes').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        visitorId: d.visitor_id,
        visitorName: d.visitor_name,
        visitorCompany: d.visitor_company,
        visitorPhoto: d.visitor_photo,
        visitorMobile: d.visitor_mobile,
        hostEmployeeId: d.host_employee_id,
        hostEmployeeName: d.host_employee_name,
        hostDepartment: d.host_department,
        branchId: d.branch_id,
        branchName: d.branch_name,
        visitDate: d.visit_date,
        expectedCheckin: d.expected_checkin,
        expectedCheckout: d.expected_checkout,
        purpose: d.purpose,
        meetingRoom: d.meeting_room,
        notes: d.notes,
        qrCode: d.qr_code,
        approvalStatus: d.approval_status,
        passStatus: d.pass_status,
        checkInTime: d.check_in_time,
        checkOutTime: d.check_out_time,
        actualDuration: d.actual_duration,
        createdAt: d.created_at,
      }));
    }
  } catch (e) {}
  return [...passesStore];
}

export async function getVisitorStats(): Promise<VisitorStats> {
  const passes = await fetchVisitorPasses();
  const visitors = await fetchVisitors();

  const currentlyInside = passes.filter((p) => p.passStatus === 'INSIDE').length;
  const expectedToday = passes.filter((p) => p.passStatus === 'SCHEDULED' || p.passStatus === 'APPROVED' || p.passStatus === 'INSIDE').length;
  const checkedInToday = passes.filter((p) => p.passStatus === 'INSIDE' || p.passStatus === 'CHECKED_OUT').length;
  const checkedOutToday = passes.filter((p) => p.passStatus === 'CHECKED_OUT').length;
  const pendingApprovals = passes.filter((p) => p.approvalStatus === 'PENDING').length;
  const expiredPasses = passes.filter((p) => p.passStatus === 'EXPIRED').length;
  const walkInVisitors = passes.filter((p) => p.purpose?.toLowerCase().includes('walk-in') || p.purpose?.toLowerCase().includes('delivery')).length;
  const vipVisitors = visitors.filter((v) => v.isVip).length;
  const blacklistedVisitors = visitors.filter((v) => v.status === 'BLACKLISTED').length;

  return {
    currentlyInside,
    expectedToday,
    checkedInToday,
    checkedOutToday,
    pendingApprovals,
    expiredPasses,
    walkInVisitors,
    vipVisitors,
    blacklistedVisitors,
  };
}

export async function createVisitorPassTransaction(payload: {
  fullName: string;
  mobile: string;
  email?: string;
  companyName: string;
  governmentIdType: string;
  governmentIdNumber: string;
  vehicleNumber?: string;
  emergencyContact?: string;
  photoUrl?: string;
  hostEmployeeId: string;
  hostEmployeeName: string;
  hostDepartment: string;
  purpose: string;
  meetingRoom?: string;
  notes?: string;
  visitDate: string; // YYYY-MM-DD
  expectedCheckinTime: string; // HH:MM
  expectedCheckoutTime: string; // HH:MM
  autoApprove?: boolean;
}): Promise<{ success: boolean; pass?: VisitorPass; error?: string }> {
  const visitorId = generateUUID();
  const passId = generateUUID();
  const visitorCode = generateVisitorPassCode();

  const newVisitor: Visitor = {
    id: visitorId,
    visitorCode,
    fullName: payload.fullName,
    photoUrl: payload.photoUrl,
    mobile: payload.mobile,
    email: payload.email,
    companyName: payload.companyName,
    governmentIdType: payload.governmentIdType,
    governmentIdNumber: payload.governmentIdNumber,
    vehicleNumber: payload.vehicleNumber,
    emergencyContact: payload.emergencyContact,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  const expectedInIso = `${payload.visitDate}T${payload.expectedCheckinTime}:00`;
  const expectedOutIso = `${payload.visitDate}T${payload.expectedCheckoutTime}:00`;

  const newPass: VisitorPass = {
    id: passId,
    visitorId,
    visitorName: payload.fullName,
    visitorCompany: payload.companyName,
    visitorPhoto: payload.photoUrl,
    visitorMobile: payload.mobile,
    hostEmployeeId: payload.hostEmployeeId,
    hostEmployeeName: payload.hostEmployeeName,
    hostDepartment: payload.hostDepartment,
    branchId: 'BR-HQ',
    branchName: 'Global HQ - Floor 5',
    visitDate: payload.visitDate,
    expectedCheckin: expectedInIso,
    expectedCheckout: expectedOutIso,
    purpose: payload.purpose,
    meetingRoom: payload.meetingRoom,
    notes: payload.notes,
    qrCode: visitorCode,
    approvalStatus: payload.autoApprove ? 'APPROVED' : 'PENDING',
    passStatus: payload.autoApprove ? 'APPROVED' : 'SCHEDULED',
    createdAt: new Date().toISOString(),
  };

  const newNotif: VisitorNotification = {
    id: generateUUID(),
    visitorPassId: passId,
    employeeId: payload.hostEmployeeId,
    employeeName: payload.hostEmployeeName,
    visitorName: payload.fullName,
    notificationType: 'APPROVAL',
    message: `${payload.fullName} (${payload.companyName}) is requesting a visitor pass for ${payload.purpose}.`,
    status: 'UNREAD',
    createdAt: new Date().toISOString(),
  };

  const newAudit: VisitorAuditLog = {
    id: generateUUID(),
    passId,
    action: 'PASS_REGISTERED',
    actor: 'Receptionist / Host',
    details: `Created visitor pass ${visitorCode} for ${payload.fullName} (Host: ${payload.hostEmployeeName})`,
    createdAt: new Date().toISOString(),
  };

  // Push to memory store first for immediate local reactivity
  visitorsStore = [newVisitor, ...visitorsStore];
  passesStore = [newPass, ...passesStore];
  notifsStore = [newNotif, ...notifsStore];
  auditStore = [newAudit, ...auditStore];

  // Try DB Inserts asynchronously
  try {
    await supabase.from('visitors').insert([
      {
        id: newVisitor.id,
        visitor_code: newVisitor.visitorCode,
        full_name: newVisitor.fullName,
        photo_url: newVisitor.photoUrl,
        mobile: newVisitor.mobile,
        email: newVisitor.email,
        company_name: newVisitor.companyName,
        government_id_type: newVisitor.governmentIdType,
        government_id_number: newVisitor.governmentIdNumber,
        vehicle_number: newVisitor.vehicleNumber,
        emergency_contact: newVisitor.emergencyContact,
        status: newVisitor.status,
      },
    ]);

    await supabase.from('visitor_passes').insert([
      {
        id: newPass.id,
        visitor_id: newPass.visitorId,
        visitor_name: newPass.visitorName,
        visitor_company: newPass.visitorCompany,
        visitor_photo: newPass.visitorPhoto,
        visitor_mobile: newPass.visitorMobile,
        host_employee_id: newPass.hostEmployeeId,
        host_employee_name: newPass.hostEmployeeName,
        host_department: newPass.hostDepartment,
        branch_id: newPass.branchId,
        branch_name: newPass.branchName,
        visit_date: newPass.visitDate,
        expected_checkin: newPass.expectedCheckin,
        expected_checkout: newPass.expectedCheckout,
        purpose: newPass.purpose,
        meeting_room: newPass.meetingRoom,
        notes: newPass.notes,
        qr_code: newPass.qrCode,
        approval_status: newPass.approvalStatus,
        pass_status: newPass.passStatus,
      },
    ]);
  } catch (e) {}

  notifySubscribers();
  return { success: true, pass: newPass };
}

// ─── HOST APPROVAL & REJECTION ───────────────────────────────────────────────

export async function approveVisitorPass(passId: string, actorName: string = 'Host'): Promise<{ success: boolean; message: string }> {
  const passIndex = passesStore.findIndex((p) => p.id === passId || p.qrCode === passId);
  if (passIndex === -1) {
    return { success: false, message: 'Visitor Pass record not found.' };
  }

  const targetPass = passesStore[passIndex];
  targetPass.approvalStatus = 'APPROVED';
  targetPass.passStatus = 'APPROVED';

  const newAudit: VisitorAuditLog = {
    id: generateUUID(),
    passId: targetPass.id,
    action: 'HOST_APPROVED',
    actor: actorName,
    details: `Host ${actorName} approved access for ${targetPass.visitorName}. QR Pass activated.`,
    createdAt: new Date().toISOString(),
  };

  auditStore = [newAudit, ...auditStore];

  try {
    await supabase.from('visitor_passes').update({ approval_status: 'APPROVED', pass_status: 'APPROVED' }).eq('id', targetPass.id);
  } catch (e) {}

  notifySubscribers();
  return { success: true, message: `Pass ${targetPass.qrCode} successfully approved for ${targetPass.visitorName}.` };
}

export async function rejectVisitorPass(passId: string, reason: string = 'Host declined visit', actorName: string = 'Host'): Promise<{ success: boolean; message: string }> {
  const passIndex = passesStore.findIndex((p) => p.id === passId || p.qrCode === passId);
  if (passIndex === -1) {
    return { success: false, message: 'Visitor Pass record not found.' };
  }

  const targetPass = passesStore[passIndex];
  targetPass.approvalStatus = 'REJECTED';
  targetPass.passStatus = 'DENIED';

  const newAudit: VisitorAuditLog = {
    id: generateUUID(),
    passId: targetPass.id,
    action: 'HOST_REJECTED',
    actor: actorName,
    details: `Host ${actorName} rejected visit request. Reason: ${reason}`,
    createdAt: new Date().toISOString(),
  };

  auditStore = [newAudit, ...auditStore];

  try {
    await supabase.from('visitor_passes').update({ approval_status: 'REJECTED', pass_status: 'DENIED' }).eq('id', targetPass.id);
  } catch (e) {}

  notifySubscribers();
  return { success: true, message: `Visitor Pass ${targetPass.qrCode} rejected.` };
}

// ─── CHECK-IN / CHECK-OUT ENGINE WITH COLLISION PREVENTION ──────────────────

export async function checkInVisitorPass(
  passCodeOrId: string,
  method: LogMethod = 'QR'
): Promise<{ success: boolean; message: string; pass?: VisitorPass; isCollisionError?: boolean }> {
  const cleanCode = passCodeOrId.trim().toUpperCase();

  // Find pass by QR Code or ID
  const pass = passesStore.find((p) => p.qrCode.toUpperCase() === cleanCode || p.id === passCodeOrId);

  if (!pass) {
    return { success: false, message: `Invalid Visitor Pass Code "${cleanCode}". No record found.` };
  }

  // COLLISION CHECK 1: Already inside
  if (pass.passStatus === 'INSIDE') {
    return {
      success: false,
      isCollisionError: true,
      message: `[Collision Rejected] Visitor ${pass.visitorName} is ALREADY CHECKED IN at ${pass.checkInTime || 'today'}. Concurrent check-in blocked.`,
    };
  }

  // COLLISION CHECK 2: Already checked out
  if (pass.passStatus === 'CHECKED_OUT') {
    return {
      success: false,
      isCollisionError: true,
      message: `[Pass Expired] Visitor ${pass.visitorName} has ALREADY CHECKED OUT today. Re-entry requires a new pass.`,
    };
  }

  // COLLISION CHECK 3: Unapproved pass
  if (pass.approvalStatus === 'REJECTED' || pass.passStatus === 'DENIED') {
    return {
      success: false,
      isCollisionError: true,
      message: `[Security Alert] Access Denied. Host ${pass.hostEmployeeName} REJECTED this visitor pass.`,
    };
  }

  if (pass.approvalStatus === 'PENDING') {
    return {
      success: false,
      isCollisionError: true,
      message: `[Pending Approval] Pass is waiting for Host (${pass.hostEmployeeName}) approval before check-in can proceed.`,
    };
  }

  // Execute Check-in
  const nowIso = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  pass.passStatus = 'INSIDE';
  pass.checkInTime = timeStr;

  const newLog: VisitorLog = {
    id: generateUUID(),
    visitorPassId: pass.id,
    visitorName: pass.visitorName,
    eventType: 'CHECK_IN',
    eventTime: nowIso,
    method,
    notes: `Verified at Reception Gateway (${method} scan)`,
  };

  const newNotif: VisitorNotification = {
    id: generateUUID(),
    visitorPassId: pass.id,
    employeeId: pass.hostEmployeeId,
    employeeName: pass.hostEmployeeName,
    visitorName: pass.visitorName,
    notificationType: 'ARRIVED',
    message: `Visitor ${pass.visitorName} has arrived and checked in at HQ Reception.`,
    status: 'UNREAD',
    createdAt: nowIso,
  };

  const newAudit: VisitorAuditLog = {
    id: generateUUID(),
    passId: pass.id,
    action: 'VISITOR_CHECK_IN',
    actor: 'Reception Terminal',
    details: `Visitor ${pass.visitorName} checked in via ${method} (${timeStr})`,
    createdAt: nowIso,
  };

  logsStore = [newLog, ...logsStore];
  notifsStore = [newNotif, ...notifsStore];
  auditStore = [newAudit, ...auditStore];

  try {
    await supabase.from('visitor_passes').update({ pass_status: 'INSIDE', check_in_time: timeStr }).eq('id', pass.id);
    await supabase.from('visitor_logs').insert([{ id: newLog.id, visitor_pass_id: pass.id, event_type: 'CHECK_IN', event_time: nowIso, method }]);
  } catch (e) {}

  notifySubscribers();
  return { success: true, message: `Welcome ${pass.visitorName}! Check-in recorded at ${timeStr}.`, pass };
}

export async function checkOutVisitorPass(
  passCodeOrId: string,
  method: LogMethod = 'QR'
): Promise<{ success: boolean; message: string; pass?: VisitorPass; isCollisionError?: boolean }> {
  const cleanCode = passCodeOrId.trim().toUpperCase();

  const pass = passesStore.find((p) => p.qrCode.toUpperCase() === cleanCode || p.id === passCodeOrId);

  if (!pass) {
    return { success: false, message: `Invalid Visitor Pass Code "${cleanCode}". No record found.` };
  }

  // COLLISION CHECK: Not checked in
  if (pass.passStatus !== 'INSIDE') {
    if (pass.passStatus === 'CHECKED_OUT') {
      return {
        success: false,
        isCollisionError: true,
        message: `[Duplicate Checkout] Visitor ${pass.visitorName} is ALREADY CHECKED OUT.`,
      };
    }
    return {
      success: false,
      isCollisionError: true,
      message: `[Checkout Rejected] Visitor ${pass.visitorName} has not checked in yet.`,
    };
  }

  // Execute Check-Out
  const nowIso = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const durationStr = calculateVisitDuration(pass.expectedCheckin || pass.createdAt, nowIso);

  pass.passStatus = 'CHECKED_OUT';
  pass.checkOutTime = timeStr;
  pass.actualDuration = durationStr;

  const newLog: VisitorLog = {
    id: generateUUID(),
    visitorPassId: pass.id,
    visitorName: pass.visitorName,
    eventType: 'CHECK_OUT',
    eventTime: nowIso,
    method,
    notes: `Checked out at Reception Gate (${durationStr} total duration)`,
  };

  const newNotif: VisitorNotification = {
    id: generateUUID(),
    visitorPassId: pass.id,
    employeeId: pass.hostEmployeeId,
    employeeName: pass.hostEmployeeName,
    visitorName: pass.visitorName,
    notificationType: 'LEFT',
    message: `Visitor ${pass.visitorName} has checked out (Total visit duration: ${durationStr}).`,
    status: 'UNREAD',
    createdAt: nowIso,
  };

  const newAudit: VisitorAuditLog = {
    id: generateUUID(),
    passId: pass.id,
    action: 'VISITOR_CHECK_OUT',
    actor: 'Reception Terminal',
    details: `Visitor ${pass.visitorName} checked out via ${method}. Duration: ${durationStr}`,
    createdAt: nowIso,
  };

  logsStore = [newLog, ...logsStore];
  notifsStore = [newNotif, ...notifsStore];
  auditStore = [newAudit, ...auditStore];

  try {
    await supabase.from('visitor_passes').update({ pass_status: 'CHECKED_OUT', check_out_time: timeStr, actual_duration: durationStr }).eq('id', pass.id);
    await supabase.from('visitor_logs').insert([{ id: newLog.id, visitor_pass_id: pass.id, event_type: 'CHECK_OUT', event_time: nowIso, method }]);
  } catch (e) {}

  notifySubscribers();
  return { success: true, message: `Goodbye ${pass.visitorName}! Check-out recorded. Total visit time: ${durationStr}.`, pass };
}

export async function fetchVisitorLogs(): Promise<VisitorLog[]> {
  return [...logsStore];
}

export async function fetchVisitorNotifications(): Promise<VisitorNotification[]> {
  return [...notifsStore];
}

export async function fetchVisitorAuditLogs(): Promise<VisitorAuditLog[]> {
  return [...auditStore];
}
