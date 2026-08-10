import { supabase, logAuditEntry } from '../supabase';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'BROWSER_PUSH';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientRole: string;
  title: string;
  body: string;
  category: 'ATTENDANCE' | 'WORKFLOW' | 'LEAVE' | 'SUPPORT' | 'SYSTEM' | 'DEVICE';
  priority: NotificationPriority;
  channel: NotificationChannel;
  isRead: boolean;
  actionUrl?: string;
  metadata?: any;
  createdAt: string;
}

// In-memory notification store (backed by Supabase)
let notificationsStore: AppNotification[] = [];

/**
 * Push a new notification — saves to Supabase + updates in-memory store
 */
export async function pushNotification(
  payload: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>
): Promise<AppNotification> {
  const notification: AppNotification = {
    ...payload,
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  notificationsStore = [notification, ...notificationsStore];

  // Try to persist to Supabase notifications table if it exists
  try {
    await supabase.from('notifications').insert([
      {
        id: notification.id,
        recipient_id: notification.recipientId,
        recipient_name: notification.recipientName,
        recipient_role: notification.recipientRole,
        title: notification.title,
        body: notification.body,
        category: notification.category,
        priority: notification.priority,
        channel: notification.channel,
        is_read: false,
        action_url: notification.actionUrl || null,
        metadata: notification.metadata || {},
        created_at: notification.createdAt,
      },
    ]);
  } catch (err) {
    // Table may not exist yet — just use in-memory
  }

  return notification;
}

/**
 * Fetch notifications for a given recipient
 */
export async function fetchNotificationsFromSupabase(
  recipientId: string,
  limit = 50
): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return notificationsStore.filter((n) => n.recipientId === recipientId);

    return data.map((row) => ({
      id: row.id,
      recipientId: row.recipient_id,
      recipientName: row.recipient_name,
      recipientRole: row.recipient_role,
      title: row.title,
      body: row.body,
      category: row.category,
      priority: row.priority,
      channel: row.channel,
      isRead: row.is_read,
      actionUrl: row.action_url,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));
  } catch {
    return notificationsStore.filter((n) => n.recipientId === recipientId);
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  const n = notificationsStore.find((x) => x.id === notificationId);
  if (n) n.isRead = true;

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  } catch {}
}

/**
 * Mark all notifications as read for a recipient
 */
export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  notificationsStore
    .filter((n) => n.recipientId === recipientId)
    .forEach((n) => (n.isRead = true));

  try {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', recipientId);
  } catch {}
}

/**
 * Subscribe to realtime notification events for a given recipient
 */
export function subscribeToNotifications(recipientId: string, onNew: () => void): () => void {
  try {
    const channel = supabase
      .channel(`notifications-${recipientId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${recipientId}` },
        () => { onNew(); }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  } catch {
    return () => {};
  }
}

/**
 * Workflow events — notify manager when employee submits correction request
 */
export async function notifyWorkflowSubmitted(
  employeeName: string,
  managerId: string,
  managerName: string,
  requestNumber: string,
  subType: string
) {
  await pushNotification({
    recipientId: managerId,
    recipientName: managerName,
    recipientRole: 'ReportingManager',
    title: `🔔 New Correction Request from ${employeeName}`,
    body: `${employeeName} submitted ${requestNumber}: ${subType}. SLA: 4 hours. Please review.`,
    category: 'WORKFLOW',
    priority: 'HIGH',
    channel: 'IN_APP',
    actionUrl: '/manager?tab=approvals',
    metadata: { requestNumber, subType, employeeName },
  });
}

/**
 * Notify employee when manager approves/rejects their request
 */
export async function notifyWorkflowStatusChanged(
  employeeId: string,
  employeeName: string,
  requestNumber: string,
  newStatus: 'APPROVED' | 'REJECTED',
  actorName: string
) {
  await pushNotification({
    recipientId: employeeId,
    recipientName: employeeName,
    recipientRole: 'Employee',
    title: newStatus === 'APPROVED'
      ? `✅ Correction ${requestNumber} Approved`
      : `❌ Correction ${requestNumber} Rejected`,
    body: newStatus === 'APPROVED'
      ? `${actorName} approved your attendance correction. Your calendar has been updated.`
      : `${actorName} rejected your attendance correction. Please resubmit with more details.`,
    category: 'WORKFLOW',
    priority: 'HIGH',
    channel: 'IN_APP',
    actionUrl: '/portal?tab=calendar',
    metadata: { requestNumber, newStatus },
  });
}
