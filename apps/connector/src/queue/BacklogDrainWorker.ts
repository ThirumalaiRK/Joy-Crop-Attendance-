import { AppDataSource, OfflineBacklog } from '../db';
import { AttendanceProcessor } from '../sync/AttendanceProcessor';

export class BacklogDrainWorker {
  private static instance: BacklogDrainWorker;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isDraining = false;

  private constructor() {}

  public static getInstance(): BacklogDrainWorker {
    if (!BacklogDrainWorker.instance) {
      BacklogDrainWorker.instance = new BacklogDrainWorker();
    }
    return BacklogDrainWorker.instance;
  }

  public start(intervalMs = 10000) {
    if (this.intervalTimer) return;
    console.log('🔄 [BacklogDrainWorker] Started offline backlog sync worker (10s interval)');
    this.intervalTimer = setInterval(() => this.drain(), intervalMs);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public async drain() {
    if (this.isDraining || !AppDataSource.isInitialized) return;
    this.isDraining = true;

    try {
      const repo = AppDataSource.getRepository(OfflineBacklog);
      const pending = await repo.find({
        where: { status: 'PENDING' },
        take: 50,
      });

      if (pending.length > 0) {
        console.log(`📦 [BacklogDrainWorker] Draining ${pending.length} offline buffered punch events to Supabase...`);

        for (const record of pending) {
          try {
            await AttendanceProcessor.processPunch({
              device_ip: record.device_ip,
              device_user_id: record.device_user_id,
              event_time: record.event_time,
              verification_type: record.verification_type,
              device_name: record.device_name,
            });

            // Delete from local SQLite on success
            await repo.remove(record);
            console.log(`✅ [BacklogDrainWorker] Successfully synced offline record ${record.id}`);
          } catch (err: any) {
            record.retry_count += 1;
            if (record.retry_count > 10) {
              record.status = 'FAILED';
            }
            await repo.save(record);
            console.warn(`⚠️ [BacklogDrainWorker] Failed to sync record ${record.id} (attempt ${record.retry_count}):`, err?.message);
          }
        }
      }
    } catch (err: any) {
      console.error('❌ [BacklogDrainWorker] Error during backlog drain:', err?.message || err);
    } finally {
      this.isDraining = false;
    }
  }
}

export const backlogDrainWorker = BacklogDrainWorker.getInstance();
