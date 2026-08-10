'use me';
'use client';

import React from 'react';
import { MonitorSmartphone, Cpu, Battery, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { BiometricDevice } from '../../types';

interface DeviceHealthWidgetProps {
  devices: BiometricDevice[];
  onManageDevices: () => void;
}

export function DeviceHealthWidget({ devices, onManageDevices }: DeviceHealthWidgetProps) {
  const onlineCount = devices.filter((d) => d.status === 'online').length;
  const warningCount = devices.filter((d) => d.status === 'warning' || d.status === 'offline').length;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-100">Biometric Mesh Health</h3>
            <p className="text-xs text-slate-400">5 Hardware Terminals Connected</p>
          </div>
        </div>

        <button
          onClick={onManageDevices}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
        >
          Manage All →
        </button>
      </div>

      {/* Summary Pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Online & Healthy
          </span>
          <span className="text-lg font-bold text-emerald-400">{onlineCount}</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Needs Attention
          </span>
          <span className="text-lg font-bold text-amber-400">{warningCount}</span>
        </div>
      </div>

      {/* Micro Device List */}
      <div className="space-y-2">
        {devices.slice(0, 3).map((dev) => (
          <div
            key={dev.id}
            className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  dev.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-slate-200 truncate">{dev.name}</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-[10px]">
              <span className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-slate-400" /> {dev.batteryLevel}%
              </span>
              <span className="font-mono text-slate-300">{dev.temperature}°C</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
