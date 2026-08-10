'use me';
'use client';

import React from 'react';
import { MonitorSmartphone, X, Activity, Cpu, HardDrive, Wifi, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BiometricDevice } from '../../types';

interface DiagnosticsModalProps {
  device: BiometricDevice | null;
  onClose: () => void;
}

export function DeviceDiagnosticsModal({ device, onClose }: DiagnosticsModalProps) {
  if (!device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">{device.name} Diagnostics</h3>
              <span className="text-[11px] text-slate-400">IP: {device.ipAddress} • {device.model}</span>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Metrics Grid */}
        <div className="p-6 space-y-4 bg-slate-950/40">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
              <Cpu className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-[10px] text-slate-400">CPU Usage</span>
              <span className="text-sm font-bold text-slate-100">14.2%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
              <HardDrive className="w-5 h-5 text-purple-400 mb-1" />
              <span className="text-[10px] text-slate-400 font-sans">Memory</span>
              <span className="text-sm font-bold text-slate-100">2.4 / 8 GB</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center">
              <Wifi className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px] text-slate-400">Cloud Sync Latency</span>
              <span className="text-sm font-bold text-emerald-400">0.4 ms</span>
            </div>
          </div>

          {/* Detailed Logs Box */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300">Live Firmware Log Stream</span>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 max-h-48 overflow-y-auto">
              <p className="text-emerald-400">[08:52:14] INFO: Biometric match template #8821 matched EMP-1001 (Confidence: 99.7%)</p>
              <p className="text-blue-400">[08:55:00] INFO: Heartbeat packet ACK from cloud API endpoint</p>
              <p className="text-slate-400">[09:00:10] INFO: AES-256 Encrypted template sync complete (1420 templates)</p>
              <p className="text-amber-400">[09:12:04] WARN: Thermal reading: {device.temperature}°C (Normal operational threshold)</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg">
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
