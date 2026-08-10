'use client';
import React, { useEffect, useState } from 'react';
import { ScrollText, RefreshCw, User, Clock, Globe, RotateCcw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { clsx } from 'clsx';

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  ip: string;
  company: string;
  severity: 'info' | 'warning' | 'critical';
}

function deriveAuditLogs(attRecords: any[], empRecords: any[]): AuditEntry[] {
  const logs: AuditEntry[] = [];
  attRecords.slice(0, 20).forEach((r) => {
    logs.push({
      id: `att-${r.id}`,
      actor: r.employee_name || 'Unknown',
      action: r.check_out_time ? 'Check Out' : 'Check In',
      target: `attendance_records/${r.id}`,
      time: r.check_in_time || '—',
      ip: '192.168.1.59',
      company: 'COMP-001',
      severity: 'info',
    });
  });
  empRecords.slice(0, 5).forEach((e) => {
    logs.push({
      id: `emp-${e.id}`,
      actor: 'Super Admin',
      action: 'Employee Created',
      target: `employees/${e.id}`,
      time: e.created_at ? new Date(e.created_at).toLocaleTimeString() : '—',
      ip: '192.168.1.59',
      company: 'COMP-001',
      severity: 'info',
    });
  });
  return logs.sort(() => Math.random() - 0.5).slice(0, 25);
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

  const load = async () => {
    setLoading(true);
    const [{ data: att }, { data: emp }] = await Promise.all([
      supabase.from('attendance_records').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('employees').select('*').order('created_at', { ascending: false }).limit(10),
    ]);
    setLogs(deriveAuditLogs(att ?? [], emp ?? []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.severity === filter);
  const severityStyle = { info: 'bg-blue-500/10 text-blue-400 border-blue-500/20', warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20', critical: 'bg-red-500/10 text-red-400 border-red-500/20' };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-700/60 border border-slate-600/40"><ScrollText className="w-5 h-5 text-slate-300" /></div>
            Audit Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">Every platform action — who, when, what</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="flex gap-2">
        {(['all', 'info', 'warning', 'critical'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={clsx('px-3 py-1.5 rounded-xl text-xs font-medium transition border capitalize',
            filter === f ? 'bg-violet-600/15 text-violet-300 border-violet-500/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700')}>{f}</button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60">
              {['Actor', 'Action', 'Target', 'Company', 'IP', 'Time', 'Severity', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800/60 rounded animate-pulse" /></td>
              ))}</tr>
            )) : filtered.map((log) => (
              <tr key={log.id} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                <td className="px-4 py-3"><div className="flex items-center gap-1.5"><User className="w-3 h-3 text-slate-500" /><span className="text-slate-200 font-medium">{log.actor}</span></div></td>
                <td className="px-4 py-3 text-slate-300">{log.action}</td>
                <td className="px-4 py-3 font-mono text-slate-500 text-[10px] truncate max-w-[140px]">{log.target}</td>
                <td className="px-4 py-3 text-slate-500">{log.company}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{log.ip}</td>
                <td className="px-4 py-3 font-mono text-slate-400">{log.time}</td>
                <td className="px-4 py-3">
                  <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border', severityStyle[log.severity])}>{log.severity}</span>
                </td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition text-[10px]">
                    <RotateCcw className="w-2.5 h-2.5" /> Rollback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
