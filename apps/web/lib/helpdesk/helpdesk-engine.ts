import { supabase, logAuditEntry } from '../supabase';

export type TicketCategory =
  | 'Attendance'
  | 'Leave'
  | 'HR'
  | 'IT'
  | 'Administration'
  | 'General';

export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type TicketStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'ASSIGNED'
  | 'IN PROGRESS'
  | 'WAITING FOR EMPLOYEE'
  | 'RESOLVED'
  | 'CLOSED';

export interface TicketCategoryCatalog {
  category: TicketCategory;
  subCategories: string[];
  defaultRole: 'HR Specialist' | 'IT Support' | 'Reception' | 'Finance' | 'Reporting Manager';
  icon: string;
}

export const CATEGORY_CATALOG: TicketCategoryCatalog[] = [
  {
    category: 'Attendance',
    subCategories: [
      'Missed Check-In',
      'Missed Check-Out',
      'Fingerprint Failed',
      'Face Recognition Failed',
      'Wrong Attendance',
      'Device Offline',
      'Shift Correction',
      'Overtime Request',
    ],
    defaultRole: 'HR Specialist',
    icon: 'Fingerprint',
  },
  {
    category: 'Leave',
    subCategories: [
      'Leave Approval',
      'Leave Balance',
      'Leave Cancellation',
      'Half Day Request',
    ],
    defaultRole: 'Reporting Manager',
    icon: 'Calendar',
  },
  {
    category: 'HR',
    subCategories: [
      'Salary Slip / Payslip',
      'PF / ESI Inquiry',
      'Promotion / Grade',
      'Transfer Request',
      'HR Documents Request',
    ],
    defaultRole: 'HR Specialist',
    icon: 'UserCheck',
  },
  {
    category: 'IT',
    subCategories: [
      'Laptop Hardware',
      'Email / Google Workspace',
      'VPN & Network Access',
      'Printer / Scanner',
      'Internet Connectivity',
      'Password Reset Request',
      'Software Installation',
    ],
    defaultRole: 'IT Support',
    icon: 'Monitor',
  },
  {
    category: 'Administration',
    subCategories: [
      'ID Card Replacement',
      'Visitor Pass Approval',
      'Parking Permit',
      'Asset / Stationary Request',
    ],
    defaultRole: 'Reception',
    icon: 'Building2',
  },
  {
    category: 'General',
    subCategories: [
      'Suggestion',
      'Complaint',
      'Feedback',
    ],
    defaultRole: 'HR Specialist',
    icon: 'HelpCircle',
  },
];

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  employeeId: string;
  employeeName: string;
  employeeEmail?: string;
  department: string;
  category: TicketCategory;
  subCategory: string;
  priority: TicketPriority;
  subject: string;
  description: string;
  status: TicketStatus;
  assignedTo: string;
  assignedRole: string;
  deviceName?: string;
  location?: string;
  preferredContact?: string;
  slaDeadline?: string;
  resolutionNotes?: string;
  rating?: number;
  feedbackComments?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  isInternalNote: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

/**
 * Calculate SLA Deadline based on Ticket Priority
 */
export function calculateSlaDeadline(priority: TicketPriority): string {
  const now = new Date();
  let addHours = 24; // Default Normal Priority: 24h
  if (priority === 'CRITICAL') addHours = 2;
  else if (priority === 'HIGH') addHours = 4;
  else if (priority === 'LOW') addHours = 48;

  now.setHours(now.getHours() + addHours);
  return now.toISOString();
}

/**
 * Create a new Support Ticket in Supabase DB with automatic routing and SLA calculation
 */
export async function createSupportTicketInSupabase(
  ticket: Partial<SupportTicket>
): Promise<{ success: boolean; data?: SupportTicket; error?: string }> {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ticketNumber = `TICK-2026-${randomNum}`;

  const categoryConfig = CATEGORY_CATALOG.find((c) => c.category === ticket.category) || CATEGORY_CATALOG[0];
  const assignedRole = categoryConfig.defaultRole;
  const priority = ticket.priority || 'NORMAL';
  const slaDeadline = calculateSlaDeadline(priority);

  try {
    const { data, error } = await supabase.from('support_tickets').insert([
      {
        ticket_number: ticketNumber,
        employee_id: ticket.employeeId || 'EMP-000003',
        employee_name: ticket.employeeName || 'THIRUMALAI R K',
        employee_email: ticket.employeeEmail || 'thirumalai@joycorporate.in',
        department: ticket.department || 'Software Development',
        category: ticket.category || 'Attendance',
        sub_category: ticket.subCategory || 'Missed Check-In',
        priority: priority,
        subject: ticket.subject || 'Helpdesk Request',
        description: ticket.description || 'Support inquiry.',
        status: 'OPEN',
        assigned_to: `Unassigned (${assignedRole})`,
        assigned_role: assignedRole,
        device_name: ticket.deviceName || 'Mantra MFS110 L1 / Windows PC',
        location: ticket.location || 'Coimbatore HQ',
        preferred_contact: ticket.preferredContact || 'Email',
        sla_deadline: slaDeadline,
      },
    ]).select();

    if (error) {
      console.warn('Support ticket insert notice:', error.message);
      return { success: false, error: error.message };
    }

    const createdRow = data[0];

    // Log initial message if description exists
    if (createdRow) {
      await supabase.from('ticket_messages').insert([
        {
          ticket_id: createdRow.id,
          sender_id: createdRow.employee_id,
          sender_name: createdRow.employee_name,
          sender_role: 'Employee',
          message: createdRow.description,
          is_internal_note: false,
        },
      ]);

      await logAuditEntry(
        'CREATE_SUPPORT_TICKET',
        createdRow.employee_id,
        `Created Support Ticket ${ticketNumber} [${createdRow.category} - ${createdRow.sub_category}] Priority: ${priority}`
      );
    }

    return {
      success: true,
      data: mapRowToTicket(createdRow),
    };
  } catch (err: any) {
    console.error('createSupportTicketInSupabase exception:', err);
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Fetch Support Tickets from Supabase DB filtered by role or employee
 */
export async function fetchSupportTicketsFromSupabase(
  employeeId?: string,
  assignedRole?: string
): Promise<SupportTicket[]> {
  try {
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });

    if (employeeId && employeeId !== 'ALL') {
      query = query.eq('employee_id', employeeId);
    } else if (assignedRole && assignedRole !== 'SuperAdmin' && assignedRole !== 'ALL') {
      query = query.eq('assigned_role', assignedRole);
    }

    const { data, error } = await query.limit(100);
    if (error) {
      console.warn('Fetch support tickets notice:', error.message);
      return [];
    }

    return (data || []).map(mapRowToTicket);
  } catch (err) {
    console.error('fetchSupportTicketsFromSupabase exception:', err);
  }
  return [];
}

