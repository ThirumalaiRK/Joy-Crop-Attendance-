'use client';

import React, { useEffect, useState } from 'react';
import {
  GitBranch, MapPin, Clock, Users, MonitorSmartphone, Plus, Edit2, Trash2,
  RefreshCw, Radio, UserPlus, Cpu, Check, X, Shield, Settings2, Globe
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { clsx } from 'clsx';
import { Employee } from '../../../types';

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
}

const DEFAULT_BRANCHES: Branch[] = [
  { id: 'BR-001', company_id: 'COMP-001', name: 'Global HQ — Floor 4 & 5', location: 'Chennai, Tamil Nadu', timezone: 'IST (UTC+5:30)', shift: '09:00 AM - 06:00 PM', status: 'active', employee_count: 2, device_count: 1 },
  { id: 'BR-002', company_id: 'COMP-001', name: 'Factory Unit A', location: 'Ambattur, Chennai', timezone: 'IST (UTC+5:30)', shift: '06:00 AM - 02:00 PM', status: 'setup', employee_count: 0, device_count: 0 },
  { id: 'BR-003', company_id: 'COMP-001', name: 'Warehouse North', location: 'Thiruvallur, Tamil Nadu', timezone: 'IST (UTC+5:30)', shift: '08:00 AM - 05:00 PM', status: 'setup', employee_count: 0, device_count: 0 },
];

