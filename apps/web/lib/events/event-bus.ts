import { supabase } from '../supabase';

export type EnterpriseEventType =
  | 'ATTENDANCE_CHECK_IN'
  | 'ATTENDANCE_CHECK_OUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'WORKFLOW_SUBMITTED'
  | 'WORKFLOW_APPROVED'
  | 'WORKFLOW_REJECTED'
  | 'TICKET_CREATED'
  | 'TICKET_RESOLVED'
  | 'DEVICE_STATUS_CHANGED'
  | 'DEVICE_ONLINE'
  | 'DEVICE_OFFLINE'
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_UPDATED'
  | 'NOTIFICATION_SENT'
  | 'LEAVE_SUBMITTED'
  | 'LEAVE_APPROVED'
  | 'LEAVE_REJECTED';

export interface EnterpriseEvent {
  id: string;
  type: EnterpriseEventType;
  payload: any;
  senderId?: string;
  senderName?: string;
  department?: string;
  timestamp: string;
}

type EventListener = (event: EnterpriseEvent) => void;

/**
 * EnterpriseEventBus — Central pub/sub backbone for JRM HRMS.
 *
 * Architecture:
 *  - Supabase Realtime Postgres changes → dispatch to all local listeners.
 *  - Local publish() → dispatch immediately (in-process, zero latency).
 *  - Wildcard '*' listener receives ALL events (used by audit log, analytics).
 *  - Singleton pattern — one instance across the entire app.
 *
 * Flow:
 *  Biometric Scan → attendance_logs INSERT → Supabase Realtime →
 *  → EventBus.ATTENDANCE_CHECK_IN → all portal listeners refresh instantly
 */
class EnterpriseEventBus {
  private listeners: Map<EnterpriseEventType | '*', Set<EventListener>> = new Map();
  private isSubscribed: boolean = false;
  private history: EnterpriseEvent[] = [];
  private readonly MAX_HISTORY = 100;

  constructor() {
    // Lazy init — only start Supabase bridge in browser
    if (typeof window !== 'undefined') {
      // Slight delay to avoid hydration race conditions
      setTimeout(() => this.initRealtimeBridge(), 300);
    }
  }

  /**
   * Subscribe to a specific event type or '*' for all events.
   * Returns an unsubscribe function.
   */
  public subscribe(eventType: EnterpriseEventType | '*', listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Publish an event — dispatches locally to all subscribers.
   * Also adds to history ring-buffer.
   */
  public publish(
    type: EnterpriseEventType,
    payload: any,
    senderId?: string,
    senderName?: string,
    department?: string
  ) {
    const evt: EnterpriseEvent = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      senderId,
      senderName,
      department,
      timestamp: new Date().toISOString(),
    };

    // Ring-buffer history
    this.history = [evt, ...this.history].slice(0, this.MAX_HISTORY);

    this.dispatchLocal(evt);
  }

  /**
   * Get recent event history (up to MAX_HISTORY entries).
   */
  public getHistory(filterType?: EnterpriseEventType): EnterpriseEvent[] {
    if (!filterType) return [...this.history];
    return this.history.filter((e) => e.type === filterType);
  }

  /**
   * Dispatch to all local listeners synchronously.
   */
  private dispatchLocal(evt: EnterpriseEvent) {
    // Specific type listeners
    const specific = this.listeners.get(evt.type);
    if (specific) {
      specific.forEach((fn) => {
        try { fn(evt); } catch {}
      });
    }

    // Wildcard '*' listeners
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach((fn) => {
        try { fn(evt); } catch {}
      });
    }
  }

  /**
   * Supabase Realtime Bridge — maps DB change events to EnterpriseEvents.
   * Biometric device → DB INSERT → this bridge → all portal components update.
   */
  private initRealtimeBridge() {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    try {
      supabase
        .channel('enterprise-event-bus-v2')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_events' }, (payload) => {
          const row = payload.new as any;
          const evtType: EnterpriseEventType =
            row.event_type === 'CHECK_OUT' ? 'ATTENDANCE_CHECK_OUT' :
            row.event_type === 'BREAK_START' ? 'BREAK_START' :
            row.event_type === 'BREAK_END' ? 'BREAK_END' :
            row.event_type === 'LUNCH_START' ? 'LUNCH_START' :
            row.event_type === 'LUNCH_END' ? 'LUNCH_END' :
            'ATTENDANCE_CHECK_IN';
          this.publish(evtType, row, row.employee_id, row.employee_name, row.department);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, (payload) => {
          const row = payload.new as any;
          const evtType: EnterpriseEventType =
            row.event_type === 'CHECK_OUT' ? 'ATTENDANCE_CHECK_OUT' :
            row.event_type === 'BREAK_START' ? 'BREAK_START' :
            row.event_type === 'BREAK_END' ? 'BREAK_END' :
            'ATTENDANCE_CHECK_IN';
          this.publish(evtType, row, row.employee_id, row.employee_name);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_requests' }, (payload) => {
          const row = payload.new as any;
          const evtType: EnterpriseEventType =
            row?.approval_status === 'APPROVED' ? 'WORKFLOW_APPROVED' :
            row?.approval_status === 'REJECTED' ? 'WORKFLOW_REJECTED' :
            'WORKFLOW_SUBMITTED';
          this.publish(evtType, row, row?.employee_id, row?.employee_name);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
          this.publish('TICKET_CREATED', payload.new, (payload.new as any)?.employee_id);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employees' }, (payload) => {
          this.publish('EMPLOYEE_CREATED', payload.new, (payload.new as any)?.id, (payload.new as any)?.name);
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'employees' }, (payload) => {
          this.publish('EMPLOYEE_UPDATED', payload.new, (payload.new as any)?.id, (payload.new as any)?.name);
        })
        .subscribe();
    } catch (err) {
      console.warn('[EventBus] Realtime Bridge init notice:', err);
    }
  }
}

// Singleton instance — shared across all portals
export const eventBus = new EnterpriseEventBus();
