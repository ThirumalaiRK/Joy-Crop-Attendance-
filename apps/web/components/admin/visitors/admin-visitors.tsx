'use client';
import React from 'react';
import { UserCheck2, Plus, QrCode, Camera } from 'lucide-react';

export function AdminVisitors() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Visitor Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Guest check-ins, host assignments, and visitor passes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition">
          <Plus className="w-3.5 h-3.5" /> New Visitor
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{ label: 'Today\'s Visitors', value: '0' }, { label: 'Currently Inside', value: '0' }, { label: 'Checked Out', value: '0' }].map((s) => (
          <div key={s.label} className="p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40">
            <div className="text-3xl font-black text-slate-300">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center py-20 text-slate-600 border border-dashed border-slate-800 rounded-2xl">
        <UserCheck2 className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">No visitors today</p>
        <p className="text-xs mt-1">Register a visitor using the button above</p>
      </div>
    </div>
  );
}
