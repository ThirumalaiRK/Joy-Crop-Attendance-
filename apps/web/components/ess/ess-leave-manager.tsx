'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  MessageSquare,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeaveRequest {
  id: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Annual Leave' | 'Unpaid Leave';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedOn: string;
  managerComment?: string;
}

export function ESSLeaveManager() {
  const [requests, setRequests] = useState<LeaveRequest[]>([
    {
      id: 'LV-2026-001',
      leaveType: 'Casual Leave',
      startDate: '2026-08-10',
      endDate: '2026-08-10',
      daysCount: 1,
      reason: 'Personal work at bank',
      status: 'APPROVED',
      appliedOn: '2026-08-01',
      managerComment: 'Approved. Enjoy your time off.',
    },
    {
      id: 'LV-2026-002',
      leaveType: 'Sick Leave',
      startDate: '2026-08-25',
      endDate: '2026-08-25',
      daysCount: 1,
      reason: 'Doctor appointment for fever',
      status: 'PENDING',
      appliedOn: '2026-08-03',
    },
  ]);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest['leaveType']>('Casual Leave');
  const [startDate, setStartDate] = useState('2026-08-15');
  const [endDate, setEndDate] = useState('2026-08-15');
  const [reason, setReason] = useState('');

  const balances = {
    annual: 12,
    sick: 8,
    casual: 4,
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const newReq: LeaveRequest = {
      id: `LV-2026-${Math.floor(100 + Math.random() * 900)}`,
      leaveType,
      startDate,
      endDate,
      daysCount: 1,
      reason,
      status: 'PENDING',
      appliedOn: new Date().toISOString().split('T')[0],
    };

    setRequests([newReq, ...requests]);
    setShowApplyModal(false);
    setReason('');
    try {
      confetti({ particleCount: 80, spread: 60 });
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header & Apply Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            <span>Leave Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Check leave balances and submit time-off requests</p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Apply Leave</span>
        </button>
      </div>

      {/* Top Leave Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Annual Leave</span>
          <span className="text-3xl font-black text-emerald-400 font-mono block">{balances.annual}</span>
          <span className="text-[10px] text-slate-500 block">Days Available</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sick Leave</span>
          <span className="text-3xl font-black text-blue-400 font-mono block">{balances.sick}</span>
          <span className="text-[10px] text-slate-500 block">Days Available</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Casual Leave</span>
          <span className="text-3xl font-black text-amber-400 font-mono block">{balances.casual}</span>
          <span className="text-[10px] text-slate-500 block">Days Available</span>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Leave History</h3>
          <span className="text-xs text-slate-500 font-mono">{requests.length} Requests</span>
        </div>

        <div className="divide-y divide-slate-800">
          {requests.map((r) => (
            <div key={r.id} className="p-4 hover:bg-slate-850 transition space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white">{r.leaveType}</span>
                  <span className="text-slate-400 font-mono">
                    {r.startDate} to {r.endDate} ({r.daysCount} Day)
                  </span>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    r.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : r.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <p className="text-slate-300">
                <strong className="text-slate-500">Reason:</strong> {r.reason}
              </p>

              {r.managerComment && (
                <p className="text-emerald-400 italic">
                  <strong className="text-emerald-500">Manager Note:</strong> "{r.managerComment}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Apply for Leave</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Annual Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">Reason</label>
                <textarea
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for leave request..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
