'use me';
'use client';

import React from 'react';
import { Building2, Users, ArrowUpRight } from 'lucide-react';

export function DepartmentBreakdown() {
  const departments = [
    { name: 'Engineering', total: 180, present: 168, late: 8, wfh: 4, rate: 93 },
    { name: 'Product & Design', total: 60, present: 58, late: 2, wfh: 0, rate: 96 },
    { name: 'Executive Suite', total: 20, present: 20, late: 0, wfh: 0, rate: 100 },
    { name: 'Human Resources', total: 35, present: 33, late: 1, wfh: 1, rate: 94 },
    { name: 'Finance & Legal', total: 45, present: 41, late: 3, wfh: 1, rate: 91 },
    { name: 'Cybersecurity', total: 30, present: 29, late: 0, wfh: 1, rate: 97 },
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-100">Department Presence</h3>
            <p className="text-xs text-slate-400">Live attendance percentage per unit</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-purple-400">6 Departments Active</span>
      </div>

      <div className="space-y-3.5">
        {departments.map((dept, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">{dept.name}</span>
              <span className="text-slate-400">
                <strong className="text-slate-100">{dept.present}</strong> / {dept.total} ({dept.rate}%)
              </span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${dept.rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
