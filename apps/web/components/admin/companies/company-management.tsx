'use client';

import React, { useEffect, useState } from 'react';
import {
  Layers, Plus, Settings, Users, MonitorSmartphone, ExternalLink,
  Shield, Zap, RefreshCw, Radio, Check, X, Trash2, Edit2, AlertTriangle, Building
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Company, CompanyService } from '../../../lib/services/company-service';
import { clsx } from 'clsx';

export function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'OFFLINE'>('CONNECTED');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Form State
  const [formCompany, setFormCompany] = useState<Partial<Company>>({
    name: '',
    code: '',
    plan: 'Enterprise',
    status: 'Active',
    contact_email: '',
    renewal_date: '2027-01-01',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ─── Fetch Companies Data ──────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await CompanyService.getCompanies();
      setCompanies(data);
      setRealtimeStatus('CONNECTED');
    } catch (err) {
      console.warn('Failed to load companies:', err);
      setRealtimeStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime Subscription for Companies, Employees, Devices, Branches
    const companyChannel = supabase
      .channel('company-mgmt-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        setRealtimeStatus('CONNECTED');
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_devices' }, () => loadData())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('CONNECTED');
        else if (status === 'TIMED_OUT') setRealtimeStatus('RECONNECTING');
        else if (status === 'CLOSED') setRealtimeStatus('OFFLINE');
      });

    return () => {
      supabase.removeChannel(companyChannel);
    };
  }, []);

  // ─── CRUD Handlers ─────────────────────────────────────────────

  const handleCreateCompany = async () => {
    if (!formCompany.name || !formCompany.contact_email) {
      showToast('Please provide company name and admin contact email', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await CompanyService.createCompany(formCompany);
      setCompanies((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormCompany({ name: '', code: '', plan: 'Enterprise', status: 'Active', contact_email: '', renewal_date: '2027-01-01' });
      showToast(`Company "${created.name}" created successfully!`);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create company', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany || !formCompany.name) return;

    setIsSubmitting(true);
    try {
      await CompanyService.updateCompany(selectedCompany.id, formCompany);
      setIsEditModalOpen(false);
      showToast(`Company "${formCompany.name}" updated successfully!`);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to update company', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    setIsSubmitting(true);
    try {
      const result = await CompanyService.deleteCompany(selectedCompany.id);
      if (!result.success) {
        showToast(result.message, 'error');
      } else {
        setIsDeleteModalOpen(false);
        showToast(result.message);
        loadData();
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete company', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = async (comp: Company) => {
    await CompanyService.impersonateCompany(comp.id, comp.name);
    showToast(`Super Admin session logged in as tenant: ${comp.name}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={clsx(
            'fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-3',
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          )}
        >
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Building className="w-5 h-5 text-violet-400" />
            </div>
            Company Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage tenant companies across the platform</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live WebSocket Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <span
              className={clsx(
                'w-2 h-2 rounded-full shrink-0',
                realtimeStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' :
                realtimeStatus === 'RECONNECTING' ? 'bg-amber-400 animate-ping' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 text-violet-400" />
              {realtimeStatus === 'CONNECTED' ? 'Realtime Sync Active' : realtimeStatus === 'RECONNECTING' ? 'Reconnecting...' : 'Offline'}
            </span>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
            title="Refresh Companies"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => {
              setFormCompany({ name: '', code: '', plan: 'Enterprise', status: 'Active', contact_email: '', renewal_date: '2027-01-01' });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Company
          </button>
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="h-64 rounded-2xl bg-slate-900/40 animate-pulse border border-slate-800/60" />
      ) : companies.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl">
          <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold">No companies configured</p>
          <p className="text-slate-600 text-xs mt-1">Click "+ Add Company" above to register your first tenant</p>
        </div>
      ) : (
        companies.map((comp) => (
          <div key={comp.id} className="p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 space-y-6">
            {/* Company Card Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl p-3 rounded-2xl bg-slate-900/60 border border-slate-800">{comp.logo || '🏢'}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-white">{comp.name}</h2>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                        comp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        comp.status === 'Setup' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      )}
                    >
                      {comp.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {comp.plan}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">ID: {comp.id} · {comp.contact_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleImpersonate(comp)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 transition text-xs font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Login As
                </button>

                <button
                  onClick={() => {
                    setSelectedCompany(comp);
                    setFormCompany({
                      name: comp.name,
                      code: comp.code || comp.id,
                      plan: comp.plan,
                      status: comp.status,
                      contact_email: comp.contact_email,
                      renewal_date: comp.renewal_date,
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition text-xs font-medium"
                >
                  <Settings className="w-3.5 h-3.5" /> Configure
                </button>

                <button
                  onClick={() => {
                    setSelectedCompany(comp);
                    setIsDeleteModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition border border-slate-700"
                  title="Delete Company"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Employees', value: comp.employees_count ?? 0, icon: Users, color: 'text-emerald-400' },
                { label: 'Devices', value: comp.devices_count ?? 0, icon: MonitorSmartphone, color: 'text-cyan-400' },
                { label: 'Fingerprints', value: comp.fingerprints_count ?? 0, icon: Shield, color: 'text-violet-400' },
                { label: 'Attendance Records', value: comp.attendance_count ?? 0, icon: Zap, color: 'text-amber-400' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/60">
                    <Icon className={`w-4 h-4 mb-2 ${item.color}`} />
                    <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.label}</div>
                  </div>
                );
              })}
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {[
                { label: 'Branches', value: comp.branches_count ?? 0 },
                { label: 'Storage Used', value: comp.storage_used || '4.2 GB' },
                { label: 'API Usage', value: comp.api_usage || '28 / 10,000' },
                { label: 'Plan Renewal', value: comp.renewal_date || '2027-01-01' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40">
                  <div className="text-slate-500 text-[10px] uppercase tracking-wider">{item.label}</div>
                  <div className="text-slate-200 font-semibold mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ─── ADD COMPANY MODAL ────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-violet-400" /> Add New Tenant Company
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Company Name</label>
                <input
                  value={formCompany.name}
                  onChange={(e) => setFormCompany({ ...formCompany, name: e.target.value })}
                  placeholder="e.g. Joy Logistics Pvt. Ltd."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Admin Contact Email</label>
                <input
                  type="email"
                  value={formCompany.contact_email}
                  onChange={(e) => setFormCompany({ ...formCompany, contact_email: e.target.value })}
                  placeholder="admin@joylogistics.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subscription Plan</label>
                  <select
                    value={formCompany.plan}
                    onChange={(e) => setFormCompany({ ...formCompany, plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Pro">Pro</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Initial Status</label>
                  <select
                    value={formCompany.status}
                    onChange={(e) => setFormCompany({ ...formCompany, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Setup">Setup Phase</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleCreateCompany}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIGURE / EDIT COMPANY MODAL ───────────────────────── */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-violet-400" /> Configure {selectedCompany.name} ({selectedCompany.id})
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Company Name</label>
                <input
                  value={formCompany.name}
                  onChange={(e) => setFormCompany({ ...formCompany, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Contact Email</label>
                <input
                  value={formCompany.contact_email}
                  onChange={(e) => setFormCompany({ ...formCompany, contact_email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Subscription Plan</label>
                  <select
                    value={formCompany.plan}
                    onChange={(e) => setFormCompany({ ...formCompany, plan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Pro">Pro</option>
                    <option value="Standard">Standard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Status</label>
                  <select
                    value={formCompany.status}
                    onChange={(e) => setFormCompany({ ...formCompany, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Setup">Setup Phase</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleUpdateCompany}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ────────────────────────────── */}
      {isDeleteModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Tenant Company?</h3>
                <p className="text-xs text-slate-400">{selectedCompany.name} ({selectedCompany.id})</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              This action will check dependencies across branches, employees, devices, and attendance records before proceeding.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800">
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
