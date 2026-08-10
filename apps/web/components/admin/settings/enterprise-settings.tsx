'use client';
import React from 'react';
import { Settings2, Save, Globe, Clock, Fingerprint, Bell, Shield, Palette } from 'lucide-react';

export function EnterpriseSettings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-bold text-white">Enterprise Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Platform-wide configuration — attendance rules, biometrics, security, branding</p>
      </div>

      {[
        {
          title: 'Attendance Rules', icon: Clock,
          fields: [
            { label: 'Work Start Time', value: '09:00 AM', type: 'time' },
            { label: 'Late Grace Period (minutes)', value: '15', type: 'number' },
            { label: 'Work Hours per Day', value: '9', type: 'number' },
            { label: 'Overtime Threshold (hours)', value: '9', type: 'number' },
          ],
        },
        {
          title: 'Biometric Rules', icon: Fingerprint,
          fields: [
            { label: 'Min Fingerprint Quality (%)', value: '60', type: 'number' },
            { label: 'Duplicate Scan Cooldown (seconds)', value: '5', type: 'number' },
            { label: 'Max Scan Attempts', value: '3', type: 'number' },
            { label: 'Template Proximity Threshold', value: '600', type: 'number' },
          ],
        },
        {
          title: 'Notifications', icon: Bell,
          fields: [
            { label: 'SMTP Host', value: 'smtp.gmail.com', type: 'text' },
            { label: 'SMTP Port', value: '587', type: 'number' },
            { label: 'From Email', value: 'noreply@agencyos.ai', type: 'email' },
            { label: 'WhatsApp API Key', value: '••••••••••••', type: 'password' },
          ],
        },
        {
          title: 'Security', icon: Shield,
          fields: [
            { label: 'Session Timeout (minutes)', value: '60', type: 'number' },
            { label: 'Max Login Attempts', value: '5', type: 'number' },
            { label: 'IP Whitelist', value: '192.168.1.0/24', type: 'text' },
            { label: 'JWT Secret (masked)', value: '••••••••••••••••', type: 'password' },
          ],
        },
      ].map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="p-6 rounded-2xl border border-slate-800/60 bg-slate-900/40 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Icon className="w-4 h-4 text-violet-400" />
              <h2 className="text-sm font-bold text-slate-200">{section.title}</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {section.fields.map((f) => (
                <div key={f.label}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} type={f.type}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition" />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition">
                <Save className="w-3.5 h-3.5" /> Save {section.title}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
