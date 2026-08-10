'use client';
import React, { useEffect, useState } from 'react';
import { Layers, Plus, Settings, Users, MonitorSmartphone, ExternalLink, Shield, Zap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export function CompanyManagement() {
  const [empCount, setEmpCount] = useState(0);
  const [fpCount, setFpCount] = useState(0);
  const [attCount, setAttCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      supabase.from('employees').select('count', { count: 'exact', head: true }),
      supabase.from('fingerprint_templates').select('count', { count: 'exact', head: true }),
      supabase.from('attendance_records').select('count', { count: 'exact', head: true }),
    ]).then(([e, f, a]) => {
      setEmpCount(e.count ?? 0);
      setFpCount(f.count ?? 0);
      setAttCount(a.count ?? 0);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();

    const companyChannel = supabase
      .channel('company-mgmt-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fingerprint_templates' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(companyChannel);
    };
  }, []);

  const company = {
    name: 'AgencyOS Pvt. Ltd.',
    logo: '🏢',
    plan: 'Enterprise',
    status: 'Active',
    id: 'COMP-001',
    branches: 3,
    storage: '4.2 GB',
    apiUsage: '28 / 10,000',
    renewal: '2027-01-01',
    contactEmail: 'admin@agencyos.ai',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage tenant companies across the platform</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition shadow-lg">
          <Plus className="w-3.5 h-3.5" /> Add Company
        </button>
      </div>

      {/* Company Card */}
      <div className="p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{company.logo}</div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{company.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{company.status}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">{company.plan}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">ID: {company.id} · {company.contactEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 transition text-xs font-medium">
              <ExternalLink className="w-3.5 h-3.5" /> Login As
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition text-xs font-medium">
              <Settings className="w-3.5 h-3.5" /> Configure
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Employees', value: loading ? '…' : empCount, icon: Users, color: 'text-emerald-400' },
            { label: 'Devices', value: '1', icon: MonitorSmartphone, color: 'text-cyan-400' },
            { label: 'Fingerprints', value: loading ? '…' : fpCount, icon: Shield, color: 'text-violet-400' },
            { label: 'Attendance Records', value: loading ? '…' : attCount, icon: Zap, color: 'text-amber-400' },
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

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {[
            { label: 'Branches', value: company.branches },
            { label: 'Storage Used', value: company.storage },
            { label: 'API Usage', value: company.apiUsage },
            { label: 'Plan Renewal', value: company.renewal },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/40">
              <div className="text-slate-500 text-[10px] uppercase tracking-wider">{item.label}</div>
              <div className="text-slate-200 font-semibold mt-0.5">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">Additional companies can be added as you onboard new tenants to the platform.</p>
    </div>
  );
}
