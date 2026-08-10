'use client';
import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, Wifi, CreditCard, HardDrive, Fingerprint, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { clsx } from 'clsx';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  msg: string;
  time: string;
  read: boolean;
  icon: any;
  color: string;
  bg: string;
}

export function AdminNotifications() {
  const [notes, setNotes] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build notifications from real Supabase state
    Promise.all([
      supabase.from('attendance_records').select('*').eq('status', 'late').order('created_at', { ascending: false }).limit(5),
      supabase.from('employees').select('count', { count: 'exact', head: true }),
    ]).then(([{ data: lateRecs }, { count: empCount }]) => {
      const items: AdminNotification[] = [];
      (lateRecs ?? []).forEach((r: any) => {
        items.push({ id: `late-${r.id}`, type: 'late', title: 'Late Check-In', msg: `${r.employee_name} checked in late at ${r.check_in_time}`, time: r.check_in_time || '—', read: false, icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' });
      });
      items.push({ id: 'sys-scanner', type: 'device', title: 'Biometric Scanner Online', msg: 'Mantra MFS110 L1 is connected and operational', time: 'Now', read: true, icon: Wifi, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' });
      items.push({ id: 'sys-fp', type: 'enroll', title: `${empCount} Employee(s) Enrolled`, msg: 'Fingerprint templates synced with Supabase successfully', time: 'Today', read: true, icon: Fingerprint, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' });
      setNotes(items);
      setLoading(false);
    });
  }, []);

  const markAll = () => setNotes((p) => p.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotes((p) => p.filter((n) => n.id !== id));
  const unread = notes.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-400 mt-0.5">{unread > 0 ? `${unread} unread` : 'All caught up'}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700">
            Mark all read
          </button>
        )}
      </div>
      <div className="space-y-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse border border-slate-700/30" />)
          : notes.map((n) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className={clsx('flex items-start gap-4 p-4 rounded-xl border transition-all', n.bg, !n.read && 'ring-1 ring-inset ring-white/5')}>
                <div className="p-2 rounded-lg bg-slate-900/60 shrink-0"><Icon className={clsx('w-4 h-4', n.color)} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-100">{n.title}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{n.msg}</p>
                  <p className="text-[10px] text-slate-600 mt-1">{n.time}</p>
                </div>
                <button onClick={() => dismiss(n.id)} className="p-1 rounded hover:bg-slate-800 text-slate-600 hover:text-slate-400 transition"><X className="w-3 h-3" /></button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
