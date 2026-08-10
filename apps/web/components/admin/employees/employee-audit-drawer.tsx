'use client';

import React, { useEffect, useState } from 'react';
import { X, History, Shield, Key, Lock, UserCheck, RefreshCw, Camera, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface AuditLog {
  id: string;
  action: string;
  actor_name: string;
  target_employee_id: string;
  details: string;
  created_at: string;
  ip_address?: string;
}

interface EmployeeAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
}

export function EmployeeAuditDrawer({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}: EmployeeAuditDrawerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?employeeId=${encodeURIComponent(employeeId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchLogs();
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  const getActionIcon = (action: string) => {
    if (action.includes('AUTH') || action.includes('PROVISION')) return <Key className="w-3.5 h-3.5 text-amber-400" />;
    if (action.includes('PASSWORD')) return <Lock className="w-3.5 h-3.5 text-violet-400" />;
    if (action.includes('SUSPEND') || action.includes('REVOKE')) return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    if (action.includes('AVATAR')) return <Camera className="w-3.5 h-3.5 text-cyan-400" />;
    if (action.includes('ROLE')) return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
    return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Immutable Audit Trail</h3>
              <p className="text-[11px] text-slate-400 font-mono">{employeeName} ({employeeId})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading && logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 font-mono animate-pulse">
              Loading security audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Shield className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No direct audit entries found for this employee.</p>
              <p className="text-[10px] text-slate-600">All identity, credential, and attendance changes will be recorded here.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-3 pl-4 space-y-6">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </span>

                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold text-slate-200">
                        {getActionIcon(log.action)}
                        <span>{log.action.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      {log.details}
                    </p>

                    <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-800/40">
                      <span>By: {log.actor_name}</span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>🔒 Tamper-Proof Audit Vault</span>
          <span>Supabase RLS Active</span>
        </div>
      </div>
    </div>
  );
}
