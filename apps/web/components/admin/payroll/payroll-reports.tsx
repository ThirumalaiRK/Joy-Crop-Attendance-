'use client';

import React from 'react';
import { BarChart3, Download, FileText, PieChart, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

export function PayrollReports() {
  const handleExport = (reportName: string) => {
    toast.success(`Generating report for ${reportName}... Excel download starting shortly!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Payroll & Pay Code Reports</h1>
        <p className="text-xs text-slate-400">Generate analytics, loss breakdown summaries, and audit reports for accounting</p>
      </div>

      {/* Grid of Report Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Salary register */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Monthly Payroll Register</h3>
            <p className="text-xs text-slate-400 mt-1">Full statement of base salary, allowances, deductions, and bank info for all employees.</p>
          </div>
          <button
            onClick={() => handleExport('Monthly Payroll Register')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-bold text-xs text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>

        {/* Card 2: LOP deductions */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Loss of Pay (LOP) Summary</h3>
            <p className="text-xs text-slate-400 mt-1">Deductions breakdown due to late arrivals, early check-outs, unexcused absences, and break overruns.</p>
          </div>
          <button
            onClick={() => handleExport('Loss of Pay Summary')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-red-500 hover:text-slate-950 font-bold text-xs text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>

        {/* Card 3: Overtime payouts */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4 hover:border-slate-700/80 transition group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Overtime & Weekend Earnings</h3>
            <p className="text-xs text-slate-400 mt-1">Statement showing extra hours logged outside shift rosters, weekend hours, and calculated OT rates.</p>
          </div>
          <button
            onClick={() => handleExport('Overtime & Weekend Earnings')}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-blue-500 hover:text-slate-950 font-bold text-xs text-slate-200 transition flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download Excel (.xlsx)
          </button>
        </div>

      </div>

      {/* Analytics Brief Section */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80">
        <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          Departmental Cost Allocations
        </h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="text-slate-400 font-medium">Software Development</div>
            <div className="text-lg font-black text-white mt-1">₹2,11,882</div>
            <div className="text-[9px] text-slate-500 mt-0.5">2 Employees</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="text-slate-400 font-medium">Support & IT Services</div>
            <div className="text-lg font-black text-white mt-1">₹55,340</div>
            <div className="text-[9px] text-slate-500 mt-0.5">1 Employee</div>
          </div>
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="text-slate-400 font-medium">Sales & Marketing</div>
            <div className="text-lg font-black text-white mt-1">₹0</div>
            <div className="text-[9px] text-slate-500 mt-0.5">0 Employees</div>
          </div>
        </div>
      </div>

    </div>
  );
}
