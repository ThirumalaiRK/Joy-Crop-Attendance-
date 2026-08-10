'use client';

import React, { useState } from 'react';
import { DollarSign, Percent, TrendingDown, HelpCircle, Plus, Search, Trash2 } from 'lucide-react';

interface PayCode {
  code: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION' | 'LEAVE';
  multiplier: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const INITIAL_PAYCODES: PayCode[] = [
  {
    code: 'REG_WORK',
    name: 'Regular Work Hours',
    type: 'EARNING',
    multiplier: '1.0x Base Hourly',
    description: 'Standard working hours calculated from shift rosters.',
    status: 'ACTIVE',
  },
  {
    code: 'OVERTIME_15',
    name: 'Overtime Hours (OT)',
    type: 'EARNING',
    multiplier: '1.5x Base Hourly',
    description: 'Work completed after shift target hours are met.',
    status: 'ACTIVE',
  },
  {
    code: 'LATE_ARRIVAL',
    name: 'Late Arrival Penalty',
    type: 'DEDUCTION',
    multiplier: 'Fixed -$5 per incident',
    description: 'Deduction applied if arrival time exceeds grace period.',
    status: 'ACTIVE',
  },
  {
    code: 'ABSENCE_UNEX',
    name: 'Unexcused Absence',
    type: 'DEDUCTION',
    multiplier: '1.0x Daily Base',
    description: 'Deduction applied for no-shows without approved leaves.',
    status: 'ACTIVE',
  },
  {
    code: 'ANNUAL_LEAVE',
    name: 'Paid Annual Leave',
    type: 'LEAVE',
    multiplier: 'Paid (No Deduction)',
    description: 'Approved annual vacation days.',
    status: 'ACTIVE',
  },
];

export function PayCodes() {
  const [payCodes, setPayCodes] = useState<PayCode[]>(INITIAL_PAYCODES);
  const [search, setSearch] = useState('');

  const handleDelete = (code: string) => {
    if (confirm(`Delete pay code ${code}?`)) {
      setPayCodes(payCodes.filter((pc) => pc.code !== code));
    }
  };

  const filtered = payCodes.filter(
    (pc) =>
      pc.name.toLowerCase().includes(search.toLowerCase()) ||
      pc.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Pay Codes Master</h1>
          <p className="text-xs text-slate-400">Manage rules, multipliers, and configuration for payroll calculations</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 transition ml-auto sm:ml-0">
          <Plus className="w-3.5 h-3.5" />
          Add Pay Code
        </button>
      </div>

      {/* KPI Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">Earnings (2)</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Base work & overtime rules</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">Deductions (2)</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Late, Early Out, & Absences</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-white">Leave Codes (4)</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Paid Sick, Vacation, Casual, Annual</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by pay code or label..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
        />
      </div>

      {/* Paycodes List */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-400">
                <th className="p-4">Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Type</th>
                <th className="p-4">Multiplier / Weight</th>
                <th className="p-4">Description</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {filtered.map((pc) => (
                <tr key={pc.code} className="hover:bg-slate-900/30 transition">
                  <td className="p-4 font-mono font-bold text-amber-400">{pc.code}</td>
                  <td className="p-4 font-bold text-white">{pc.name}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pc.type === 'EARNING'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : pc.type === 'DEDUCTION'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {pc.type}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-300">{pc.multiplier}</td>
                  <td className="p-4 text-slate-400">{pc.description}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                      {pc.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(pc.code)}
                      className="p-1 rounded bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No pay codes found matching filters.
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
