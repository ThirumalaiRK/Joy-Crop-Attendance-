import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AttendanceProcessor, RawPunchLog } from '../sync/AttendanceProcessor';
import { AppDataSource, OfflineBacklog } from '../db';
import { employeeCache } from '../cache/EmployeeCache';

export interface QueuedPunchEvent extends RawPunchLog {
  id: string;
  enqueued_at: number;
  retry_count: number;
}

export class EventQueue extends EventEmitter {
  private static instance: EventQueue;
  private queue: QueuedPunchEvent[] = [];
  private processing = false;
  private dedupeCache: Map<string, number> = new Map(); // key: "empId:ip", value: timestamp
  private DEDUPE_WINDOW_MS = 5000; // 5 seconds deduplication window

  private constructor() {
    super();
    // Cleanup dedupe cache periodically
    setInterval(() => this.cleanDedupeCache(), 10000);
  }

  public static getInstance(): EventQueue {
    if (!EventQueue.instance) {
      EventQueue.instance = new EventQueue();
    }
    return EventQueue.instance;
  }

  /**
   * Enqueue raw punch event from TCP packet (<5ms receive overhead)
   */
  public push(raw: RawPunchLog): boolean {
    const rawUserIdStr = String(raw.device_user_id).trim();
    if (!rawUserIdStr || rawUserIdStr === '0') return false;

    // 1. Deduplication check (5-second window in RAM)
    const dedupeKey = `${rawUserIdStr}:${raw.device_ip}`;
    const now = Date.now();
    const lastPunch = this.dedupeCache.get(dedupeKey);

    if (lastPunch && now - lastPunch < this.DEDUPE_WINDOW_MS) {
      console.log(`⏱️ [EventQueue] Deduplicated punch for ${rawUserIdStr} at ${raw.device_ip} (within 5s window)`);
      return false;
    }
    this.dedupeCache.set(dedupeKey, now);

    const event: QueuedPunchEvent = {
      ...raw,
      id: randomUUID(),
      enqueued_at: now,
      retry_count: 0,
    };

    // O(1) RAM employee resolution for zero-latency Socket.IO broadcast
    const cachedEmp = employeeCache.get(rawUserIdStr);
    const resolvedName = cachedEmp ? cachedEmp.name : `Employee ${rawUserIdStr}`;

    // 2. IMMEDIATE (<20ms) Realtime Broadcast over Socket.IO before DB write!
    this.emit('attendance:new', {
      id: event.id,
      device_user_id: rawUserIdStr,
      employee_id: cachedEmp?.employee_code || rawUserIdStr,
      employee_name: resolvedName,
      department: cachedEmp?.department || 'Engineering',
      device_ip: raw.device_ip,
      device_name: raw.device_name || `Identix K90 Pro (${raw.device_ip})`,
      event_time: raw.event_time,
      verification_type: raw.verification_type || 'fingerprint',
      received_at: new Date().toISOString(),
    });

    this.queue.push(event);
    this.processNext();
    return true;
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) break;

      try {
        await AttendanceProcessor.processPunch(event);
      } catch (err: any) {
        console.error(`❌ [EventQueue] Failed to process punch event ${event.id}:`, err?.message || err);

        // Fallback to local SQLite Offline Backlog buffer
        await this.bufferOffline(event);
      }
    }

    this.processing = false;
  }

  private async bufferOffline(event: QueuedPunchEvent) {
    try {
      const repo = AppDataSource.getRepository(OfflineBacklog);
      const record = new OfflineBacklog();
      record.id = event.id;
      record.device_ip = event.device_ip;
      record.device_user_id = String(event.device_user_id);
      record.event_time = new Date(event.event_time).toISOString();
      record.verification_type = event.verification_type || 'fingerprint';
      record.device_name = event.device_name || 'Biometric Terminal';
      record.status = 'PENDING';
      record.retry_count = event.retry_count + 1;
      record.created_at = new Date().toISOString();

      await repo.save(record);
      console.warn(`📦 [EventQueue] Buffered punch ${event.id} into local SQLite offline queue.`);
    } catch (dbErr: any) {
      console.error(`❌ [EventQueue] Critical: Could not write offline buffer:`, dbErr?.message || dbErr);
    }
  }

  private cleanDedupeCache() {
    const now = Date.now();
    for (const [key, ts] of this.dedupeCache.entries()) {
      if (now - ts > this.DEDUPE_WINDOW_MS) {
        this.dedupeCache.delete(key);
      }
    }
  }

  public size(): number {
    return this.queue.length;
  }
}

export const eventQueue = EventQueue.getInstance();
