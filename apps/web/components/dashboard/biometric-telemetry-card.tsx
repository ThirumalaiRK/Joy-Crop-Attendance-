'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Database, ShieldCheck, Activity, Cpu } from 'lucide-react';

export interface BiometricTelemetryProps {
  searchCount?: number;
  storageCount?: number;
  verifyCount?: number;
}

export function BiometricTelemetryCard({
  searchCount = 28,
  storageCount = 16,
  verifyCount = 12,
}: BiometricTelemetryProps) {
  const [searchUsage, setSearchUsage] = useState(searchCount);
  const [storageUsage, setStorageUsage] = useState(storageCount);
  const [verifyUsage, setVerifyUsage] = useState(verifyCount);

  useEffect(() => {
    // Sync telemetry from localStorage if available
    try {
      const storedSearch = localStorage.getItem('agencyos_telemetry_search');
      const storedStorage = localStorage.getItem('agencyos_telemetry_storage');
      const storedVerify = localStorage.getItem('agencyos_telemetry_verify');

      if (storedSearch) setSearchUsage(parseInt(storedSearch, 10));
      if (storedStorage) setStorageUsage(parseInt(storedStorage, 10));
      if (storedVerify) setVerifyUsage(parseInt(storedVerify, 10));
    } catch (e) {}
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              MXFace Biometric Service Usage (Current Month)
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                August, 2026
              </span>
            </h3>
            <span className="text-xs text-slate-400">Live Production Telemetry & API Usage Audit</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Mantra MFS110 L1 Ready</span>
        </div>
      </div>

      {/* Usage Cards Grid (Matching MXFace Portal UI) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Fingerprint Search */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/40 transition flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:scale-110 transition">
              <Search className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold">Fingerprint Search (1:N)</span>
              <span className="text-2xl font-black text-white font-mono">{searchUsage}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
            Usage: {searchUsage}
          </span>
        </div>

        {/* Card 2: Fingerprint Storage */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/40 transition flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 group-hover:scale-110 transition">
              <Database className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold">Fingerprint Storage</span>
              <span className="text-2xl font-black text-white font-mono">{storageUsage}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
            Usage: {storageUsage}
          </span>
        </div>

        {/* Card 3: Fingerprint 1:1 Verification */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-semibold">1:1 Verification</span>
              <span className="text-2xl font-black text-white font-mono">{verifyUsage}</span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
            Usage: {verifyUsage}
          </span>
        </div>
      </div>

      {/* API Usages Details Table (Matching MXFace Developer Portal) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">API Usages Details</h4>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="p-3 font-semibold">Module Name</th>
                <th className="p-3 font-semibold">Month Year</th>
                <th className="p-3 font-semibold text-right">Usage Count</th>
                <th className="p-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-slate-300">
              <tr>
                <td className="p-3 font-bold text-white flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  FingerPrintSearch
                </td>
                <td className="p-3 text-slate-400">August-2026</td>
                <td className="p-3 text-right font-bold text-purple-400">{searchUsage}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active ✓
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-white flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  FingerPrintStorage
                </td>
                <td className="p-3 text-slate-400">August-2026</td>
                <td className="p-3 text-right font-bold text-blue-400">{storageUsage}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active ✓
                  </span>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  FingerPrintVerification
                </td>
                <td className="p-3 text-slate-400">August-2026</td>
                <td className="p-3 text-right font-bold text-emerald-400">{verifyUsage}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active ✓
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