/**
 * Fetch Messages for a specific ticket
 */
export async function fetchTicketMessagesFromSupabase(ticketId: string): Promise<TicketMessage[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Fetch ticket messages notice:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      message: row.message,
      isInternalNote: row.is_internal_note,
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('fetchTicketMessagesFromSupabase exception:', err);
  }
  return [];
}

/**
 * Send Slack-Style Message / Comment on Ticket
 */
export async function addTicketMessageInSupabase(
  msg: Partial<TicketMessage>
): Promise<{ success: boolean; data?: TicketMessage; error?: string }> {
  try {
    const { data, error } = await supabase.from('ticket_messages').insert([
      {
        ticket_id: msg.ticketId,
        sender_id: msg.senderId || 'EMP-000003',
        sender_name: msg.senderName || 'THIRUMALAI R K',
        sender_role: msg.senderRole || 'Employee',
        message: msg.message,
        is_internal_note: msg.isInternalNote || false,
        attachment_url: msg.attachmentUrl || null,
        attachment_name: msg.attachmentName || null,
      },
    ]).select();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update ticket updated_at
    await supabase.from('support_tickets').update({
      updated_at: new Date().toISOString(),
    }).eq('id', msg.ticketId);

    return {
      success: true,
      data: {
        id: data[0].id,
        ticketId: data[0].ticket_id,
        senderId: data[0].sender_id,
        senderName: data[0].sender_name,
        senderRole: data[0].sender_role,
        message: data[0].message,
        isInternalNote: data[0].is_internal_note,
        attachmentUrl: data[0].attachment_url,
        attachmentName: data[0].attachment_name,
        createdAt: data[0].created_at,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Update Ticket Status & Assignee
 */
export async function updateTicketStatusInSupabase(
  ticketId: string,
  newStatus: TicketStatus,
  changedBy: string = 'THIRUMALAI R K (Super Admin)',
  remarks?: string,
  assignedTo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'CLOSED' || newStatus === 'RESOLVED') {
      updates.closed_at = new Date().toISOString();
      if (remarks) updates.resolution_notes = remarks;
    }
    if (assignedTo) {
      updates.assigned_to = assignedTo;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Record status history
    await supabase.from('ticket_status_history').insert([
      {
        ticket_id: ticketId,
        new_status: newStatus,
        changed_by: changedBy,
        remarks: remarks || null,
      },
    ]);

    await logAuditEntry(
      'UPDATE_TICKET_STATUS',
      ticketId,
      `Ticket status changed to ${newStatus} by ${changedBy}. Remarks: ${remarks || 'None'}`
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

/**
 * Rate Resolved Ticket (CSAT)
 */
export async function rateTicketResolutionInSupabase(
  ticketId: string,
  rating: number,
  comments?: string
): Promise<boolean> {
  try {
    await supabase.from('support_tickets').update({
      rating: rating,
      feedback_comments: comments || null,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
    }).eq('id', ticketId);

    await logAuditEntry(
      'RATE_TICKET_RESOLUTION',
      ticketId,
      `Employee rated ticket resolution ${rating}/5 Stars. Feedback: ${comments || 'None'}`
    );

    return true;
  } catch (err) {
    console.warn('rateTicketResolutionInSupabase notice:', err);
    return false;
  }
}

/**
 * Helper to map DB Row to SupportTicket object
 */
function mapRowToTicket(row: any): SupportTicket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number || `TICK-${row.id.slice(0, 6)}`,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeEmail: row.employee_email,
    department: row.department,
    category: row.category,
    subCategory: row.sub_category,
    priority: row.priority || 'NORMAL',
    subject: row.subject,
    description: row.description,
    status: row.status || 'OPEN',
    assignedTo: row.assigned_to || 'Unassigned',
    assignedRole: row.assigned_role || 'HR Specialist',
    deviceName: row.device_name,
    location: row.location,
    preferredContact: row.preferred_contact,
    slaDeadline: row.sla_deadline,
    resolutionNotes: row.resolution_notes,
    rating: row.rating,
    feedbackComments: row.feedback_comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

/**
 * Subscribe to Supabase Realtime changes on support_tickets and ticket_messages
 */
export function subscribeToHelpdeskRealtime(onEvent: () => void) {
  const channel = supabase
    .channel('helpdesk-realtime-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
      onEvent();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, () => {
      onEvent();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
