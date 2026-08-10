'use client';

import React from 'react';
import {
  Sparkles,
  Clock,
  Briefcase,
  ShieldCheck,
  Coffee,
  Utensils,
  Navigation,
  LogOut,
  CheckCircle2,
  Play,
  Check,
} from 'lucide-react';
import { AttendanceStatus, AttendanceEventType } from '../../lib/attendance/attendance-types';
import { useDynamicTimeGreeting } from '../../lib/time-greeting';

interface ESSHeroMeshProps {
  employeeName: string;
  employeeId: string;
  department: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  checkInTime: string;
  workingTimeStr: string;
  netWorkingMinutes: number;
  validActions: AttendanceEventType[];
  onTriggerEvent: (eventType: AttendanceEventType, notes?: string) => Promise<void>;
  isLoading: boolean;
  isMounted: boolean;
}

export function ESSHeroMesh({
  employeeName,
  employeeId,
  department,
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  status,
  checkInTime,
  workingTimeStr,
  netWorkingMinutes,
  validActions,
  onTriggerEvent,
  isLoading,
  isMounted,
}: ESSHeroMeshProps) {
  const { salutation, icon, tagline } = useDynamicTimeGreeting(employeeName);

  // Goal: 8 hours (480 mins)
  const goalMinutes = 480;
  const remainingMinutes = Math.max(0, goalMinutes - netWorkingMinutes);
  const remainingStr = isMounted
    ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
    : '0h 0m';

  const getStatusBadge = () => {
    switch (status as string) {
      case 'PRESENT':
        return { label: '🟢 Working', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/10' };
      case 'ON_LUNCH':
        return { label: '🍽 Lunch Break', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-amber-500/10' };
      case 'ON_BREAK':
        return { label: '☕ Tea Break', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-blue-500/10' };
      case 'IN_MEETING':
        return { label: '👥 In Meeting', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-purple-500/10' };
      case 'ON_FIELD_VISIT':
        return { label: '🚗 On Field Visit', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-cyan-500/10' };
      case 'CHECKED_OUT':
        return { label: '🔴 Checked Out Today', bg: 'bg-slate-700/40 text-slate-300 border-slate-600' };
      default:
        return { label: '🔴 Not Checked In', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
    }
  };

  const badge = getStatusBadge();

  const getActionButtonMeta = (action: AttendanceEventType) => {
    switch (action) {
      case 'CHECK_IN':
        return { label: 'Check In Now', icon: Play, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' };
      case 'BREAK_START':
        return { label: '☕ Start Tea', icon: Coffee, bg: 'bg-blue-600 hover:bg-blue-500 text-white' };
      case 'BREAK_END':
        return { label: '🟢 Resume Work', icon: CheckCircle2, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' };
      case 'LUNCH_START':
        return { label: '🍽 Start Lunch', icon: Utensils, bg: 'bg-amber-600 hover:bg-amber-500 text-white' };
      case 'LUNCH_END':
        return { label: '🟢 Resume Work', icon: CheckCircle2, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' };
      case 'MEETING_OUT':
        return { label: '👥 Meeting', icon: Briefcase, bg: 'bg-purple-600 hover:bg-purple-500 text-white' };
      case 'MEETING_IN':
        return { label: '🟢 End Meeting', icon: CheckCircle2, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' };
      case 'FIELD_VISIT_START':
        return { label: '🚗 Field Visit', icon: Navigation, bg: 'bg-cyan-600 hover:bg-cyan-500 text-white' };
      case 'FIELD_VISIT_END':
        return { label: '🟢 Return To Office', icon: CheckCircle2, bg: 'bg-emerald-600 hover:bg-emerald-500 text-white' };
      case 'CHECK_OUT':
        return { label: '🔴 Check Out', icon: LogOut, bg: 'bg-rose-600 hover:bg-rose-500 text-white' };
      default:
        return { label: action, icon: Clock, bg: 'bg-slate-700 hover:bg-slate-600 text-white' };
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 p-6 md:p-8 shadow-2xl space-y-6">
      {/* Background Mesh */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Top Employee Identification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-4">
          <img
            src={avatarUrl}
            alt={employeeName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-xl"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <span>{icon}</span> {salutation}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{employeeName}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono flex-wrap">
              <span>{department}</span>
              <span>•</span>
              <span className="text-emerald-400">{employeeId}</span>
              <span>•</span>
              <span className="text-slate-400 font-medium">{tagline}</span>
            </div>
          </div>
        </div>

        {/* Live Status Badge */}
        <span className={`px-4 py-2 rounded-2xl text-xs font-black border shadow-lg flex items-center justify-center gap-2 ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Working Metrics Row */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Checked In</span>
          <span className="text-base md:text-lg font-black text-emerald-400 font-mono mt-1 block">
            {checkInTime || '—'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Working Time</span>
          <span className="text-base md:text-lg font-black text-white font-mono mt-1 block">
            {isMounted ? workingTimeStr : '--:--:--'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Remaining</span>
          <span className="text-base md:text-lg font-black text-amber-400 font-mono mt-1 block">
            {remainingStr}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
          Quick Work Actions
        </span>

        {(!validActions || validActions.length === 0) ? (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400 font-bold">
            Work Completed • See You Tomorrow 👋
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(validActions || []).map((action) => {
              const meta = getActionButtonMeta(action);
              const Icon = meta.icon;
              return (
                <button
                  key={action}
                  disabled={isLoading}
                  onClick={() => onTriggerEvent(action)}
                  className={`flex items-center justify-center gap-2 p-3.5 rounded-2xl font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 ${meta.bg}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
