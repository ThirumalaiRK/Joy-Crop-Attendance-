'use client';

import React from 'react';
import {
  CheckCircle2,
  Coffee,
  Utensils,
  Briefcase,
  Navigation,
  LogOut,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AttendanceEvent } from '../../lib/attendance/attendance-types';

interface ESSTimelineEnhancedProps {
  events: AttendanceEvent[];
  employeeName: string;
}

export function ESSTimelineEnhanced({ events, employeeName }: ESSTimelineEnhancedProps) {
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'CHECK_IN':
        return { label: '✓ Check In', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'BREAK_START':
        return { label: '☕ Tea Break', icon: Coffee, color: 'text-blue-400' };
      case 'BREAK_END':
        return { label: '🟢 Resume Work', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'LUNCH_START':
        return { label: '🍽 Lunch Break', icon: Utensils, color: 'text-amber-400' };
      case 'LUNCH_END':
        return { label: '🟢 Resume Work', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'MEETING_OUT':
        return { label: '👥 Meeting Start', icon: Briefcase, color: 'text-purple-400' };
      case 'MEETING_IN':
        return { label: '🟢 End Meeting', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'FIELD_VISIT_START':
        return { label: '🚗 Field Visit Start', icon: Navigation, color: 'text-cyan-400' };
      case 'FIELD_VISIT_END':
        return { label: '🟢 Return To Office', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'CHECK_OUT':
        return { label: '🔴 Check Out', icon: LogOut, color: 'text-rose-400' };
      default:
        return { label: type, icon: Clock, color: 'text-slate-400' };
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" /> Today's Timeline
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">{events.length} Events Logged</span>
      </div>

      {events.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500">
          No attendance events recorded today.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {events.map((evt, idx) => {
            const meta = getEventBadge(evt.eventType);
            const Icon = meta.icon;

            return (
              <div key={evt.id || idx} className="py-3 flex items-center justify-between hover:bg-slate-850/40 px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold text-xs">{evt.formattedTime || '09:00 AM'}</span>
                  <div className="flex items-center gap-1.5 font-sans font-bold text-white">
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                    <span>{meta.label}</span>
                  </div>
                </div>

                {evt.notes && (
                  <span className="text-[10px] text-slate-400 italic font-sans max-w-[180px] truncate">
                    {evt.notes}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
