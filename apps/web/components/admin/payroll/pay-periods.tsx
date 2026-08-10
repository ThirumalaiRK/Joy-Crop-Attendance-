'use client';

import React, { useState } from 'react';
import { Calendar, Settings, ShieldCheck, Save, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function PayPeriods() {
  const [cycleType, setCycleType] = useState('MONTHLY');
  const [startDay, setStartDay] = useState(1);
  const [disbursementDay, setDisbursementDay] = useState(5);
  const [integrationFormat, setIntegrationFormat] = useState('STANDARD_CSV');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Pay Period & Cut-Off settings updated successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Pay Period & Cut-Off Setup</h1>
        <p className="text-xs text-slate-400 font-medium">Configure dates, cut-offs, disbursement schedules, and output templates</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6 p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Cut-Off Period Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Default Pay Cycle Type</label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="MONTHLY">Monthly processing (Standard)</option>
                <option value="BI_WEEKLY">Bi-weekly processing</option>
                <option value="SEMI_MONTHLY">Semi-monthly (15th & 30th)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Cycle Start Day of Month</label>
              <input
                type="number"
                min="1"
                max="28"
                value={startDay}
                onChange={(e) => setStartDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">E.g., 26 starts the period from 26th of previous month to 25th of current month.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Payment Disbursement Day</label>
              <input
                type="number"
                min="1"
                max="10"
                value={disbursementDay}
                onChange={(e) => setDisbursementDay(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">Target calendar day of next month to disburse processed salaries.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Export Mapping Target</label>
              <select
                value={integrationFormat}
                onChange={(e) => setIntegrationFormat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="STANDARD_CSV">Standard ERP CSV export</option>
                <option value="ADP">ADP Global Payroll mapping</option>
                <option value="SAP">SAP SuccessFactors format</option>
                <option value="WORKDAY">Workday HCM integration XML</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-bold text-slate-950 transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save Configurations
            </button>
          </div>
        </form>

        {/* Current Period Box */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-4">
            <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Active Pay Period
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Month:</span>
                <span className="font-bold text-white">August 2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Start Date:</span>
                <span className="font-mono text-slate-200">2026-08-01</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">End Date:</span>
                <span className="font-mono text-slate-200">2026-08-31</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Working Days:</span>
                <span className="font-mono text-slate-200">22 Days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cut-Off Lock Status:</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400">
                  OPEN (UNLOCKED)
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                className="w-full py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5"
              >
                Lock Current Period
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            💡 **Integration Tip**: Configuring the cycle start day aligns the attendance time calculations automatically. Changing the start day to `26` causes the August period to parse logs from July 26 to August 25.
          </div>
        </div>
      </div>
    </div>
  );
}