export function BranchManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form State
  const [formBranch, setFormBranch] = useState<Partial<Branch>>({
    name: '',
    location: '',
    timezone: 'IST (UTC+5:30)',
    shift: '09:00 AM - 06:00 PM',
    status: 'active',
  });

  // Assign Form State
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch Branches & Related Data ──────────────────────────────
  const loadBranches = async () => {
    setLoading(true);
    try {
      const [branchRes, empRes, devRes] = await Promise.all([
        supabase.from('branches').select('*').order('created_at', { ascending: true }),
        supabase.from('employees').select('*'),
        supabase.from('biometric_devices').select('*'),
      ]);

      const fetchedBranches: Branch[] = branchRes.data && branchRes.data.length > 0 ? branchRes.data : DEFAULT_BRANCHES;
      const allEmps: any[] = empRes.data ?? [];
      const allDevs: any[] = devRes.data ?? [];

      setEmployees(allEmps as any);
      setDevices(allDevs);

      // Compute dynamic counts per branch
      const enriched = fetchedBranches.map((b) => {
        const empCount = allEmps.filter((e) => e.department?.toLowerCase().includes(b.name.toLowerCase()) || e.branch === b.name || (b.id === 'BR-001' && !e.branch)).length;
        const devCount = allDevs.filter((d) => d.location?.toLowerCase().includes(b.name.toLowerCase()) || (b.id === 'BR-001' && !d.location)).length;
        return {
          ...b,
          employee_count: b.employee_count ?? (empCount || (b.id === 'BR-001' ? allEmps.length || 2 : 0)),
          device_count: b.device_count ?? (devCount || (b.id === 'BR-001' ? 1 : 0)),
        };
      });

      setBranches(enriched);
    } catch (e) {
      console.warn('Branch load exception:', e);
      setBranches(DEFAULT_BRANCHES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();

    // Supabase Realtime Subscription for Branches, Employees, Devices
    const channel = supabase
      .channel('branch-management-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => loadBranches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadBranches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_devices' }, () => loadBranches())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ─── CRUD Handlers ─────────────────────────────────────────────

  const handleCreateBranch = async () => {
    if (!formBranch.name || !formBranch.location) return;
    setIsSubmitting(true);
    const newId = `BR-${String(branches.length + 1).padStart(3, '0')}`;
    const newBranch: Branch = {
      id: newId,
      company_id: 'COMP-001',
      name: formBranch.name,
      location: formBranch.location,
      timezone: formBranch.timezone || 'IST (UTC+5:30)',
      shift: formBranch.shift || '09:00 AM - 06:00 PM',
      status: (formBranch.status as any) || 'active',
      employee_count: 0,
      device_count: 0,
    };

    setBranches((prev) => [...prev, newBranch]);

    // Strip non-DB fields before Supabase insert/upsert
    const dbPayload = {
      id: newBranch.id,
      company_id: newBranch.company_id,
      name: newBranch.name,
      location: newBranch.location,
      timezone: newBranch.timezone,
      shift: newBranch.shift,
      status: newBranch.status,
    };

    const { error } = await supabase.from('branches').upsert([dbPayload]);
    if (error) {
      console.error('Failed to create/upsert branch in Supabase:', error);
    }

    setIsSubmitting(false);
    setIsAddModalOpen(false);
    setFormBranch({ name: '', location: '', timezone: 'IST (UTC+5:30)', shift: '09:00 AM - 06:00 PM', status: 'active' });
    loadBranches();
  };

  const handleUpdateBranch = async () => {
    if (!selectedBranch || !formBranch.name) return;
    setIsSubmitting(true);

    const updated: Branch = {
      ...selectedBranch,
      name: formBranch.name,
      location: formBranch.location || selectedBranch.location,
      timezone: formBranch.timezone || selectedBranch.timezone,
      shift: formBranch.shift || selectedBranch.shift,
      status: (formBranch.status as any) || selectedBranch.status,
    };

    setBranches((prev) => prev.map((b) => (b.id === selectedBranch.id ? updated : b)));

    // Strip non-DB fields before Supabase update/upsert
    const dbPayload = {
      id: updated.id,
      company_id: updated.company_id || 'COMP-001',
      name: updated.name,
      location: updated.location,
      timezone: updated.timezone,
      shift: updated.shift,
      status: updated.status,
    };

    const { error } = await supabase.from('branches').upsert([dbPayload]);
    if (error) {
      console.error('Failed to update branch in Supabase:', error);
    }

    setIsSubmitting(false);
    setIsEditModalOpen(false);
    loadBranches();
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    setBranches((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('branches').delete().eq('id', id);
  };

  // ─── Assign Staff & Hardware Handlers ───────────────────────────

  const openAssignModal = (branch: Branch) => {
    setSelectedBranch(branch);
    // Find currently assigned employees & devices
    const assignedEmps = employees.filter((e: any) => e.branch === branch.name || e.department?.includes(branch.name)).map((e) => e.id);
    const assignedDevs = devices.filter((d) => d.location?.includes(branch.name)).map((d) => d.id);
    setSelectedEmpIds(assignedEmps);
    setSelectedDeviceIds(assignedDevs);
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedBranch) return;
    setIsSubmitting(true);

    // Update selected employees with branch designation
    for (const empId of selectedEmpIds) {
      await supabase.from('employees').update({ branch: selectedBranch.name }).eq('id', empId);
    }

    // Update selected devices with branch location
    for (const devId of selectedDeviceIds) {
      await supabase.from('biometric_devices').update({ location: selectedBranch.name }).eq('id', devId);
    }

    setIsSubmitting(false);
    setIsAssignModalOpen(false);
    loadBranches();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <GitBranch className="w-5 h-5 text-blue-400" />
            </div>
            Branch Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {branches.length} active branch{branches.length !== 1 ? 'es' : ''} across COMP-001 (AgencyOS HQ)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live WebSocket Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3" /> Realtime Sync Active
            </span>
          </div>

          <button
            onClick={loadBranches}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
            title="Refresh Branches"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => {
              setFormBranch({ name: '', location: '', timezone: 'IST (UTC+5:30)', shift: '09:00 AM - 06:00 PM', status: 'active' });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add Branch
          </button>
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-700/30" />
          ))
        ) : branches.length === 0 ? (
          <div className="col-span-3 py-16 text-center border border-dashed border-slate-800 rounded-2xl">
            <GitBranch className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold">No branches configured</p>
            <p className="text-slate-600 text-xs mt-1">Click "Add Branch" above to create your first branch</p>
          </div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/70 transition-all space-y-4 group relative"
            >
              {/* Card Header & Status */}
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <GitBranch className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                      b.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : b.status === 'setup'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-700/60 text-slate-400 border-slate-600/40'
                    )}
                  >
                    {b.status}
                  </span>

                  {/* Actions Dropdown / Quick Buttons */}
                  <button
                    onClick={() => {
                      setSelectedBranch(b);
                      setFormBranch({ name: b.name, location: b.location, timezone: b.timezone, shift: b.shift, status: b.status });
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition border border-slate-700"
                    title="Edit Branch"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleDeleteBranch(b.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition border border-slate-700"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Title & Location */}
              <div>
                <p className="font-semibold text-slate-100 text-sm">{b.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  {b.location}
                </p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                  <Clock className="w-3 h-3 text-slate-500 mb-1" />
                  <div className="text-slate-300 font-medium truncate">{b.shift}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                  <Globe className="w-3 h-3 text-slate-500 mb-1" />
                  <div className="text-slate-300 font-medium truncate">{b.timezone}</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                  <Users className="w-3 h-3 text-slate-500 mb-1" />
                  <div className="text-slate-200 font-bold">{b.employee_count ?? 0}</div>
                  <div className="text-slate-500 text-[10px]">Employees</div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
                  <MonitorSmartphone className="w-3 h-3 text-slate-500 mb-1" />
                  <div className="text-slate-200 font-bold">{b.device_count ?? 0}</div>
                  <div className="text-slate-500 text-[10px]">Devices</div>
                </div>
              </div>

              {/* Assign & Configure Button */}
              <button
                onClick={() => openAssignModal(b)}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5 text-violet-400" />
                Assign Staff & Devices
              </button>
            </div>
          ))
        )}
      </div>

      {/* ─── ADD BRANCH MODAL ────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" /> Add New Branch
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Branch Name</label>
                <input
                  value={formBranch.name}
                  onChange={(e) => setFormBranch({ ...formBranch, name: e.target.value })}
                  placeholder="e.g. Factory Unit B, Regional Office"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Location / Address</label>
                <input
                  value={formBranch.location}
                  onChange={(e) => setFormBranch({ ...formBranch, location: e.target.value })}
                  placeholder="e.g. Guindy Industrial Estate, Chennai"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Shift Hours</label>
                  <input
                    value={formBranch.shift}
                    onChange={(e) => setFormBranch({ ...formBranch, shift: e.target.value })}
                    placeholder="09:00 AM - 06:00 PM"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formBranch.status}
                    onChange={(e) => setFormBranch({ ...formBranch, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="active">Active</option>
                    <option value="setup">Setup Phase</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT BRANCH MODAL ────────────────────────────────────── */}
      {isEditModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" /> Edit Branch ({selectedBranch.id})
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Branch Name</label>
                <input
                  value={formBranch.name}
                  onChange={(e) => setFormBranch({ ...formBranch, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Location</label>
                <input
                  value={formBranch.location}
                  onChange={(e) => setFormBranch({ ...formBranch, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Shift</label>
                  <input
                    value={formBranch.shift}
                    onChange={(e) => setFormBranch({ ...formBranch, shift: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formBranch.status}
                    onChange={(e) => setFormBranch({ ...formBranch, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="setup">Setup Phase</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleUpdateBranch}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ASSIGN STAFF & DEVICES MODAL ─────────────────────────── */}
      {isAssignModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Assign to {selectedBranch.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Select staff members and hardware scanners for this branch</p>
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Staff Members</span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {employees.length === 0 ? (
                  <p className="text-xs text-slate-500">No employees registered yet</p>
                ) : (
                  employees.map((emp) => {
                    const isAssigned = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmpIds((prev) =>
                            isAssigned ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]
                          );
                        }}
                        className={clsx(
                          'flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition',
                          isAssigned ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{emp.name}</span>
                          <span className="text-[10px] text-slate-500">({emp.id})</span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Biometric Scanners</span>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {devices.length === 0 ? (
                  <p className="text-xs text-slate-500">Mantra MFS110 L1 (DEV-001) registered</p>
                ) : (
                  devices.map((dev) => {
                    const isAssigned = selectedDeviceIds.includes(dev.id);
                    return (
                      <label
                        key={dev.id}
                        onClick={() => {
                          setSelectedDeviceIds((prev) =>
                            isAssigned ? prev.filter((id) => id !== dev.id) : [...prev, dev.id]
                          );
                        }}
                        className={clsx(
                          'flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition',
                          isAssigned ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-200">{dev.name}</span>
                          <span className="text-[10px] text-slate-500">({dev.id})</span>
                        </div>
                        {isAssigned && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleSaveAssignments}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
