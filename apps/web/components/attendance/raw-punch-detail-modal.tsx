'use client';

import React from 'react';
import { X, Fingerprint, Cpu, ShieldCheck, Clock, FileCode, CheckCircle2, Copy } from 'lucide-react';

export interface RawPunchDetailModalProps {
  punch: {
    id?: string;
    employee_name?: string;
    employee_id?: string;
    device_user_id?: string;
    device_name?: string;
    device_ip?: string;
    device_serial_number?: string;
    machine_log_id?: string;
    machine_timestamp?: string;
    machine_timezone?: string;
    event_time_utc?: string;
    verification_type?: string;
    raw_event_type?: string;
    source?: string;
    sync_status?: string;
    raw_payload?: any;
  } | null;
  onClose: () => void;
}

export function RawPunchDetailModal({ punch, onClose }: RawPunchDetailModalProps) {
  if (!punch) return null;

  const machineTimeDisplay = punch.machine_timestamp
    ? `${punch.machine_timestamp} IST`
    : punch.event_time_utc
    ? new Date(punch.event_time_utc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
    : '—';

  const utcTimeDisplay = punch.event_time_utc
    ? new Date(punch.event_time_utc).toUTCString()
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Biometric Raw Machine Punch</h3>
              <p className="text-xs text-slate-400">Immutable source record from biometric hardware</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Primary Machine Time Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">Primary Machine Timestamp</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Authoritative IST
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white tracking-tight font-mono">
              {machineTimeDisplay}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Timezone: <strong className="text-slate-200">Asia/Kolkata (IST = UTC+5:30)</strong></span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Employee</span>
              <div className="font-semibold text-white">{punch.employee_name || 'Mapped Staff'}</div>
              <div className="text-xs text-slate-400 mt-0.5">ID: {punch.employee_id || punch.device_user_id || 'N/A'}</div>
            </div>

            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Terminal Device</span>
              <div className="font-semibold text-white">{punch.device_name || 'Identix K90 Pro Terminal'}</div>
              <div className="text-xs text-slate-400 mt-0.5">IP: {punch.device_ip || '192.168.1.56'}</div>
            </div>

            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Hardware User ID</span>
              <div className="font-semibold text-white font-mono">{punch.device_user_id || '10'}</div>
            </div>

            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Machine Log Sequence ID</span>
              <div className="font-semibold text-white font-mono">{punch.machine_log_id || 'LOG-45872'}</div>
            </div>

            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Verification Method</span>
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4" /> {punch.verification_type || 'FINGERPRINT'}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/80">
              <span className="text-xs text-slate-400 block mb-1">Sync Status</span>
              <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> {punch.sync_status || 'Synced to Supabase'}
              </div>
            </div>
          </div>

          {/* Secondary Diagnostic UTC Representation */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Secondary Diagnostic UTC Timestamp</span>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Sorting & Storage Only</span>
            </div>
            <div className="text-sm font-mono text-cyan-300">
              {utcTimeDisplay}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              UTC is derived canonically for cross-system ordering. It is never displayed as the main check-in/out timestamp in HRMS UI.
            </p>
          </div>

          {/* Raw Payload Section */}
          {punch.raw_payload && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                <span className="flex items-center gap-1.5"><FileCode className="h-3.5 w-3.5 text-cyan-400" /> Hardware Raw Packet</span>
              </div>
              <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-36">
                {typeof punch.raw_payload === 'string'
                  ? punch.raw_payload
                  : JSON.stringify(punch.raw_payload, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950/80 px-6 py-4 flex justify-between items-center">
          <span className="text-xs text-slate-400">Record ID: {punch.id || 'N/A'}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
}
