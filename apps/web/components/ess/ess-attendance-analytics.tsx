'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Fingerprint,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { AttendanceSummary } from '../../lib/attendance/attendance-types';

interface ESSAttendanceAnalyticsProps {
  summaries: AttendanceSummary[];
  employeeName: string;
  department: string;
}

export function ESSAttendanceAnalytics({
  summaries,
  employeeName,
  department,
}: ESSAttendanceAnalyticsProps) {
  const [filterRange, setFilterRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetailDay, setSelectedDetailDay] = useState<AttendanceSummary | null>(null);

  const filteredSummaries = summaries.filter((s) =>
    s.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" /> My Attendance History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Historical work logs, check-ins, check-outs, and worked hours</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['TODAY', 'WEEK', 'MONTH', 'YEAR'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRange(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                filterRange === r
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Clean Attendance Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Check In</th>
                <th className="py-4 px-5">Check Out</th>
                <th className="py-4 px-5">Worked</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredSummaries.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedDetailDay(s)}
                  className="hover:bg-slate-800/40 transition cursor-pointer group"
                >
                  <td className="py-3.5 px-5 font-bold text-white font-sans">{s.date}</td>
                  <td className="py-3.5 px-5 text-emerald-400 font-bold">{s.checkInTime || '—'}</td>
                  <td className="py-3.5 px-5 text-purple-400 font-bold">{s.checkOutTime || '—'}</td>
                  <td className="py-3.5 px-5 text-white font-bold">
                    {Math.floor(s.workingTimeMinutes / 60)}h {s.workingTimeMinutes % 60}m
                  </td>
                  <td className="py-3.5 px-5 font-sans">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        s.status === 'PRESENT'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : s.status === 'LATE'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-sans">
                    <button className="px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-slate-700 text-[10px] font-bold text-slate-300 transition">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day Detail Popup Modal */}
      {selectedDetailDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Attendance Details</h3>
              <button
                onClick={() => setSelectedDetailDay(null)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-slate-400 font-mono block">Date</span>
              <span className="text-xl font-black text-white font-mono">{selectedDetailDay.date}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Check In</span>
                <p className="text-emerald-400 font-mono font-bold text-sm">{selectedDetailDay.checkInTime || '—'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Check Out</span>
                <p className="text-purple-400 font-mono font-bold text-sm">{selectedDetailDay.checkOutTime || '—'}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Tea Break</span>
                <p className="text-blue-400 font-mono text-sm">{selectedDetailDay.breakDurationMinutes || 0}m</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Lunch Break</span>
                <p className="text-amber-400 font-mono text-sm">{selectedDetailDay.lunchDurationMinutes || 0}m</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Total Worked Time</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {Math.floor(selectedDetailDay.workingTimeMinutes / 60)}h {selectedDetailDay.workingTimeMinutes % 60}m
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedDetailDay(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
