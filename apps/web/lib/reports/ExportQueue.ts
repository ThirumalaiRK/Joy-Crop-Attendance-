/**
 * ExportQueue.ts
 *
 * Background export queue manager.
 * Tracks current active generations, supports export cancellation,
 * and maintains download history in localStorage.
 */

import { ReportBuilder, ReportFilter } from './ReportBuilder';

export interface ExportTask {
  id: string;
  reportType: 'ATTENDANCE' | 'EMPLOYEE' | 'DEVICE' | 'DEPARTMENT' | 'BRANCH' | 'VISITOR' | 'SECURITY' | 'API';
  format: 'PDF' | 'EXCEL' | 'CSV';
  timestamp: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  progress: number;
  message: string;
  filters: ReportFilter;
}

export class ExportQueue {
  private static instance: ExportQueue;
  private tasks: ExportTask[] = [];
  private listeners: Set<() => void> = new Set();
  private abortControllers: Map<string, boolean> = new Map(); // taskUrl/id -> isAborted

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): ExportQueue {
    if (!ExportQueue.instance) {
      ExportQueue.instance = new ExportQueue();
    }
    return ExportQueue.instance;
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('jrm_export_history');
      if (stored) {
        // Hydrate and reset any stuck generating tasks to failed/cancelled on reload
        const list = JSON.parse(stored) as ExportTask[];
        this.tasks = list.map(t => {
          if (t.status === 'GENERATING' || t.status === 'PENDING') {
            return { ...t, status: 'FAILED', message: 'Interrupted by session restart', progress: 0 };
          }
          return t;
        });
      }
    } catch (_) {}
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('jrm_export_history', JSON.stringify(this.tasks.slice(0, 50))); // Keep last 50
    } catch (_) {}
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
    this.saveToStorage();
  }

  public getTasks(): ExportTask[] {
    return [...this.tasks];
  }

  /**
   * Triggers background export task in queue
   */
  public async add(
    reportType: ExportTask['reportType'],
    format: ExportTask['format'],
    filters: ReportFilter
  ): Promise<string> {
    const id = `EXP-${Date.now()}`;
    const newTask: ExportTask = {
      id,
      reportType,
      format,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      status: 'PENDING',
      progress: 0,
      message: 'Added to download queue',
      filters
    };

    this.tasks = [newTask, ...this.tasks];
    this.abortControllers.set(id, false);
    this.notify();

    // Start background processor
    this.processTask(id);

    return id;
  }

  private async processTask(id: string) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    task.status = 'GENERATING';
    task.progress = 10;
    task.message = 'Initializing report...';
    this.notify();

    try {
      await ReportBuilder.generateReport(
        task.reportType,
        task.format,
        task.filters,
        (message, percent) => {
          // Check cancellation token
          if (this.abortControllers.get(id) === true) {
            throw new Error('ABORTED');
          }

          task.message = message;
          task.progress = percent;
          this.notify();
        }
      );

      // Verify final abort check
      if (this.abortControllers.get(id) === true) {
        throw new Error('ABORTED');
      }

      task.status = 'COMPLETED';
      task.progress = 100;
      task.message = 'Download ready';
      this.notify();
    } catch (err: any) {
      if (err.message === 'ABORTED') {
        task.status = 'CANCELLED';
        task.progress = 0;
        task.message = 'Export cancelled by administrator';
      } else {
        task.status = 'FAILED';
        task.progress = 0;
        task.message = err?.message || 'Database error occurred';
      }
      this.notify();
    } finally {
      this.abortControllers.delete(id);
    }
  }

  /**
   * Request task cancellation
   */
  public cancel(id: string) {
    if (this.abortControllers.has(id)) {
      this.abortControllers.set(id, true);
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.status = 'CANCELLED';
        task.message = 'Cancelling...';
        this.notify();
      }
    }
  }

  /**
   * Clears export log history
   */
  public clearHistory() {
    this.tasks = [];
    this.notify();
  }
}

export const exportQueue = ExportQueue.getInstance();
