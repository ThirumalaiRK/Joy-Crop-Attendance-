'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Key, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  actor: string;
  ip_address: string;
  status: string;
  details: string;
}

export function SecuritySettings() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data, error } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false });
        if (data && !error) {
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to load security logs', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100">Security, AES-256 Encryption & Audit Trail</h2>
            <p className="text-xs text-slate-400">Biometric template encryption, tamper alerts & role access control</p>
          </div>
        </div>
      </div>

      {/* Security Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <Lock className="w-6 h-6 text-blue-400" />
          <h3 className="font-bold text-slate-100 text-sm">Template Encryption</h3>
          <p className="text-xs text-slate-400">All face & fingerprint vectors encrypted with AES-256 GCM before cloud transmission.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <h3 className="font-bold text-slate-100 text-sm">Anti-Spoofing & Liveness</h3>
          <p className="text-xs text-slate-400">3D Depth mesh analysis blocks 2D photo & video presentation attacks.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <Key className="w-6 h-6 text-emerald-400" />
          <h3 className="font-bold text-slate-100 text-sm">MFA & Hardware Auth</h3>
          <p className="text-xs text-slate-400">Hardware token binding for ZKTeco, Suprema & Mantra terminals.</p>
        </div>
      </div>

      {/* Security Audit Table */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl overflow-x-auto">
        <h3 className="text-sm font-bold text-slate-100 mb-4">Real-time Security Audit Logs</h3>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Event Type</th>
                <th className="pb-3">Actor / Device</th>
                <th className="pb-3">IP Address</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 font-mono text-slate-400">{log.timestamp}</td>
                  <td className="py-3 font-bold text-slate-100">{log.event}</td>
                  <td className="py-3 text-blue-400">{log.actor}</td>
                  <td className="py-3 font-mono text-slate-400">{log.ip_address}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        log.status === 'Success'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
