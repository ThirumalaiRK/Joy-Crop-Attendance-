'use me';
'use client';

import React, { useState, useEffect } from 'react';
import {
  MonitorSmartphone,
  Battery,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  ShieldCheck,
  RotateCcw,
  Zap,
  Usb,
  Cpu,
} from 'lucide-react';
import { BiometricDevice } from '../../types';
import { DeviceDiagnosticsModal } from './device-diagnostics-modal';
import { checkMantraRDStatus } from '../../lib/biometrics/mantra-rd';

interface DeviceGridProps {
  devices: BiometricDevice[];
  setDevices: React.Dispatch<React.SetStateAction<BiometricDevice[]>>;
}

export function DeviceGrid({ devices, setDevices }: DeviceGridProps) {
  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);
  const [mantraDetected, setMantraDetected] = useState(false);

  useEffect(() => {
    // Perform hardware auto-detection for Mantra MFS110 L1 scanner on 127.0.0.1:11100
    checkMantraRDStatus().then((status) => {
      setMantraDetected(status.connected);
      if (status.connected) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === 'DEV-003'
              ? {
                  ...d,
                  status: 'online',
                  model: 'Mantra MFS110 L1 (S/N: 7055634)',
                  ipAddress: `127.0.0.1:${status.port || 11100}`,
                  lastSync: 'Just now (Realtime)',
                  batteryLevel: 100,
                  temperature: 32.5,
                }
              : d
          )
        );
      }
    });
  }, [setDevices]);

  const handleSync = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, lastSync: 'Just now', status: 'online', cloudSyncStatus: 'Healthy' } : d
      )
    );
  };

  const handleRestart = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'syncing' } : d))
    );
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'online', lastSync: 'Just now' } : d))
      );
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <MonitorSmartphone className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Biometric Hardware Terminal Mesh
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                REALTIME HARDWARE AUTO-DETECT
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live telemetry for ZKTeco, Suprema, Mantra MFS110 RD Service & Matrix COSEC terminals
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            checkMantraRDStatus().then((status) => {
              setMantraDetected(status.connected);
              setDevices((prev) => prev.map((d) => ({ ...d, lastSync: 'Just now' })));
            });
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Sync All 5 Devices</span>
        </button>
      </div>

      {/* Grid of Device Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {devices.map((device) => (
          <div
            key={device.id}
            className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/40 transition-all duration-300 shadow-xl flex flex-col justify-between space-y-4 group"
          >
            {/* Card Header */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                    device.status === 'online'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : device.status === 'warning'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  {device.status}
                </span>

                <span className="text-[11px] font-mono text-slate-500">{device.ipAddress}</span>
              </div>

              <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition">
                {device.name}
              </h3>
              <span className="text-xs text-slate-400 font-medium block">{device.model}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Location: {device.location}</span>
            </div>

            {/* Metrics Checklist */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>Battery: {device.batteryLevel}%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Temp: {device.temperature}°C</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Users: {device.registeredUsers}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Wifi className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sync: {device.lastSync}</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                onClick={() => setSelectedDevice(device)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Diagnostics</span>
              </button>

              <button
                onClick={() => handleSync(device.id)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                title="Force Sync"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleRestart(device.id)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                title="Remote Restart Device"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Diagnostics Drawer Modal */}
      <DeviceDiagnosticsModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </div>
  );
}
