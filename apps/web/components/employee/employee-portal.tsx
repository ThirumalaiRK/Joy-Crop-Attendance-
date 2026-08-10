'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Coffee, Utensils, Briefcase, Navigation, LogOut, LogIn,
  CheckCircle2, Clock, User, Sun, Sunset, Moon,
  AlertCircle, Loader2, Wifi, WifiOff, ChevronRight,
  Zap, ShieldCheck, Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceEventType, AttendanceStatus, AttendanceEvent, AttendanceSummary } from '../../lib/attendance/attendance-types';
import {
  triggerEmployeeEvent,
  getEmployeeCurrentState,
  getValidActionsForState,
  hasCheckedOut,
  fetchEmployeeTimeline,
  fetchAllAttendanceSummaries,
  subscribeAttendanceEvents,
  formatDurationMinutes,
} from '../../lib/attendance/time-engine';

// ─── Action Metadata ────────────────────────────────────────────────────────

const ACTION_META: Record<AttendanceEventType, {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  CHECK_IN: {
    label: 'Check In',
    sublabel: 'Start your work session',
    icon: LogIn,
    color: 'text-emerald-300',
    bg: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/30',
  },
  BREAK_START: {
    label: 'Start Tea Break',
    sublabel: 'Take a short break',
    icon: Coffee,
    color: 'text-blue-300',
    bg: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/30',
  },
  BREAK_END: {
    label: 'End Tea Break',
    sublabel: 'Resume your work session',
    icon: CheckCircle2,
    color: 'text-blue-300',
    bg: 'from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600',
    border: 'border-blue-500/40',
    glow: 'shadow-blue-500/20',
  },
  LUNCH_START: {
    label: 'Start Lunch',
    sublabel: 'Take your lunch break',
    icon: Utensils,
    color: 'text-amber-300',
    bg: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/30',
  },
  LUNCH_END: {
    label: 'End Lunch',
    sublabel: 'Return from lunch',
    icon: CheckCircle2,
    color: 'text-amber-300',
    bg: 'from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-500/20',
  },
  MEETING_OUT: {
    label: 'Enter Meeting',
    sublabel: 'Start a meeting session',
    icon: Briefcase,
    color: 'text-purple-300',
    bg: 'from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/30',
  },
  MEETING_IN: {
    label: 'End Meeting',
    sublabel: 'Meeting complete, resume work',
    icon: CheckCircle2,
    color: 'text-purple-300',
    bg: 'from-purple-700 to-violet-700 hover:from-purple-600 hover:to-violet-600',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-500/20',
  },
  FIELD_VISIT_START: {
    label: 'Start Field Visit',
    sublabel: 'Off-site client visit',
    icon: Navigation,
    color: 'text-cyan-300',
    bg: 'from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/30',
  },
  FIELD_VISIT_END: {
    label: 'End Field Visit',
    sublabel: 'Returned from field visit',
    icon: CheckCircle2,
    color: 'text-cyan-300',
    bg: 'from-cyan-700 to-teal-800 hover:from-cyan-600 hover:to-teal-700',
    border: 'border-cyan-500/40',
    glow: 'shadow-cyan-500/20',
  },
  CHECK_OUT: {
    label: 'Check Out',
    sublabel: 'End your work session for today',
    icon: LogOut,
    color: 'text-rose-300',
    bg: 'from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600',
    border: 'border-rose-500/40',
    glow: 'shadow-rose-500/30',
  },
};

// ─── Status Display ──────────────────────────────────────────────────────────

