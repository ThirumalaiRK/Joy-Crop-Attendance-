'use client';

import React from 'react';
import {
  Clock,
  Coffee,
  Utensils,
  Briefcase,
  Navigation,
  LogOut,
  Play,
  CheckCircle2,
} from 'lucide-react';
import {
  AttendanceStatus,
  AttendanceEventType,
  AttendanceSummary,
} from '../../lib/attendance/attendance-types';

interface ESSWorkSessionManagerProps {
  summary: AttendanceSummary;
  validActions: AttendanceEventType[];
  onTriggerEvent: (eventType: AttendanceEventType, notes?: string) => Promise<void>;
  isLoading: boolean;
  isMounted: boolean;
}

export function ESSWorkSessionManager({
  summary,
  validActions,
  onTriggerEvent,
  isLoading,
  isMounted,
}: ESSWorkSessionManagerProps) {
  const teaUsedMins = summary.breakDurationMinutes || 0;
  const lunchUsedMins = summary.lunchDurationMinutes || 0;

  const getStatusBadge = () => {
    switch (summary.status as string) {
      case 'PRESENT':
        return { label: '🟢 Working', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'ON_LUNCH':
        return { label: '🍽 Lunch Break', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'ON_BREAK':
        return { label: '☕ Tea Break', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      case 'IN_MEETING':
        return { label: '👥 In Meeting', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'ON_FIELD_VISIT':
        return { label: '🚗 On Field Visit', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
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
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
      {/* Current Status Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Work Session Manager</h2>
          <p className="text-xs text-slate-400 mt-0.5">Realtime attendance state & 1-click action console</p>
        </div>

        <span className={`px-4 py-2 rounded-2xl text-xs font-black border shadow-lg ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Grid: Working Time & Break Trackers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Working Time
          </span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {isMounted ? `${Math.floor(summary.workingTimeMinutes / 60)}h ${summary.workingTimeMinutes % 60}m` : '0h 0m'}
          </div>
          <span className="text-[10px] text-slate-500">Check In: {summary.checkInTime || '—'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-blue-400" /> Tea Break
          </span>
          <div className={`font-black font-mono mt-1 ${teaUsedMins > 0 ? 'text-2xl text-blue-400' : 'text-sm text-slate-500'}`}>
            {isMounted ? (teaUsedMins > 0 ? `${teaUsedMins} Minutes` : 'Not Taken') : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Allowed: 15 Minutes</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5 text-amber-400" /> Lunch
          </span>
          <div className={`font-black font-mono mt-1 ${lunchUsedMins > 0 ? 'text-2xl text-amber-400' : 'text-sm text-slate-500'}`}>
            {isMounted ? (lunchUsedMins > 0 ? `${lunchUsedMins} Minutes` : 'Not Taken') : '—'}
          </div>
          <span className="text-[10px] text-slate-500">Allowed: 60 Minutes</span>
        </div>
      </div>

      {/* Dynamic Action Buttons Console */}
      <div className="space-y-3 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          Available Quick Actions
        </span>

        {(!validActions || validActions.length === 0) ? (
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-sm font-bold text-slate-300">
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
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl font-bold text-xs shadow-lg transition active:scale-95 disabled:opacity-50 ${meta.bg}`}
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
