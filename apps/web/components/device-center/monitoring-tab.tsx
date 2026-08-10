import React from 'react';
import { Activity, Terminal } from 'lucide-react';

export function MonitoringTab() {
  const logs = [
    { time: '15:30:12', level: 'INFO', message: '[SyncWorker] Heartbeat OK (12ms)' },
    { time: '15:28:45', level: 'INFO', message: '[SyncWorker] Extracted 4 attendance records.' },
    { time: '15:28:44', level: 'INFO', message: '[TCP] Connected to 192.168.1.56:4370' },
    { time: '15:15:00', level: 'WARN', message: '[TCP] Connection timeout. Retrying in 5s...' },
    { time: '15:10:22', level: 'INFO', message: '[SyncWorker] Pushed 1 user template successfully.' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2 shrink-0">
            <Terminal className="w-4 h-4 text-slate-400" />
            Live Connector Logs
          </h3>
          <div className="flex-1 bg-black/50 rounded-xl border border-slate-800 overflow-y-auto p-4 font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="mb-2 flex gap-3">
                <span className="text-slate-500 shrink-0">{log.time}</span>
                <span className={`shrink-0 font-bold ${log.level === 'WARN' ? 'text-amber-400' : log.level === 'ERROR' ? 'text-rose-400' : 'text-blue-400'}`}>
                  {log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))}
            <div className="flex gap-3 mt-4">
              <span className="text-slate-500 shrink-0">15:32:00</span>
              <span className="text-emerald-400 font-bold shrink-0">LIVE</span>
              <span className="text-slate-300 animate-pulse">Waiting for events...</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Diagnostics
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Average Latency</span>
                  <span className="font-bold text-emerald-400">12ms</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[15%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Packet Loss</span>
                  <span className="font-bold text-emerald-400">0.0%</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[2%]" />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Sync Queue Depth</span>
                  <span className="font-bold text-slate-200">0</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Error Rate (24h)</span>
                  <span className="font-bold text-slate-200">0.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
