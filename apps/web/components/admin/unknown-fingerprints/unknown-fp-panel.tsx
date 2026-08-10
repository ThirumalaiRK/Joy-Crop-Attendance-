'use client';
import React, { useEffect, useRef, useState } from 'react';
import { UserX, RefreshCw, UserPlus, Ban, AlertOctagon, Fingerprint, Clock, Wifi, WifiOff, Shield, Bell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import io from 'socket.io-client';
import { clsx } from 'clsx';
import { toast } from 'sonner';

interface UnknownAttempt {
  id: string;
  time: string;
  device: string;
  deviceIp: string;
  verifyMode: number;
  action?: 'enroll' | 'reject' | 'blacklist';
  isNew?: boolean;
}

const VERIFY_MODES: Record<number, string> = {
  1: 'Fingerprint', 4: 'RFID Card', 15: 'Face', 20: 'Password',
};

export function UnknownFingerprintsPanel() {
  const [attempts, setAttempts] = useState<UnknownAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<any>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('unknown_fingerprint_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setAttempts(data.map((r: any) => ({
        id: r.id,
        time: r.attempt_time ? new Date(r.attempt_time).toLocaleString() : new Date(r.created_at).toLocaleString(),
        device: r.device_name || 'ZKTeco Terminal',
        deviceIp: r.device_ip || '—',
        verifyMode: r.verify_mode || 1,
      })));
    }
    setLoading(false);
  };

  // Connect WebSocket for live updates
  useEffect(() => {
    load();

    const socket = io('http://localhost:4000', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));

    socket.on('unknown_fingerprint', (data: any) => {
      const newAttempt: UnknownAttempt = {
        id: `live-${Date.now()}`,
        time: new Date().toLocaleString(),
        device: data.deviceName || 'ZKTeco Terminal',
        deviceIp: data.ip || '—',
        verifyMode: data.verifyMode || 1,
        isNew: true,
      };

      setAttempts((prev) => [newAttempt, ...prev].slice(0, 50));

      // Flash notification
      toast.warning(`⚠️ Unknown fingerprint at ${data.ip || 'device'}`, {
        description: `${VERIFY_MODES[data.verifyMode] || 'Unknown'} attempt — ${new Date().toLocaleTimeString()}`,
        duration: 6000,
      });

      // Clear "new" flag after animation
      setTimeout(() => {
        setAttempts((prev) =>
          prev.map((a) => (a.id === newAttempt.id ? { ...a, isNew: false } : a))
        );
      }, 3000);
    });

    // Also subscribe to Supabase realtime for DB-persisted unknown logs
    const ch = supabase
      .channel('unknown-fp-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'unknown_fingerprint_logs' }, (payload) => {
        const r: any = payload.new;
        setAttempts((prev) => [{
          id: r.id,
          time: r.attempt_time ? new Date(r.attempt_time).toLocaleString() : new Date(r.created_at).toLocaleString(),
          device: r.device_name || 'ZKTeco Terminal',
          deviceIp: r.device_ip || '—',
          verifyMode: r.verify_mode || 1,
          isNew: true,
        }, ...prev.filter(a => a.id !== r.id)].slice(0, 50));
      })
      .subscribe();

    return () => {
      socket.disconnect();
      supabase.removeChannel(ch);
    };
  }, []);

  const handleAction = (id: string, action: 'enroll' | 'reject' | 'blacklist') => {
    setAttempts((prev) => prev.map((a) => (a.id === id ? { ...a, action } : a)));
    if (action === 'enroll') {
      toast.info('Navigate to Biometric Enrollment to register this person.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <UserX className="w-5 h-5 text-rose-400" />
            </div>
            Unknown Fingerprints
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Live feed of unregistered fingerprint attempts from biometric terminals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={clsx('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
            wsConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-500')}>
            {wsConnected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
            {wsConnected ? 'Live' : 'Offline'}
          </div>
          <button onClick={load} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Attempts', value: attempts.length, icon: Fingerprint, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          { label: 'Today', value: attempts.filter(a => new Date(a.time).toDateString() === new Date().toDateString()).length, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Action Required', value: attempts.filter(a => !a.action).length, icon: Bell, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
        ].map((s) => (
          <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.bg}`}>
            <s.icon className={`size-5 shrink-0 ${s.color}`} />
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold tabular ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
        <AlertOctagon className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-300">Security Notice</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Unknown fingerprint attempts occur when a scan does not match any enrolled employee. The device rejects the access and the connector logs the attempt here in real time. Review and take action on each entry.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-800/50 animate-pulse border border-slate-700/30" />
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-600">
          <Shield className="w-12 h-12 mb-3 text-emerald-800/50" />
          <p className="text-sm font-medium text-slate-400">No unknown attempts recorded</p>
          <p className="text-xs mt-1 text-slate-600">All fingerprint scans matched enrolled employees</p>
          {!wsConnected && (
            <p className="text-xs mt-3 text-amber-600">
              ⚠️ Connector offline — start it to receive live events
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60">
                {['#', 'Time', 'Device', 'IP', 'Method', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id}
                  className={clsx(
                    'border-b border-slate-800/20 transition-colors',
                    a.isNew ? 'bg-rose-500/10 animate-pulse' : 'hover:bg-slate-800/20'
                  )}>
                  <td className="px-4 py-3 text-slate-600 font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {a.time}
                      {a.isNew && <span className="rounded-full bg-rose-500/20 text-rose-400 text-[9px] px-1.5 py-0.5 border border-rose-500/30 font-bold">NEW</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{a.device}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{a.deviceIp}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 font-medium text-[10px]">
                      {VERIFY_MODES[a.verifyMode] || `Mode ${a.verifyMode}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.action ? (
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border', {
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': a.action === 'enroll',
                        'bg-slate-500/10 text-slate-400 border-slate-500/20': a.action === 'reject',
                        'bg-red-500/10 text-red-400 border-red-500/20': a.action === 'blacklist',
                      })}>
                        {a.action}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleAction(a.id, 'enroll')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition text-[10px] font-medium">
                          <UserPlus className="w-3 h-3" /> Enroll
                        </button>
                        <button onClick={() => handleAction(a.id, 'reject')} className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 transition text-[10px] font-medium">
                          Reject
                        </button>
                        <button onClick={() => handleAction(a.id, 'blacklist')} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition text-[10px] font-medium">
                          <Ban className="w-3 h-3" /> Blacklist
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