const STATUS_DISPLAY: Record<string, { label: string; emoji: string; color: string; bg: string; pulse: boolean }> = {
  ABSENT: { label: 'Not Checked In', emoji: '🔴', color: 'text-slate-400', bg: 'bg-slate-800/60', pulse: false },
  PRESENT: { label: 'Working', emoji: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10', pulse: true },
  ON_BREAK: { label: 'Tea Break', emoji: '☕', color: 'text-blue-400', bg: 'bg-blue-500/10', pulse: true },
  ON_LUNCH: { label: 'Lunch Break', emoji: '🍽️', color: 'text-amber-400', bg: 'bg-amber-500/10', pulse: true },
  IN_MEETING: { label: 'In Meeting', emoji: '📋', color: 'text-purple-400', bg: 'bg-purple-500/10', pulse: true },
  ON_FIELD_VISIT: { label: 'Field Visit', emoji: '🧭', color: 'text-cyan-400', bg: 'bg-cyan-500/10', pulse: true },
  CHECKED_OUT: { label: 'Checked Out', emoji: '✅', color: 'text-slate-300', bg: 'bg-slate-700/40', pulse: false },
  LATE: { label: 'Working (Late)', emoji: '🟡', color: 'text-amber-400', bg: 'bg-amber-500/10', pulse: true },
  OVERTIME: { label: 'Overtime', emoji: '⏰', color: 'text-purple-400', bg: 'bg-purple-500/10', pulse: true },
};

const EVENT_LABEL: Record<AttendanceEventType, string> = {
  CHECK_IN: '✅ Checked In',
  BREAK_START: '☕ Tea Break Started',
  BREAK_END: '🔄 Resumed Work',
  LUNCH_START: '🍽️ Lunch Started',
  LUNCH_END: '🔄 Returned from Lunch',
  MEETING_OUT: '📋 Meeting Started',
  MEETING_IN: '🔄 Meeting Ended',
  FIELD_VISIT_START: '🧭 Field Visit Started',
  FIELD_VISIT_END: '🔄 Returned from Field Visit',
  CHECK_OUT: '🔴 Checked Out',
};

// ─── Offline Queue ───────────────────────────────────────────────────────────

interface QueuedAction {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  eventType: AttendanceEventType;
  queuedAt: string;
  originalTimestamp: string;
}

export interface EmployeePortalProps {
  employeeId?: string;
  employeeName?: string;
  department?: string;
}

export function EmployeePortal({
  employeeId = 'EMP-000003',
  employeeName = 'THIRUMALAI R K',
  department = 'Executive Leadership',
}: EmployeePortalProps) {
  const [currentState, setCurrentState] = useState<string>('ABSENT');
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [allowedActions, setAllowedActions] = useState<AttendanceEventType[]>([]);
  const [timeline, setTimeline] = useState<AttendanceEvent[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState<AttendanceEventType | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [offlineQueue, setOfflineQueue] = useState<QueuedAction[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [liveElapsed, setLiveElapsed] = useState(0); // seconds since check-in or last event
  const [isMounted, setIsMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Greeting ──────────────────────────────────────────────────────────────
  const getGreeting = () => {
    if (!now) return { text: 'Good Day', Icon: Sun };
    const h = now.getHours();
    if (h < 12) return { text: 'Good Morning', Icon: Sun };
    if (h < 17) return { text: 'Good Afternoon', Icon: Sunset };
    return { text: 'Good Evening', Icon: Moon };
  };

  // ── Load State ────────────────────────────────────────────────────────────
  const loadState = useCallback(() => {
    const co = hasCheckedOut(employeeId);
    const state = getEmployeeCurrentState(employeeId);
    const actions = getValidActionsForState(state, co);
    const tl = fetchEmployeeTimeline(employeeId);
    const sums = fetchAllAttendanceSummaries();
    const emp = sums.find((s) => s.employeeId === employeeId) || null;

    setIsCheckedOut(co);
    setCurrentState(co ? 'CHECKED_OUT' : state);
    setAllowedActions(actions);
    setTimeline(tl);
    setSummary(emp);
  }, [employeeId]);

  useEffect(() => {
    setIsMounted(true);
    setNow(new Date());
    loadState();
    const unsub = subscribeAttendanceEvents(() => loadState());

    // Online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      flushOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Live clock
    const clockTimer = setInterval(() => setNow(new Date()), 1000);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(clockTimer);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [employeeId, loadState]);

  // ── Offline Queue Flush ───────────────────────────────────────────────────
  const flushOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;
    const queue = [...offlineQueue];
    setOfflineQueue([]);
    for (const item of queue) {
      await triggerEmployeeEvent(item.employeeId, item.employeeName, item.department, item.eventType);
    }
    loadState();
  }, [offlineQueue, loadState]);

  // ── Action Handler ────────────────────────────────────────────────────────
  const handleAction = async (eventType: AttendanceEventType) => {
    if (isLoading) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(eventType);

    try {
      if (!isOnline) {
        // Queue for later sync
        const qItem: QueuedAction = {
          id: Math.random().toString(36).slice(2),
          employeeId,
          employeeName,
          department,
          eventType,
          queuedAt: new Date().toISOString(),
          originalTimestamp: new Date().toISOString(),
        };
        setOfflineQueue((q) => [...q, qItem]);
        setSuccessMessage(`Offline: "${ACTION_META[eventType].label}" queued. Will sync when connection is restored.`);
        setIsLoading(null);
        return;
      }

      const result = await triggerEmployeeEvent(
        employeeId,
        employeeName,
        department,
        eventType,
        'Employee Portal (Web)',
        'Manual'
      );

      if (result.success) {
        confetti({ particleCount: eventType === 'CHECK_IN' ? 150 : 70, spread: 65, origin: { y: 0.6 } });
        setSuccessMessage(`${ACTION_META[eventType].label} recorded at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`);
        loadState();
      } else {
        setErrorMessage(result.error || 'Action not allowed.');
      }
    } catch (e: any) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  // ─── Derived Values ───────────────────────────────────────────────────────
  const greeting = getGreeting();
  const statusDisplay = STATUS_DISPLAY[currentState] || STATUS_DISPLAY['ABSENT'];
  const currentTimeStr = isMounted && now ? now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '—:—:—';
  const todayDateStr = isMounted && now ? now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-[#060c14] p-4 md:p-8 space-y-6 animate-in fade-in select-none">

      {/* ── Greeting Header ────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/30">
              {employeeName[0]}
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <greeting.Icon className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-semibold text-slate-400">{greeting.text}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">{employeeName}</h1>
              <span className="text-xs text-slate-500 font-medium">{department} • {employeeId}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="font-mono text-3xl font-black text-white tracking-widest tabular-nums">{currentTimeStr}</div>
            <div className="text-xs text-slate-500">{todayDateStr}</div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isOnline ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-rose-500/30 text-rose-400 bg-rose-500/10'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Connected' : `Offline (${offlineQueue.length} queued)`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Status Card + Actions ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Live Status Card */}
          <div className={`p-6 rounded-3xl border shadow-2xl ${statusDisplay.bg} ${
            currentState === 'CHECKED_OUT' ? 'border-slate-700/50' :
            currentState === 'ON_LUNCH' ? 'border-amber-500/30' :
            currentState === 'ON_BREAK' ? 'border-blue-500/30' :
            currentState === 'IN_MEETING' ? 'border-purple-500/30' :
            'border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Current Status</span>
                <div className="flex items-center gap-3 mt-2">
                  {statusDisplay.pulse && (
                    <span className={`w-3 h-3 rounded-full ${
                      currentState === 'ON_LUNCH' ? 'bg-amber-400' :
                      currentState === 'ON_BREAK' ? 'bg-blue-400' :
                      currentState === 'IN_MEETING' ? 'bg-purple-400' :
                      'bg-emerald-400'
                    } animate-ping`} />
                  )}
                  <span className="text-4xl">{statusDisplay.emoji}</span>
                  <span className={`text-3xl font-black ${statusDisplay.color}`}>{statusDisplay.label}</span>
                </div>
              </div>

              {summary && (
                <div className="text-right space-y-1">
                  <span className="text-xs font-bold text-slate-400">Working Time Today</span>
                  <div className="text-2xl font-black text-white font-mono">
                    {formatDurationMinutes(summary.workingTimeMinutes)}
                  </div>
                  <span className="text-[11px] text-slate-500">Net ({summary.breakDurationMinutes}m break + {summary.lunchDurationMinutes}m lunch deducted)</span>
                </div>
              )}
            </div>

            {/* Check-in time display */}
            {summary?.checkInTime && summary.checkInTime !== '—' && (
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Check-In: <strong className="text-emerald-400">{summary.checkInTime}</strong></span>
                {summary.checkOutTime && summary.checkOutTime !== '—' && (
                  <span className="text-slate-400">Check-Out: <strong className="text-purple-400">{summary.checkOutTime}</strong></span>
                )}
                {summary.lateMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold">
                    {formatDurationMinutes(summary.lateMinutes)} Late
                  </span>
                )}
                {summary.overtimeMinutes > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold">
                    +{formatDurationMinutes(summary.overtimeMinutes)} OT
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ── DYNAMIC ACTION BUTTONS ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">
                {isCheckedOut ? 'Day Complete' : allowedActions.length === 0 ? 'No Actions Available' : 'Available Actions'}
              </h2>
              {!isCheckedOut && allowedActions.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500 ml-1">State: {currentState}</span>
              )}
            </div>

            {isCheckedOut ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
                <div className="text-3xl">🎉</div>
                <p className="text-emerald-400 font-black text-lg">Great work today!</p>
                <p className="text-slate-400 text-sm">Your session is complete. See you tomorrow.</p>
                {summary && (
                  <div className="mt-3 font-mono text-xs text-slate-300 space-y-1">
                    <div>Total Working Time: <strong className="text-white">{formatDurationMinutes(summary.workingTimeMinutes)}</strong></div>
                    {summary.overtimeMinutes > 0 && <div>Overtime: <strong className="text-purple-400">+{formatDurationMinutes(summary.overtimeMinutes)}</strong></div>}
                  </div>
                )}
              </div>
            ) : allowedActions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No actions available in current state.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allowedActions.map((eventType) => {
                  const meta = ACTION_META[eventType];
                  const Icon = meta.icon;
                  const isThisLoading = isLoading === eventType;
                  return (
                    <button
                      key={eventType}
                      onClick={() => handleAction(eventType)}
                      disabled={!!isLoading}
                      className={`
                        relative flex items-center gap-4 p-5 rounded-2xl border
                        bg-gradient-to-r ${meta.bg} ${meta.border}
                        shadow-xl ${meta.glow}
                        transition-all duration-200 active:scale-[0.98]
                        disabled:opacity-60 disabled:cursor-not-allowed
                        group text-left
                      `}
                    >
                      <div className={`p-3 rounded-xl bg-white/10 ${meta.color} group-hover:bg-white/20 transition`}>
                        {isThisLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex flex-col text-left flex-1">
                        <span className="text-base font-black text-white">{meta.label}</span>
                        <span className={`text-xs font-medium ${meta.color} opacity-80`}>{meta.sublabel}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/70 transition shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offline Queue Display */}
          {offlineQueue.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <WifiOff className="w-4 h-4" />
                <span>{offlineQueue.length} action(s) queued for sync</span>
              </div>
              {offlineQueue.map((item) => (
                <div key={item.id} className="text-[11px] font-mono text-amber-300/70">
                  {ACTION_META[item.eventType].label} — queued at {new Date(item.queuedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Day Timeline ───────────────────────────────────────────── */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Today's Timeline</h3>
            <span className="ml-auto text-[10px] text-slate-500 font-mono">{timeline.length} events</span>
          </div>

          {timeline.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-600 text-xs text-center space-y-2">
              <Clock className="w-8 h-8 opacity-20" />
              <p>No events recorded today.</p>
              <p className="text-[11px]">Check in to start tracking.</p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-4 flex-1 overflow-y-auto max-h-[520px] before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-800">
              {timeline.map((evt, idx) => {
                const isLast = idx === timeline.length - 1;
                const nodeColor =
                  evt.eventType === 'CHECK_IN' ? 'bg-emerald-400 border-emerald-400' :
                  evt.eventType === 'CHECK_OUT' ? 'bg-purple-400 border-purple-400' :
                  evt.eventType.includes('LUNCH') ? 'bg-amber-400 border-amber-400' :
                  evt.eventType.includes('BREAK') ? 'bg-blue-400 border-blue-400' :
                  evt.eventType.includes('MEETING') ? 'bg-violet-400 border-violet-400' :
                  'bg-cyan-400 border-cyan-400';

                return (
                  <div key={evt.id} className="relative flex items-start gap-3">
                    <span className={`absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full border-2 ${isLast ? nodeColor : 'border-slate-700 bg-slate-950'}`} />
                    <div className={`flex-1 p-3 rounded-xl border text-left ${isLast ? 'bg-slate-950 border-slate-700' : 'bg-transparent border-transparent'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isLast ? 'text-white' : 'text-slate-400'}`}>
                          {EVENT_LABEL[evt.eventType]}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-emerald-400">{evt.formattedTime}</span>
                      </div>
                      {isLast && evt.notes && (
                        <p className="text-[10px] text-slate-500 mt-0.5">{evt.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Current State Live Indicator */}
              {!isCheckedOut && timeline.length > 0 && (
                <div className="relative flex items-center gap-3">
                  <span className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div className="flex-1 p-2.5 rounded-xl bg-transparent">
                    <span className="text-[10px] font-bold text-emerald-400/70 animate-pulse">● Now — {statusDisplay.label}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mini Summary */}
          {summary && (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Tea Break</div>
                <div className="text-blue-400 font-black">{summary.breakDurationMinutes > 0 ? `${summary.breakDurationMinutes}m` : '—'}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Lunch</div>
                <div className="text-amber-400 font-black">{summary.lunchDurationMinutes > 0 ? `${summary.lunchDurationMinutes}m` : '—'}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Net Work</div>
                <div className="text-white font-black">{formatDurationMinutes(summary.workingTimeMinutes)}</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-500">Overtime</div>
                <div className="text-purple-400 font-black">{summary.overtimeMinutes > 0 ? `+${formatDurationMinutes(summary.overtimeMinutes)}` : '—'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
