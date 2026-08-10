'use client';

import React, { useState } from 'react';
import { Download, Calendar, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { ReportBuilder, ReportFilter } from '../../../lib/reports/ReportBuilder';

const REPORT_TYPES = [
  { name: 'Attendance Report', type: 'ATTENDANCE', icon: '📊', desc: 'Daily/weekly/monthly attendance summary', formats: ['PDF', 'Excel', 'CSV'] },
  { name: 'Employee Report', type: 'EMPLOYEE', icon: '👤', desc: 'Employee profile, biometric status, history', formats: ['PDF', 'CSV'] },
  { name: 'Department Report', type: 'DEPARTMENT', icon: '🏢', desc: 'Department-wise attendance breakdown', formats: ['Excel', 'CSV'] },
  { name: 'Branch Report', type: 'BRANCH', icon: '🏭', desc: 'Branch-level KPIs and device usage', formats: ['PDF', 'Excel'] },
  { name: 'Device Report', type: 'DEVICE', icon: '📱', desc: 'Scanner logs, uptime, scan counts', formats: ['PDF', 'CSV'] },
  { name: 'API Report', type: 'API', icon: '⚡', desc: 'MXFace API usage, latency, errors', formats: ['CSV'] },
  { name: 'Visitor Report', type: 'VISITOR', icon: '🪪', desc: 'Visitor check-ins, hosts, purposes', formats: ['PDF', 'CSV'] },
  { name: 'Security Report', type: 'SECURITY', icon: '🛡️', desc: 'Failed logins, unknown fingerprints, anomalies', formats: ['PDF'] },
] as const;

export function AdminReports() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (
    reportName: string,
    reportType: typeof REPORT_TYPES[number]['type'],
    format: 'PDF' | 'EXCEL' | 'CSV'
  ) => {
    const genKey = `${reportType}_${format}`;
    setGenerating(genKey);

    const toastId = toast.loading(`Initializing ${reportName} (${format}) download...`);

    const filters: ReportFilter = {
      dateFrom: '2026-08-01',
      dateTo: '2026-08-07',
      branch: 'All',
      department: 'All',
      employeeId: 'All',
      status: 'All'
    };

    try {
      await ReportBuilder.generateReport(reportType, format, filters, (msg: string, pct: number) => {
        toast.loading(`${reportName} (${format}): ${msg} (${pct}%)`, { id: toastId });
      });
      toast.success(`${reportName} (${format}) generated and downloaded successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to generate ${reportName}: ${err.message || err}`, { id: toastId });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Generate and download platform-wide reports</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs">
          <Calendar className="w-3.5 h-3.5" /> Aug 2026
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((r) => (
          <div key={r.name} className="flex items-start gap-4 p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/60 transition-all group">
            <span className="text-2xl">{r.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-200">{r.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
              
              <div className="flex items-center gap-1.5 mt-3">
                {r.formats.map((f) => {
                  const formatUpper = f.toUpperCase() as 'PDF' | 'EXCEL' | 'CSV';
                  const isGen = generating === `${r.type}_${formatUpper}`;
                  
                  return (
                    <button
                      key={f}
                      disabled={generating !== null}
                      onClick={() => handleGenerate(r.name, r.type, formatUpper)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-violet-600/15 hover:border-violet-500/30 hover:text-violet-300 transition text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGen ? (
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 border-t-white animate-spin" />
                      ) : (
                        <Download className="w-2.5 h-2.5" />
                      )}
                      <span>{f}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
