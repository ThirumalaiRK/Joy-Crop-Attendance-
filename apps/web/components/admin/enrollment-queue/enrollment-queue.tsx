'use client';
import React, { useEffect, useState } from 'react';
import { Fingerprint, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { clsx } from 'clsx';

export function EnrollmentQueue() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('enrollment_sessions')
      .select('*, fingerprint_templates(count)')
      .order('started_at', { ascending: false })
      .limit(30);
    setSessions(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    in_progress: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    waiting: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-700/60 border-slate-600/40' },
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enrollment Queue</h1>
          <p className="text-sm text-slate-400 mt-0.5">Biometric enrollment sessions — all employees</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-800/60">
              {['Employee Code', 'Session ID', 'Device', 'Status', 'Started', 'Fingers'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-800/60 rounded animate-pulse" /></td>
              ))}</tr>
            )) : sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Fingerprint className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-600 text-sm">No enrollment sessions yet</p>
                  <p className="text-slate-700 text-xs mt-1">Sessions appear here when an employee is enrolled via the Enrollment Wizard</p>
                </td>
              </tr>
            ) : sessions.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig['waiting'];
              const Icon = cfg.icon;
              return (
                <tr key={s.session_uuid} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-300">{s.employee_code || '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-[10px]">{s.session_uuid?.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-slate-400">{s.device_id || 'MANTRA-MFS110'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border', cfg.bg, cfg.color)}>
                      <Icon className={clsx('w-3 h-3', s.status === 'in_progress' && 'animate-spin')} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {s.started_at ? new Date(s.started_at).toLocaleString('en-IN', { hour12: true, dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">
                    {s['fingerprint_templates']?.[0]?.count ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
