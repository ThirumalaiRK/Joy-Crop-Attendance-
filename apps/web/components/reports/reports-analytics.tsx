'use me';
'use client';

import React, { useState } from 'react';
import { FileBarChart2, Download, FileText, Calendar, Filter, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

export function ReportsAnalytics() {
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const chartData = [
    { day: 'Mon', present: 340, late: 12, overtime: 18 },
    { day: 'Tue', present: 348, late: 8, overtime: 22 },
    { day: 'Wed', present: 352, late: 6, overtime: 15 },
    { day: 'Thu', present: 339, late: 14, overtime: 24 },
    { day: 'Fri', present: 342, late: 10, overtime: 30 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <FileBarChart2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100">Enterprise Attendance Reports & Analytics</h2>
            <p className="text-xs text-slate-400">Export CSV, Excel & PDF reports with automated AI summaries</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF Preview</span>
          </button>

          <button
            onClick={() => alert('CSV Export Generated!')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Recharts Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Presence Trends */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Weekly Present vs Late Check-ins</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overtime Trend */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Overtime Hours Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="overtime" stroke="#22c55e" strokeWidth={3} name="Overtime (hrs)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* PDF Report Preview Modal */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                Official Executive Attendance Report (PDF Preview)
              </h3>
              <button onClick={() => setShowPdfPreview(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 bg-slate-950 rounded-xl space-y-3 font-sans text-xs text-slate-300">
              <h4 className="text-sm font-bold text-white">AgencyOS Attendance Report — August 2026</h4>
              <p>Total Enrolled Employees: 360 | Average Presence: 94.2%</p>
              <p>Hardware Devices Active: 5 Connected Terminals (ZKTeco, Suprema, Mantra RD)</p>
              <p>Verified Biometric Matching Accuracy: 99.4%</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowPdfPreview(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300">Close</button>
              <button onClick={() => { alert('Downloading PDF...'); setShowPdfPreview(false); }} className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white">Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
