import { supabase, logAuditEntry } from '../supabase';

export type WorkflowRequestType =
  | 'ATTENDANCE_CORRECTION'
  | 'LEAVE_REQUEST'
  | 'OVERTIME_REQUEST'
  | 'PAYROLL_EXCEPTION';

export type WorkflowApprovalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AUTO_APPROVED'
  | 'MANAGER_APPROVED'
  | 'HR_APPROVED'
  | 'FINANCE_APPROVED'
  | 'REJECTED'
  | 'APPLIED';

export type UserRole =
  | 'Employee'
  | 'TeamLead'
  | 'ReportingManager'
  | 'HRSpecialist'
  | 'Finance'
  | 'Reception'
  | 'ITSupport'
  | 'SuperAdmin';

export interface WorkflowRequest {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  reportingManager: string;
  requestType: WorkflowRequestType;
  subType: string;
  payload: any;
  currentStep: 'AUTO_APPROVE' | 'MANAGER_REVIEW' | 'HR_REVIEW' | 'FINANCE_REVIEW' | 'COMPLETED';
  approvalStatus: WorkflowApprovalStatus;
  assignedRole: UserRole;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  commentsCount?: number;
}

export interface WorkflowHistoryEntry {
  id: string;
  requestId: string;
  stepName: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED' | 'REQUEST_INFO';
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  comments?: string;
  createdAt: string;
}

