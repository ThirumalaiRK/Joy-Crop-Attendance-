'use client';
import React from 'react';
import { Plug, CheckCircle2, XCircle, Settings } from 'lucide-react';

const INTEGRATIONS = [
  { name: 'Mantra MFS110', category: 'Biometric', status: 'connected', logo: '🖐️', detail: 'RD Service @ 127.0.0.1:11100' },
  { name: 'MXFace SDK', category: 'AI/Biometric', status: 'connected', logo: '🧠', detail: 'fingerprintapi.mxface.ai · Credits: 9,972' },
  { name: 'Supabase', category: 'Database', status: 'connected', logo: '⚡', detail: 'PostgreSQL + Realtime + Storage' },
  { name: 'ZKTeco', category: 'Biometric', status: 'not_configured', logo: '🔒', detail: 'Add ZKTeco device via Device Manager' },
  { name: 'Suprema', category: 'Biometric', status: 'not_configured', logo: '🔐', detail: 'Suprema BioStar 2 SDK' },
  { name: 'Azure AD', category: 'SSO', status: 'not_configured', logo: '☁️', detail: 'Enterprise SSO via Microsoft' },
  { name: 'Google Workspace', category: 'SSO', status: 'not_configured', logo: '🔵', detail: 'OAuth 2.0 integration' },
  { name: 'Slack', category: 'Notifications', status: 'not_configured', logo: '💬', detail: 'Attendance alerts to Slack channels' },
  { name: 'WhatsApp Business', category: 'Notifications', status: 'not_configured', logo: '📱', detail: 'Check-in OTP via WhatsApp' },
  { name: 'Razorpay', category: 'Billing', status: 'not_configured', logo: '💳', detail: 'Subscription & payroll payments' },
  { name: 'SMTP / Email', category: 'Notifications', status: 'not_configured', logo: '📧', detail: 'Configure SMTP in Enterprise Settings' },
];

export function IntegrationCenter() {
  const categories = [...new Set(INTEGRATIONS.map((i) => i.category))];
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white">Integration Center</h1>
        <p className="text-sm text-slate-400 mt-0.5">Connect third-party services, hardware, and APIs</p>
      </div>
      {categories.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{cat}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTEGRATIONS.filter((i) => i.category === cat).map((item) => (
              <div key={item.name} className="flex items-center gap-4 p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/60 transition-all">
                <span className="text-2xl">{item.logo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{item.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'connected'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : <XCircle className="w-4 h-4 text-slate-600" />}
                  <button className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
