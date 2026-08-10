'use client';
import React, { useEffect, useState } from 'react';
import { Code2, RefreshCw, Trash2, Download } from 'lucide-react';
import { getStoredLogs } from '../../../lib/logger';

export function DeveloperConsole() {
  const [logs, setLogs] = useState<string[]>([]);

  const refresh = () => setLogs(getStoredLogs());

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const downloadLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agencyos-logs-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20"><Code2 className="w-5 h-5 text-green-400" /></div>
            Developer Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">Structured logs — enrollment, kiosk, API, device events</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setLogs([])} className="p-2 rounded-xl bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 transition border border-slate-700"><Trash2 className="w-4 h-4" /></button>
          <button onClick={downloadLogs} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700"><Download className="w-3.5 h-3.5" /> Export</button>
        </div>
      </div>

      <div className="rounded-2xl border border-green-900/40 bg-[#0a1a0a] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-900/30 bg-[#061206]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="ml-2 text-[10px] text-green-600 font-mono">agencyos.console — live session logs</span>
          <span className="ml-auto text-[10px] text-green-700">{logs.length} entries</span>
        </div>
        <div className="h-[520px] overflow-y-auto p-4 font-mono text-xs space-y-1 scroll-smooth">
          {logs.length === 0 ? (
            <div className="text-green-800 py-8 text-center">
              <p>No logs yet.</p>
              <p className="mt-1 text-green-900">Perform an enrollment or kiosk scan to see logs here.</p>
            </div>
          ) : (
            logs.map((log, i) => {
              const isError = log.includes('[ERROR]');
              const isWarn = log.includes('[WARN]');
              const isSuccess = log.includes('[SUCCESS]');
              return (
                <div key={i} className={`leading-relaxed ${isError ? 'text-red-400' : isWarn ? 'text-amber-400' : isSuccess ? 'text-emerald-400' : 'text-green-500'}`}>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Enrollment Events', count: logs.filter(l => l.includes('[ENROLL]')).length, color: 'text-blue-400' },
          { label: 'Kiosk Events', count: logs.filter(l => l.includes('[KIOSK]')).length, color: 'text-violet-400' },
          { label: 'API Events', count: logs.filter(l => l.includes('[API]')).length, color: 'text-cyan-400' },
          { label: 'Errors', count: logs.filter(l => l.includes('[ERROR]')).length, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/40">
            <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
