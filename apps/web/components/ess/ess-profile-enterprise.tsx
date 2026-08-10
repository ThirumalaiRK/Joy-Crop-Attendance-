'use client';

import React from 'react';
import { User, Briefcase, Phone, Clock, ShieldCheck } from 'lucide-react';

interface ESSProfileEnterpriseProps {
  employeeName: string;
  employeeId: string;
  department: string;
  designation?: string;
  reportingManager?: string;
  shift?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
}

export function ESSProfileEnterprise({
  employeeName,
  employeeId,
  department,
  designation = 'Senior Lead Engineer',
  reportingManager = 'Joy Corporate Board',
  shift = 'General Shift (09:00 AM - 06:00 PM)',
  avatarUrl,
  email,
  phone = '+91 98765 00000',
  emergencyContact = '+91 98765 00000 (Spouse)',
}: ESSProfileEnterpriseProps) {
  const displayAvatar = avatarUrl && !avatarUrl.includes('photo-1534528741775-53994a69daeb')
    ? avatarUrl
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(employeeName)}&background=0ea5e9&color=fff&size=200&bold=true`;

  return (
    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 max-w-2xl mx-auto">
      {/* Photo & Main Details */}
      <div className="flex items-center gap-5 border-b border-slate-800 pb-6">
        <img
          src={displayAvatar}
          alt={employeeName}
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl bg-slate-950"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white">{employeeName}</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-mono">
              VERIFIED
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">{department} • {designation}</p>
          <span className="text-xs text-emerald-400 font-mono font-bold block">ID: {employeeId}</span>
          {email && <span className="text-[11px] text-slate-400 font-mono block">{email}</span>}
        </div>
      </div>

      {/* View-Only Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Department</span>
          <span className="text-white font-bold block">{department}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Reporting Manager</span>
          <span className="text-purple-400 font-bold block">{reportingManager}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Assigned Shift</span>
          <span className="text-amber-400 font-bold block">{shift}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Emergency Contact</span>
          <span className="text-rose-400 font-mono font-bold block">{emergencyContact}</span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-400">Profile Status</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> View-Only Profile (Managed by HR)
        </span>
      </div>
    </div>
  );
}
