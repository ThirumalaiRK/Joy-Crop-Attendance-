'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle2, XCircle, Clock, Search, Filter, Plus, FileSpreadsheet } from 'lucide-react';

interface LeaveRequest {
  id: string;
  employeeId: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const INITIAL_REQUESTS: LeaveRequest[] = [
  {
    id: 'LR-001',
    employeeId: 'EMP-10',
    name: 'Thirumalai R K',
    type: 'Annual Leave',
    startDate: '2026-08-10',
    endDate: '2026-08-12',
    days: 3,
    reason: 'Strategic planning meeting offsite and rest.',
    status: 'PENDING',
  },
  {
    id: 'LR-002',
    employeeId: 'EMP-01',
    name: 'Dharun B',
    type: 'Sick Leave',
    startDate: '2026-08-08',
    endDate: '2026-08-08',
    days: 1,
    reason: 'Dental check-up appointment.',
    status: 'APPROVED',
  },
  {
    id: 'LR-003',
    employeeId: 'EMP-003',
    name: 'Vignesh M',
    type: 'Casual Leave',
    startDate: '2026-08-15',
    endDate: '2026-08-16',
    days: 2,
    reason: 'Family function attendance.',
    status: 'PENDING',
  },
];

export function AdminLeaves() {
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
  };

  const filtered = requests.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'ALL' ? true : r.status === filterType;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Leave Management</h1>
          <p className="text-xs text-slate-400">Approve employee leave applications, monitor balances, and track history</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 transition">
            <Plus className="w-3.5 h-3.5" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{pendingCount}</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Pending Approvals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{approvedCount}</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Approved Leaves</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">30</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Total Employee Entitlements</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employee name or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-bold"
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-400">
                <th className="p-4">Request ID</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Leave Type</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Days</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/30 transition">
                  <td className="p-4 font-mono font-bold text-slate-300">{r.id}</td>
                  <td className="p-4 font-bold text-white">{r.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                      {r.type}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">{r.startDate} to {r.endDate}</td>
                  <td className="p-4 font-mono text-slate-200">{r.days}</td>
                  <td className="p-4 text-slate-400 truncate max-w-[180px]" title={r.reason}>{r.reason}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : r.status === 'REJECTED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {r.status === 'PENDING' ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleAction(r.id, 'APPROVED')}
                          className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(r.id, 'REJECTED')}
                          className="p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No leave requests found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