export interface WorkflowComment {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

/**
 * Determine approval path & SLA deadline based on request type and severity
 */
export function determineWorkflowRouting(
  requestType: WorkflowRequestType,
  subType: string,
  lateMinutes: number = 0
): { initialStep: WorkflowRequest['currentStep']; initialStatus: WorkflowApprovalStatus; nextRole: UserRole; slaHours: number } {
  // 1. Smart Rule: Late <= 10 mins -> Auto Approve
  if (lateMinutes > 0 && lateMinutes <= 10) {
    return { initialStep: 'COMPLETED', initialStatus: 'AUTO_APPROVED', nextRole: 'Employee', slaHours: 0 };
  }

  // 2. Missed Punch -> Reporting Manager
  if (subType.includes('Missed Check-In') || subType.includes('Missed Check-Out')) {
    return { initialStep: 'MANAGER_REVIEW', initialStatus: 'SUBMITTED', nextRole: 'ReportingManager', slaHours: 4 };
  }

  // 3. Overtime -> Manager -> HR -> Finance
  if (requestType === 'OVERTIME_REQUEST' || subType.includes('Overtime')) {
    return { initialStep: 'MANAGER_REVIEW', initialStatus: 'SUBMITTED', nextRole: 'ReportingManager', slaHours: 4 };
  }

  // Default Manual Time Edit / Leave -> Manager -> HR
  return { initialStep: 'MANAGER_REVIEW', initialStatus: 'SUBMITTED', nextRole: 'ReportingManager', slaHours: 4 };
}

/**
 * Submit a New Workflow Request to Supabase DB
 */
export async function submitWorkflowRequestInSupabase(
  payload: Partial<WorkflowRequest> & { lateMinutes?: number }
): Promise<{ success: boolean; data?: WorkflowRequest; error?: string }> {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const requestNumber = `WRK-2026-${randomNum}`;

  const reqType: WorkflowRequestType = payload.requestType || 'ATTENDANCE_CORRECTION';
  const subType = payload.subType || 'Missed Check-In';
  const routing = determineWorkflowRouting(reqType, subType, payload.lateMinutes || 0);

  const slaDeadline = new Date(Date.now() + routing.slaHours * 3600000).toISOString();

  try {
    const { data, error } = await supabase.from('workflow_requests').insert([
      {
        request_number: requestNumber,
        employee_id: payload.employeeId || 'EMP-000003',
        employee_name: payload.employeeName || 'THIRUMALAI R K',
        department: payload.department || 'Software Development',
        reporting_manager: payload.reportingManager || 'Joy Corporate Board',
        request_type: reqType,
        payload: { ...payload.payload, subType },
        current_step: routing.initialStep,
        approval_status: routing.initialStatus,
        assigned_role: routing.nextRole,
        sla_deadline: slaDeadline,
      },
    ]).select();

    if (error) {
      console.warn('submitWorkflowRequest DB notice:', error.message);
      return { success: false, error: error.message };
    }

    const createdRow = data[0];

    // Log history entry
    await supabase.from('workflow_approval_history').insert([
      {
        request_id: createdRow.id,
        step_name: 'SUBMISSION',
        action: routing.initialStatus === 'AUTO_APPROVED' ? 'AUTO_APPROVED' : 'SUBMITTED',
        actor_id: createdRow.employee_id,
        actor_name: createdRow.employee_name,
        actor_role: 'Employee',
        comments: routing.initialStatus === 'AUTO_APPROVED'
          ? 'System auto-approved (Late <= 10 mins policy).'
          : `Submitted request for ${subType}.`,
      },
    ]);

    await logAuditEntry(
      'WORKFLOW_SUBMITTED',
      createdRow.employee_id,
      `Submitted ${requestNumber} [${reqType} - ${subType}] Assigned to: ${routing.nextRole}`
    );

    return {
      success: true,
      data: mapRowToWorkflowRequest(createdRow),
    };
  } catch (err: any) {
    console.error('submitWorkflowRequestInSupabase exception:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Transition Workflow Request to Next Step (Manager -> HR -> Finance -> Applied)
 */
export async function processWorkflowApprovalInSupabase(
  requestId: string,
  action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
  actorName: string,
  actorRole: UserRole,
  comments?: string
): Promise<{ success: boolean; newStatus?: WorkflowApprovalStatus; error?: string }> {
  try {
    const { data: currentReq } = await supabase.from('workflow_requests').select('*').eq('id', requestId).single();
    if (!currentReq) return { success: false, error: 'Request not found.' };

    let nextStep = currentReq.current_step;
    let nextStatus: WorkflowApprovalStatus = currentReq.approval_status;
    let nextRole: UserRole = currentReq.assigned_role;

    if (action === 'REJECT') {
      nextStep = 'COMPLETED';
      nextStatus = 'REJECTED';
    } else if (action === 'APPROVE') {
      if (currentReq.current_step === 'MANAGER_REVIEW') {
        // Check if HR review is needed or complete
        const subType = currentReq.payload?.subType || '';
        if (subType.includes('Overtime') || currentReq.request_type === 'OVERTIME_REQUEST') {
          nextStep = 'HR_REVIEW';
          nextStatus = 'MANAGER_APPROVED';
          nextRole = 'HRSpecialist';
        } else {
          // Complete & Apply
          nextStep = 'COMPLETED';
          nextStatus = 'APPLIED';
        }
      } else if (currentReq.current_step === 'HR_REVIEW') {
        if (currentReq.request_type === 'OVERTIME_REQUEST') {
          nextStep = 'FINANCE_REVIEW';
          nextStatus = 'HR_APPROVED';
          nextRole = 'Finance';
        } else {
          nextStep = 'COMPLETED';
          nextStatus = 'APPLIED';
        }
      } else if (currentReq.current_step === 'FINANCE_REVIEW') {
        nextStep = 'COMPLETED';
        nextStatus = 'APPLIED';
      }
    }

    const updates: any = {
      current_step: nextStep,
      approval_status: nextStatus,
      assigned_role: nextRole,
      updated_at: new Date().toISOString(),
    };
    if (nextStatus === 'APPLIED' || nextStatus === 'REJECTED') {
      updates.completed_at = new Date().toISOString();
    }

    await supabase.from('workflow_requests').update(updates).eq('id', requestId);

    // Record History Audit
    await supabase.from('workflow_approval_history').insert([
      {
        request_id: requestId,
        step_name: currentReq.current_step,
        action: action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'REQUEST_INFO',
        actor_id: actorRole,
        actor_name: actorName,
        actor_role: actorRole,
        comments: comments || `${actorRole} ${action}D request.`,
      },
    ]);

    await logAuditEntry(
      'WORKFLOW_PROCESSED',
      requestId,
      `Request ${currentReq.request_number} set to ${nextStatus} by ${actorName} (${actorRole})`
    );

    return { success: true, newStatus: nextStatus };
  } catch (err: any) {
    console.error('processWorkflowApprovalInSupabase exception:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Fetch Workflow Requests from Supabase DB filtered by role/employee
 */
export async function fetchWorkflowRequestsFromSupabase(
  role: UserRole | 'ALL' = 'ALL',
  employeeId?: string
): Promise<WorkflowRequest[]> {
  try {
    let query = supabase.from('workflow_requests').select('*').order('created_at', { ascending: false });

    if (employeeId && employeeId !== 'ALL') {
      query = query.eq('employee_id', employeeId);
    } else if (role !== 'ALL' && role !== 'SuperAdmin') {
      query = query.eq('assigned_role', role);
    }

    const { data, error } = await query.limit(100);
    if (error) return [];

    return (data || []).map(mapRowToWorkflowRequest);
  } catch (err) {
    console.error('fetchWorkflowRequestsFromSupabase exception:', err);
  }
  return [];
}

/**
 * Fetch History Audit for a Request
 */
export async function fetchWorkflowHistoryFromSupabase(requestId: string): Promise<WorkflowHistoryEntry[]> {
  try {
    const { data } = await supabase
      .from('workflow_approval_history')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    return (data || []).map((row) => ({
      id: row.id,
      requestId: row.request_id,
      stepName: row.step_name,
      action: row.action,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorRole: row.actor_role,
      comments: row.comments,
      createdAt: row.created_at,
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Map DB Row to WorkflowRequest object
 */
function mapRowToWorkflowRequest(row: any): WorkflowRequest {
  return {
    id: row.id,
    requestNumber: row.request_number || `WRK-${row.id.slice(0, 6)}`,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    department: row.department,
    reportingManager: row.reporting_manager || 'Joy Corporate Board',
    requestType: row.request_type,
    subType: row.payload?.subType || row.request_type,
    payload: row.payload || {},
    currentStep: row.current_step,
    approvalStatus: row.approval_status,
    assignedRole: row.assigned_role,
    slaDeadline: row.sla_deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

/**
 * Realtime Subscription for Workflow Events
 */
export function subscribeToWorkflowRealtime(onEvent: () => void) {
  const channel = supabase
    .channel('workflow-realtime-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_requests' }, () => {
      onEvent();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_approval_history' }, () => {
      onEvent();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
