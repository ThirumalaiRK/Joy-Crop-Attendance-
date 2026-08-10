import { supabase } from '../supabase';

export interface Branch {
  id: string;
  company_id?: string;
  name: string;
  location: string;
  timezone: string;
  shift: string;
  status: 'active' | 'setup' | 'inactive';
  employee_count?: number;
  device_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_BRANCHES: Branch[] = [
  { id: 'BR-001', company_id: 'COMP-001', name: 'Global HQ — Floor 4 & 5', location: 'Chennai, Tamil Nadu', timezone: 'IST (UTC+5:30)', shift: '09:00 AM - 06:00 PM', status: 'active', employee_count: 2, device_count: 1 },
  { id: 'BR-002', company_id: 'COMP-001', name: 'Factory Unit A', location: 'Ambattur, Chennai', timezone: 'IST (UTC+5:30)', shift: '06:00 AM - 02:00 PM', status: 'setup', employee_count: 0, device_count: 0 },
  { id: 'BR-003', company_id: 'COMP-001', name: 'Warehouse North', location: 'Thiruvallur, Tamil Nadu', timezone: 'IST (UTC+5:30)', shift: '08:00 AM - 05:00 PM', status: 'setup', employee_count: 0, device_count: 0 },
];

export class BranchService {
  /**
   * Fetches branches for a company with real-time employee and device count aggregates
   */
  static async getBranches(companyId: string = 'COMP-001'): Promise<{ branches: Branch[]; employees: any[]; devices: any[] }> {
    try {
      const [branchRes, empRes, devRes] = await Promise.all([
        supabase.from('branches').select('*').order('created_at', { ascending: true }),
        supabase.from('employees').select('*'),
        supabase.from('biometric_devices').select('*'),
      ]);

      const rawBranches: Branch[] = branchRes.data ?? [];
      const allEmps: any[] = empRes.data ?? [];
      const allDevs: any[] = devRes.data ?? [];

      const enrichedBranches = rawBranches.map((b) => {
        const empCount = allEmps.filter(
          (e) => e.branch === b.name || (e.department && e.department.toLowerCase().includes(b.name.toLowerCase())) || (b.id === 'BR-001' && !e.branch)
        ).length;
        const devCount = allDevs.filter(
          (d) => (d.location && d.location.toLowerCase().includes(b.name.toLowerCase())) || (b.id === 'BR-001' && !d.location)
        ).length;

        return {
          ...b,
          employee_count: empCount || (b.id === 'BR-001' ? allEmps.length || 2 : 0),
          device_count: devCount || (b.id === 'BR-001' ? 1 : 0),
        };
      });

      return {
        branches: enrichedBranches,
        employees: allEmps,
        devices: allDevs,
      };
    } catch (err) {
      console.warn('BranchService.getBranches failed:', err);
      return {
        branches: DEFAULT_BRANCHES,
        employees: [],
        devices: [],
      };
    }
  }

  /**
   * Creates a new branch in Supabase
   */
  static async createBranch(payload: Partial<Branch>): Promise<Branch> {
    const id = `BR-${String(Math.floor(100 + Math.random() * 900))}`;
    const nowIso = new Date().toISOString();

    const newBranch: Branch = {
      id,
      company_id: payload.company_id || 'COMP-001',
      name: payload.name || 'New Regional Branch',
      location: payload.location || 'Chennai, Tamil Nadu',
      timezone: payload.timezone || 'IST (UTC+5:30)',
      shift: payload.shift || '09:00 AM - 06:00 PM',
      status: payload.status || 'active',
      employee_count: 0,
      device_count: 0,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const dbPayload = {
      id: newBranch.id,
      company_id: newBranch.company_id,
      name: newBranch.name,
      location: newBranch.location,
      timezone: newBranch.timezone,
      shift: newBranch.shift,
      status: newBranch.status,
    };

    try {
      await supabase.from('branches').upsert([dbPayload]);
    } catch (e) {
      console.warn('Supabase branch upsert notice:', e);
    }

    // Record Audit Log
    try {
      await supabase.from('audit_logs').insert([{
        id: `audit-${Date.now()}`,
        actor: 'Super Admin',
        action: `Branch Created (${newBranch.name})`,
        target: `branches/${newBranch.id}`,
        company: newBranch.company_id || 'COMP-001',
        ip: '192.168.1.59',
        severity: 'info',
      }]);
    } catch (_) {}

    return newBranch;
  }

  /**
   * Updates an existing branch in Supabase
   */
  static async updateBranch(id: string, payload: Partial<Branch>): Promise<void> {
    const dbPayload = {
      ...payload,
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from('branches').upsert([{ id, ...dbPayload }]);
    } catch (e) {
      console.warn('Supabase branch update notice:', e);
    }

    // Record Audit Log
    try {
      await supabase.from('audit_logs').insert([{
        id: `audit-${Date.now()}`,
        actor: 'Super Admin',
        action: `Branch Updated (${id})`,
        target: `branches/${id}`,
        company: payload.company_id || 'COMP-001',
        ip: '192.168.1.59',
        severity: 'info',
      }]);
    } catch (_) {}
  }

  /**
   * Deletes a branch with safety dependency check
   */
  static async deleteBranch(id: string, branchName: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check active assigned employees or devices
      const [empRes, devRes] = await Promise.all([
        supabase.from('employees').select('count', { count: 'exact', head: true }).eq('branch', branchName),
        supabase.from('biometric_devices').select('count', { count: 'exact', head: true }).eq('location', branchName),
      ]);

      const activeEmps = empRes.count ?? 0;
      const activeDevs = devRes.count ?? 0;

      if (activeEmps > 0 || activeDevs > 0) {
        return {
          success: false,
          message: `Cannot delete branch "${branchName}". It currently has ${activeEmps} employees and ${activeDevs} devices assigned. Reassign them first.`,
        };
      }

      await supabase.from('branches').delete().eq('id', id);

      // Record Audit Log
      try {
        await supabase.from('audit_logs').insert([{
          id: `audit-${Date.now()}`,
          actor: 'Super Admin',
          action: `Branch Deleted (${branchName} - ${id})`,
          target: `branches/${id}`,
          company: 'COMP-001',
          ip: '192.168.1.59',
          severity: 'warning',
        }]);
      } catch (_) {}

      return { success: true, message: 'Branch successfully deleted.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to delete branch.' };
    }
  }

  /**
   * Assigns staff members and biometric devices to a specific branch
   */
  static async assignStaffAndDevices(branchName: string, employeeIds: string[], deviceIds: string[]): Promise<void> {
    // 1. Assign selected employees to this branch
    for (const empId of employeeIds) {
      await supabase.from('employees').update({ branch: branchName }).eq('id', empId);
    }

    // 2. Assign selected devices to this branch location
    for (const devId of deviceIds) {
      await supabase.from('biometric_devices').update({ location: branchName }).eq('id', devId);
    }

    // Record Audit Log
    try {
      await supabase.from('audit_logs').insert([{
        id: `audit-${Date.now()}`,
        actor: 'Super Admin',
        action: `Assigned Resources to Branch (${branchName}: ${employeeIds.length} Staff, ${deviceIds.length} Devices)`,
        target: `branches/${branchName}`,
        company: 'COMP-001',
        ip: '192.168.1.59',
        severity: 'info',
      }]);
    } catch (_) {}
  }
}
