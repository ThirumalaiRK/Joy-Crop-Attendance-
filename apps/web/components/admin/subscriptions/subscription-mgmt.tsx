'use client';
import React from 'react';
import { CreditCard, Check } from 'lucide-react';

const PLANS = [
  { name: 'Trial', price: 'Free', period: '14 days', employees: '10', devices: '1', modules: ['Attendance', 'Fingerprint', 'Dashboard'], current: false },
  { name: 'Basic', price: '₹2,999', period: '/month', employees: '50', devices: '3', modules: ['All Trial', 'Reports', 'Shift Manager'], current: false },
  { name: 'Professional', price: '₹7,999', period: '/month', employees: '250', devices: '10', modules: ['All Basic', 'Face AI', 'Visitor', 'API'], current: false },
  { name: 'Enterprise', price: '₹19,999', period: '/month', employees: 'Unlimited', devices: 'Unlimited', modules: ['All Professional', 'White Label', 'SSO', 'SLA'], current: true },
];

export function SubscriptionMgmt() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions & Billing</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage tenant plans, billing cycles, and API credits</p>
      </div>
      <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/20 flex items-center gap-4">
        <CreditCard className="w-5 h-5 text-violet-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-300">COMP-001 — AgencyOS Pvt. Ltd. — Enterprise Plan</p>
          <p className="text-xs text-slate-500 mt-0.5">Renewal: Jan 1, 2027 · Auto-renew: ON · Payment: ••••4242</p>
        </div>
        <span className="ml-auto px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">Active</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PLANS.map((p) => (
          <div key={p.name} className={`p-5 rounded-2xl border space-y-4 ${p.current ? 'bg-violet-600/10 border-violet-500/30' : 'bg-slate-900/40 border-slate-800/60'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-200">{p.name}</span>
                {p.current && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full">CURRENT</span>}
              </div>
              <div className="text-2xl font-black text-white mt-1">{p.price} <span className="text-xs text-slate-500 font-normal">{p.period}</span></div>
            </div>
            <div className="space-y-1 text-[11px] text-slate-400">
              <div>👥 {p.employees} employees</div>
              <div>📱 {p.devices} devices</div>
            </div>
            <div className="space-y-1">
              {p.modules.map((m) => (
                <div key={m} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" /> {m}
                </div>
              ))}
            </div>
            <button className={`w-full py-2 rounded-xl text-xs font-semibold transition ${p.current ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
              {p.current ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
