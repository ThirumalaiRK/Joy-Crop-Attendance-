'use client';

import React, { useState } from 'react';
import { CreditCard, Calculator, FileCheck, Search, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PayrollSummary {
  employeeId: string;
  name: string;
  department: string;
  baseSalary: number;
  payableDays: number;
  lopDeductions: number;
  overtimeEarnings: number;
  netPayable: number;
  status: 'PROCESSED' | 'PENDING' | 'RELEASED';
}

const INITIAL_DATA: PayrollSummary[] = [
  {
    employeeId: 'EMP-10',
    name: 'Thirumalai R K',
    department: 'Software Development',
    baseSalary: 120000,
    payableDays: 22,
    lopDeductions: 0,
    overtimeEarnings: 1200,
    netPayable: 121200,
    status: 'PENDING',
  },
  {
    employeeId: 'EMP-01',
    name: 'Dharun B',
    department: 'Software Development',
    baseSalary: 95000,
    payableDays: 21,
    lopDeductions: 4318,
    overtimeEarnings: 0,
    netPayable: 90682,
    status: 'PROCESSED',
  },
  {
    employeeId: 'EMP-003',
    name: 'Vignesh M',
    department: 'Support & IT',
    baseSalary: 55000,
    payableDays: 22,
    lopDeductions: 0,
    overtimeEarnings: 340,
    netPayable: 55340,
    status: 'RELEASED',
  },
];

export function PayrollProcessing() {
  const [data, setData] = useState<PayrollSummary[]>(INITIAL_DATA);
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = () => {
    setCalculating(true);
    setTimeout(() => {
      setData((prev) =>
        prev.map((p) => ({
          ...p,
          status: p.status === 'PENDING' ? 'PROCESSED' : p.status,
        }))
      );
      setCalculating(false);
      toast.success('Attendance logs processed! Base hours, LOP and OT calculations sync complete.');
    }, 1200);
  };

  const handleRelease = (id: string) => {
    setData((prev) =>
      prev.map((p) => (p.employeeId === id ? { ...p, status: 'RELEASED' } : p))
    );
    toast.success(`Payslip released & sent to employee dashboard for ${id}.`);
  };

  const netTotal = data.reduce((acc, curr) => acc + curr.netPayable, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Payroll Processing & Payslips</h1>
          <p className="text-xs text-slate-400">Run calculation engines, cross-reference attendance anomalies, and issue payslips</p>
        </div>
        <button
          onClick={handleCalculate}
          disabled={calculating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 transition disabled:opacity-50"
        >
          <Calculator className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
          {calculating ? 'Running Engine...' : 'Run Payroll Calculator'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">₹{netTotal.toLocaleString()}</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Total Net Payable (INR)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {data.filter((d) => d.status === 'RELEASED').length} / {data.length}
            </div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Payslips Released</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">August 2026</div>
            <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mt-0.5">Disbursement Month</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-400">
                <th className="p-4">Employee ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Base Salary</th>
                <th className="p-4">Payable Days</th>
                <th className="p-4">LOP Deductions</th>
                <th className="p-4">OT Earnings</th>
                <th className="p-4">Net Payable</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Payslip Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-xs">
              {data.map((p) => (
                <tr key={p.employeeId} className="hover:bg-slate-900/30 transition">
                  <td className="p-4 font-mono font-bold text-slate-300">{p.employeeId}</td>
                  <td className="p-4">
                    <div className="font-bold text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.department}</div>
                  </td>
                  <td className="p-4 font-mono text-slate-300">₹{p.baseSalary.toLocaleString()}</td>
                  <td className="p-4 font-mono text-slate-300">{p.payableDays} / 22</td>
                  <td className="p-4 font-mono text-red-400">-₹{p.lopDeductions.toLocaleString()}</td>
                  <td className="p-4 font-mono text-emerald-400">+₹{p.overtimeEarnings.toLocaleString()}</td>
                  <td className="p-4 font-mono font-black text-white">₹{p.netPayable.toLocaleString()}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        p.status === 'RELEASED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.status === 'PROCESSED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {p.status === 'PROCESSED' ? (
                      <button
                        onClick={() => handleRelease(p.employeeId)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 font-bold text-[10px] transition"
                      >
                        Release Payslip
                      </button>
                    ) : p.status === 'RELEASED' ? (
                      <span className="text-[10px] font-bold text-slate-500">Released ✓</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500">Run Calculation</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
