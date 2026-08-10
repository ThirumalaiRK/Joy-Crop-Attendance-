import { supabase } from '../supabase';

export interface CachedEmployee {
  id: string;
  employee_code: string;
  device_user_id?: string;
  name: string;
  department?: string;
  designation?: string;
  email?: string;
  phone?: string;
  status: string;
}

export class EmployeeCache {
  private static instance: EmployeeCache;
  private cache: Map<string, CachedEmployee> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): EmployeeCache {
    if (!EmployeeCache.instance) {
      EmployeeCache.instance = new EmployeeCache();
    }
    return EmployeeCache.instance;
  }

  public clear(): void {
    this.cache.clear();
    this.isInitialized = false;
  }

  /** Warm up RAM cache from Supabase on connector startup */
  public async initialize(): Promise<void> {
    try {
      console.log('⚡ [EmployeeCache] Pre-loading employees into RAM cache...');
      const { data, error } = await supabase.from('employees').select('*');
      if (error) {
        console.warn('⚠️ [EmployeeCache] Failed to load employees from Supabase:', error.message);
        return;
      }

      this.cache.clear();
      if (data) {
        for (const emp of data) {
          this.setEmployeeInCache(emp);
        }
      }

      this.isInitialized = true;
      console.log(`✅ [EmployeeCache] Loaded ${data?.length || 0} employee records into RAM cache (${this.cache.size} lookup keys).`);

      // Real-time synchronization for changes to employees table
      this.subscribeRealtime();
    } catch (err: any) {
      console.error('❌ [EmployeeCache] Error initializing RAM cache:', err?.message || err);
    }
  }

  private setEmployeeInCache(emp: CachedEmployee) {
    if (!emp) return;
    if (emp.id) this.cache.set(emp.id, emp);
    if (emp.employee_code) {
      this.cache.set(emp.employee_code, emp);
      // Also map numeric unpadded variations (e.g. EMP-10 <-> EMP-000010 <-> 10)
      const numericUid = parseInt(emp.employee_code.replace(/\D/g, ''), 10);
      if (!isNaN(numericUid)) {
        this.cache.set(String(numericUid), emp);
        this.cache.set(`EMP-${numericUid}`, emp);
        this.cache.set(`EMP-${String(numericUid).padStart(6, '0')}`, emp);
      }
    }
    if (emp.device_user_id) {
      this.cache.set(emp.device_user_id, emp);
      const numericDevUid = parseInt(emp.device_user_id.replace(/\D/g, ''), 10);
      if (!isNaN(numericDevUid)) {
        this.cache.set(String(numericDevUid), emp);
      }
    }
  }

  /** Synchronous O(1) RAM lookup (<1ms latency) */
  public get(key: string | number): CachedEmployee | undefined {
    if (!key) return undefined;
    const strKey = String(key).trim();
    let emp = this.cache.get(strKey);
    if (emp) return emp;

    // Fallback numeric check
    const numericUid = parseInt(strKey.replace(/\D/g, ''), 10);
    if (!isNaN(numericUid)) {
      return (
        this.cache.get(String(numericUid)) ||
        this.cache.get(`EMP-${numericUid}`) ||
        this.cache.get(`EMP-${String(numericUid).padStart(6, '0')}`)
      );
    }
    return undefined;
  }

  public set(emp: CachedEmployee): void {
    this.setEmployeeInCache(emp);
  }

  public size(): number {
    return this.cache.size;
  }

  private subscribeRealtime(): void {
    try {
      supabase
        .channel('employee-cache-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log(`⚡ [EmployeeCache] Realtime update for employee ${payload.new.name || payload.new.employee_code}`);
            this.setEmployeeInCache(payload.new as CachedEmployee);
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log(`⚡ [EmployeeCache] Realtime delete for employee ${payload.old.id}`);
            this.cache.delete(payload.old.id);
            if (payload.old.employee_code) this.cache.delete(payload.old.employee_code);
          }
        })
        .subscribe();
    } catch (_) {}
  }
}

export const employeeCache = EmployeeCache.getInstance();
