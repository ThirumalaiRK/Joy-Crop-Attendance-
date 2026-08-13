import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AttendanceProcessor, RawPunchLog } from '../sync/AttendanceProcessor';
import { AppDataSource, OfflineBacklog } from '../db';
import { employeeCache } from '../cache/EmployeeCache';
import { parseDeviceTimeToUTC } from '../timezone';

export interface QueuedPunchEvent extends RawPunchLog {
  id: string;
  enqueued_at: number;
  retry_count: number;
}

export class EventQueue extends EventEmitter {
  private static instance: EventQueue;
  private queue: QueuedPunchEvent[] = [];
  private processing = false;

  /**
   * In-memory dedup: key = "deviceIp:deviceUserId:machineTs" → receipt epoch ms
   * Prevents duplicate real-time TCP pushes within a 10-second window.
   */
  private dedupeCache: Map<string, number> = new Map();
  private readonly DEDUPE_WINDOW_MS = 10_000;

  private constructor() {
    super();
    setInterval(() => this.cleanDedupeCache(), 15_000);
  }

  public static getInstance(): EventQueue {
    if (!EventQueue.instance) {
      EventQueue.instance = new EventQueue();
    }
    return EventQueue.instance;
  }

  /**
   * Enqueue a raw punch from TCP packet. Called <5ms after packet receipt.
   *
   * IMPORTANT: raw.machine_timestamp must be the exact device string (IST).
   * raw.received_at_utc is the agent receipt time — these are separate concepts.
   */
  public push(raw: RawPunchLog): boolean {
    const rawUserIdStr = String(raw.device_user_id || '').trim();
    const numericUid = parseInt(rawUserIdStr.replace(/\D/g, ''), 10);

    if (!rawUserIdStr || rawUserIdStr === '0' || isNaN(numericUid) || numericUid <= 0) {
      return false;
    }

    if (!raw.machine_timestamp) {
      console.warn(`[EventQueue] Rejected punch for user ${rawUserIdStr}: missing machine_timestamp.`);
      return false;
    }

    // In-memory dedup: same device + user + machine timestamp = same punch
    const dedupeKey = `${raw.device_ip}:${rawUserIdStr}:${raw.machine_timestamp}`;
    const now = Date.now();
    const lastSeen = this.dedupeCache.get(dedupeKey);

    if (lastSeen && now - lastSeen < this.DEDUPE_WINDOW_MS) {
      console.log(`⏱️ [EventQueue] Deduplicated punch for user ${rawUserIdStr} at ${raw.machine_timestamp}`);
      return false;
    }
    this.dedupeCache.set(dedupeKey, now);

    // Compute UTC from machine timestamp (Luxon explicit IST parse)
    let eventTimeUtc: string;
    try {
      eventTimeUtc = parseDeviceTimeToUTC(raw.machine_timestamp);
    } catch {
      console.warn(`[EventQueue] Could not parse machine_timestamp "${raw.machine_timestamp}" — rejecting.`);
      return false;
    }

    const event: QueuedPunchEvent = {
      ...raw,
      id: randomUUID(),
      enqueued_at: now,
      retry_count: 0,
    };

    // O(1) RAM employee resolution for zero-latency Socket.IO broadcast
    const cachedEmp = employeeCache.get(rawUserIdStr);
    const resolvedName = cachedEmp?.name || `Device User ${numericUid}`;

    // ── Immediate (<20ms) broadcast with machine timestamp ─────────────────
    // The UI receives machine_timestamp so it can display the exact punch time
    // without waiting for the DB write to complete.
    this.emit('attendance:new', {
      id:                event.id,
      device_user_id:    rawUserIdStr,
      employee_id:       cachedEmp?.employee_code || rawUserIdStr,
      employee_name:     resolvedName,
      department:        cachedEmp?.department || 'Engineering',
      device_ip:         raw.device_ip,
      device_name:       raw.device_name || `Biometric Terminal (${raw.device_ip})`,
      // machine_timestamp: exact IST string from device — display this in UI
      machine_timestamp: raw.machine_timestamp,
      // event_time_utc: for ordering/comparison only — do NOT display as punch time
      event_time_utc:    eventTimeUtc,
      verification_type: raw.verification_type || 'FINGERPRINT',
      received_at_utc:   raw.received_at_utc || new Date().toISOString(),
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
        console.error(`❌ [EventQueue] Failed to process punch ${event.id}:`, err?.message || err);
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
      record.machine_timestamp = event.machine_timestamp || (event.event_time ? String(event.event_time) : new Date().toISOString());
      record.event_time_utc = event.received_at_utc || '';
      record.machine_log_id = event.machine_log_id || '';
      record.verification_type = event.verification_type || 'FINGERPRINT';
      record.device_name = event.device_name || 'Biometric Terminal';
      record.raw_payload = event.raw_payload || '';
      record.status = 'PENDING';
      record.retry_count = event.retry_count + 1;
      record.created_at = new Date().toISOString();
      await repo.save(record);
      console.warn(`📦 [EventQueue] Buffered punch ${event.id} to SQLite offline queue.`);
    } catch (dbErr: any) {
      console.error(`❌ [EventQueue] Critical: Could not write offline buffer:`, dbErr?.message || dbErr);
    }
  }

  private cleanDedupeCache() {
    const now = Date.now();
    for (const [key, ts] of this.dedupeCache.entries()) {
      if (now - ts > this.DEDUPE_WINDOW_MS * 2) {
        this.dedupeCache.delete(key);
      }
    }
  }

  public size(): number {
    return this.queue.length;
  }
}

export const eventQueue = EventQueue.getInstance();
