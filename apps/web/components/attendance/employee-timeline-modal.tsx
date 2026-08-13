'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X, LogIn, LogOut, Coffee, Utensils, Navigation, Users,
  Fingerprint, Building2, ChevronDown, ChevronRight,
  Clock, Wifi, Activity, CheckCircle, MapPin, Zap, FileJson, FileText, Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportAttendanceToExcel } from '../../lib/attendance/export-engine';
import { getISTDateStr, formatMachineTimeIST, formatDisplayIST } from '../../lib/timezone';
import { RawPunchDetailsDrawer, RawPunchRecord } from './raw-punch-details-drawer';
import { clsx } from 'clsx';

export interface TimelineEventItem {
  id: string; employeeId: string; employeeName: string; eventType: string;
  eventTime: string; formattedTime: string; device?: string; method?: string;
  location?: string; notes?: string; confidenceScore?: number; elapsedMinutes?: number; isRaw?: boolean;
  machineTimestamp?: string; rawRecord?: RawPunchRecord;
}

interface EmployeeTimelineModalProps {
  employeeId: string; employeeName?: string; department?: string; onClose: () => void;
}

function fmtDuration(mins: number): string {
  if (!mins || mins <= 0) return '—';
  const h = Math.floor(mins / 60); const m = mins % 60;
  if (h === 0) return `${m}m`; return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function getEventMeta(type: string) {
  switch (type) {
    case 'CHECK_IN': return { icon: LogIn, label: 'Check In', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', ring: 'ring-emerald-400' };
    case 'CHECK_OUT': return { icon: LogOut, label: 'Check Out', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400', ring: 'ring-rose-400' };
    case 'BREAK_START': return { icon: Coffee, label: 'Tea Break', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400', ring: 'ring-orange-400' };
    case 'BREAK_END': return { icon: Activity, label: 'Resume', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', ring: 'ring-blue-400' };
    case 'LUNCH_START': return { icon: Utensils, label: 'Lunch', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400', ring: 'ring-amber-400' };
    case 'LUNCH_END': return { icon: Activity, label: 'Resume', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400', ring: 'ring-blue-400' };
    case 'FIELD_VISIT_START': case 'FIELD_VISIT_END': return { icon: Navigation, label: type === 'FIELD_VISIT_START' ? 'Field Visit' : 'Field Return', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400', ring: 'ring-cyan-400' };
    case 'MEETING_OUT': case 'MEETING_IN': return { icon: Users, label: type === 'MEETING_OUT' ? 'Meeting Out' : 'Meeting Back', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400', ring: 'ring-purple-400' };
    default: return { icon: Zap, label: type.replace(/_/g, ' '), color: 'text-slate-400', bg: 'bg-slate-800/60', border: 'border-slate-700', dot: 'bg-slate-400', ring: 'ring-slate-400' };
  }
}

const BUSINESS_EVENTS = new Set(['CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END','LUNCH_START','LUNCH_END','FIELD_VISIT_START','FIELD_VISIT_END','MEETING_OUT','MEETING_IN']);

export function EmployeeTimelineModal({ employeeId, employeeName, department = 'Engineering', onClose }: EmployeeTimelineModalProps) {
  const [loading, setLoading] = useState(true);
  const [devOpen, setDevOpen] = useState(false);
  const [newEvtPulse, setNewEvtPulse] = useState(false);
  const [selectedPunch, setSelectedPunch] = useState<RawPunchRecord | null>(null);
  const [empInfo, setEmpInfo] = useState({ name: employeeName || 'Employee', code: employeeId || 'EMP-001', dept: department, avatar: undefined as string | undefined, shift: '09:00 AM – 06:00 PM' });
  const [session, setSession] = useState({ checkIn: null as string|null, checkOut: null as string|null, status: 'Absent', lateMins: 0, earlyMins: 0, netMins: 0, overtimeMins: 0, breakMins: 0, lunchMins: 0, device: 'Identix K90 Pro' });
  const [businessEvents, setBusinessEvents] = useState<TimelineEventItem[]>([]);
  const [rawEvents, setRawEvents] = useState<TimelineEventItem[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [sessionDuration, setSessionDuration] = useState('—');
  const prevCount = useRef(0);

  // Single source of truth for business date in IST
  const TODAY_STR = getISTDateStr();

  /** Build all plausible employee_id variants */
  const buildIdVariants = (id: string, name?: string): string[] => {
    const variants = new Set<string>([id]);
    const num = parseInt(id.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      variants.add(`EMP-${num}`);
      variants.add(`EMP-${String(num).padStart(2, '0')}`);
      variants.add(`EMP-${String(num).padStart(6, '0')}`);
      variants.add(String(num));
    }
    return [...variants];
  };

  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const compute = () => {
      if (!session.checkIn) { setSessionDuration('—'); return; }
      const startMs = new Date(session.checkIn).getTime();
      if (isNaN(startMs)) { setSessionDuration('—'); return; }
      const endMs = session.checkOut ? new Date(session.checkOut).getTime() : Date.now();
      setSessionDuration(fmtDuration(Math.max(0, Math.floor((endMs - startMs) / 60000))));
    };
    compute(); const id = setInterval(compute, 30000); return () => clearInterval(id);
  }, [session.checkIn, session.checkOut]);

  const loadData = async () => {
    setLoading(true);
    try {
      const idVariants = buildIdVariants(employeeId, employeeName);
      const idOrFilter = idVariants.map(v => `employee_id.eq.${v}`).join(',');
      const nameFilter = employeeName ? `,employee_name.ilike.${employeeName}` : '';
      const evtOrFilter = idOrFilter + nameFilter;

      // ── Employee metadata ───────────────────────────────────────────────────
      const empOrFilter = idVariants.map(v => `employee_code.eq.${v},id.eq.${v}`).join(',');
      const { data: empRows } = await supabase.from('employees').select('*').or(empOrFilter).limit(1);
      if (empRows?.[0]) {
        const e = empRows[0];
        setEmpInfo(prev => ({ ...prev, name: e.name||prev.name, code: e.employee_code||e.id||prev.code, dept: e.department||prev.dept, avatar: e.avatar, shift: e.shift||prev.shift }));
      }

      // ── Attendance session ──────────────────────────────────────────────────
      const { data: sessRows } = await supabase
        .from('attendance_sessions')
        .select('*')
        .or(idOrFilter)
        .eq('session_date', TODAY_STR)
        .order('created_at', { ascending: false })
        .limit(1);

      let resolvedCheckIn: string | null = null;
      let resolvedCheckOut: string | null = null;

      if (sessRows?.[0]) {
        const s = sessRows[0];
        resolvedCheckIn = s.check_in_time || null;
        resolvedCheckOut = s.check_out_time || null;
        setSession({
          checkIn: resolvedCheckIn, checkOut: resolvedCheckOut,
          status: s.status || 'PRESENT', lateMins: s.late_mins || 0,
          earlyMins: s.early_exit_mins || 0, netMins: s.net_work_mins || 0,
          overtimeMins: s.overtime_mins || 0, breakMins: s.break_time_mins || 0,
          lunchMins: s.lunch_time_mins || 0, device: 'Identix K90 Pro (192.168.1.56)',
        });
      } else {
        const recOrFilter = idVariants.map(v => `employee_id.eq.${v}`).join(',');
        const { data: recRows } = await supabase.from('attendance_records').select('*')
          .or(recOrFilter).eq('date', TODAY_STR).limit(1);
        if (recRows?.[0]) {
          const r = recRows[0];
          resolvedCheckIn = r.check_in_utc || r.check_in_time;
          resolvedCheckOut = r.check_out_utc || r.check_out_time;
          setSession(prev => ({
            ...prev,
            checkIn: resolvedCheckIn,
            checkOut: resolvedCheckOut,
            status: r.status === 'late' ? 'LATE' : 'PRESENT',
            device: r.device_name || prev.device
          }));
        }
      }

      // ── Query `biometric_raw_punches` (Immutable Source Data) ───────────────
      const { data: rawPunchRows } = await supabase
        .from('biometric_raw_punches')
        .select('*')
        .or(idOrFilter)
        .order('event_time_utc', { ascending: true });

      // ── Query `attendance_events` (Classified Events) ───────────────────────
      const { data: aeData } = await supabase
        .from('attendance_events')
        .select('*')
        .or(evtOrFilter)
        .gte('event_time', `${TODAY_STR}T00:00:00.000Z`)
        .order('event_time', { ascending: true });

      const bizEvts: TimelineEventItem[] = [];
      const rawEvts: TimelineEventItem[] = [];
      const seenBiz = new Map<string, boolean>();

      // Populate from raw punches first if available
      if (rawPunchRows && rawPunchRows.length > 0) {
        rawPunchRows.forEach((rp: any) => {
          const formattedTs = formatMachineTimeIST(rp.machine_timestamp, true);
          const rawItem: TimelineEventItem = {
            id: rp.id,
            employeeId: rp.employee_id || employeeId,
            employeeName: empInfo.name,
            eventType: rp.event_type === 'IN' ? 'CHECK_IN' : rp.event_type === 'OUT' ? 'CHECK_OUT' : 'RAW_PUNCH',
            eventTime: rp.event_time_utc,
            formattedTime: formattedTs,
            machineTimestamp: rp.machine_timestamp,
            device: `Identix Terminal (${rp.device_ip})`,
            method: (rp.verification_type || 'FINGERPRINT').toLowerCase(),
            location: 'HQ Main Terminal',
            notes: `Raw Machine Punch: ${rp.machine_timestamp}`,
            confidenceScore: 99.8,
            isRaw: true,
            rawRecord: rp as RawPunchRecord,
          };
          rawEvts.push(rawItem);
        });
      }

      (aeData || []).forEach((row: any) => {
        const dateObj = new Date(row.event_time);
        const fmt = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        const item: TimelineEventItem = {
          id: row.id, employeeId: row.employee_id, employeeName: row.employee_name,
          eventType: row.event_type, eventTime: row.event_time, formattedTime: fmt,
          device: row.device || 'Identix K90 Pro (192.168.1.56)',
          method: row.method || 'fingerprint',
          location: row.location || 'HQ Main Entrance',
          notes: row.notes, confidenceScore: row.confidence_score || 99.8,
          isRaw: !BUSINESS_EVENTS.has(row.event_type),
        };
        if (BUSINESS_EVENTS.has(row.event_type)) {
          const key = `${row.event_type}|${dateObj.toISOString().substring(0, 16)}`;
          if (!seenBiz.has(key)) { seenBiz.set(key, true); bizEvts.push(item); }
        } else if (rawEvents.length === 0) {
          rawEvts.push(item);
        }
      });

      if (!resolvedCheckIn && bizEvts.length > 0) {
        const firstCheckIn = bizEvts.find(e => e.eventType === 'CHECK_IN');
        if (firstCheckIn) {
          resolvedCheckIn = firstCheckIn.eventTime;
          setSession(prev => ({
            ...prev,
            checkIn: firstCheckIn.eventTime,
            status: prev.status === 'Absent' ? 'PRESENT' : prev.status,
          }));
        }
      }

      bizEvts.forEach((evt, i) => {
        if (i > 0) {
          const prevMs = new Date(bizEvts[i-1].eventTime).getTime();
          const currMs = new Date(evt.eventTime).getTime();
          evt.elapsedMinutes = Math.max(0, Math.round((currMs - prevMs) / 60000));
        }
      });

      const newCount = bizEvts.length + rawEvts.length;
      if (newCount > prevCount.current && prevCount.current > 0) {
        setNewEvtPulse(true);
        setTimeout(() => setNewEvtPulse(false), 1500);
      }
      prevCount.current = newCount;
      setBusinessEvents(bizEvts);
      setRawEvents(rawEvts);
    } catch (err) { console.error('[EmployeeTimelineModal]', err); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const ch = supabase
      .channel(`modal-${employeeId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'biometric_raw_punches' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_events' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_sessions' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [employeeId, employeeName]);

  const fmtTime = (raw: string|null): string|null => {
    if (!raw) return null;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
    return raw;
  };
  const checkInDisplay = fmtTime(session.checkIn);
  const checkOutDisplay = fmtTime(session.checkOut);
  const statusLabel = session.status === 'PRESENT' ? 'Present' : session.status === 'LATE' ? 'Late' : session.status;
  const statusColor = session.status==='PRESENT'||session.status==='Working'?'text-emerald-400 bg-emerald-500/10 border-emerald-500/20':session.status==='LATE'?'text-amber-400 bg-amber-500/10 border-amber-500/20':'text-slate-400 bg-slate-800/60 border-slate-700';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-slate-950/80 backdrop-blur-xl" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full sm:max-w-2xl bg-[#0c0e14] border border-slate-800/50 sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[84vh] overflow-hidden">

          {/* 1. HEADER */}
          <div className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {empInfo.avatar ? (<img src={empInfo.avatar} alt={empInfo.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-700" />) : (<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm">{(empInfo.name||'?')[0].toUpperCase()}</div>)}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0c0e14]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">{empInfo.name}</h2>
                  <span className="hidden sm:inline text-[10px] font-mono text-slate-600 bg-slate-800/60 px-1.5 py-0.5 rounded">{empInfo.code}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="text-[11px] text-slate-500">{empInfo.dept}</span>
                  <span className="text-slate-700 hidden sm:inline">·</span>
                  <Clock className="w-3 h-3 text-slate-600 hidden sm:block shrink-0" />
                  <span className="text-[11px] text-slate-500 hidden sm:inline">{empInfo.shift}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right hidden sm:block">
                <div className="font-mono text-sm font-semibold text-white tabular-nums">{currentTime}</div>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-medium tracking-wide">LIVE</span>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="p-5 space-y-4">

              {/* 2. STATUS CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1.5">Status</p>
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', statusColor)}>{statusLabel}</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">Session</p>
                  <p className="text-sm font-semibold text-white font-mono tabular-nums">{sessionDuration}</p>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">Device</p>
                  <div className="flex items-center gap-1.5"><Wifi className="w-3 h-3 text-emerald-400 shrink-0" /><p className="text-[11px] font-medium text-slate-300 truncate">Identix K90 Pro</p></div>
                </div>
                <div className={clsx('bg-slate-900/40 border rounded-xl p-3 transition-all duration-300', newEvtPulse ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800/50')}>
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wide mb-1">Today's Events</p>
                  <p className="text-sm font-semibold text-white tabular-nums">{businessEvents.length}<span className="text-slate-600 text-xs font-normal ml-1">events</span></p>
                </div>
              </div>

              {/* 3. SESSION SUMMARY */}
              <div className={clsx('rounded-xl border p-4', checkInDisplay ? 'border-emerald-500/15 bg-emerald-500/[0.04]' : 'border-slate-800/50 bg-slate-900/30')}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Today's Attendance Session</h3>
                  {checkInDisplay && <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full border', statusColor)}>{statusLabel}</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Check In</p>
                    <div className="flex items-center gap-1">
                      {checkInDisplay && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                      <p className={clsx('text-xs font-semibold font-mono', checkInDisplay ? 'text-emerald-400' : 'text-slate-700')}>{checkInDisplay||'—'}</p>
                    </div>
                    {!checkInDisplay && <p className="text-[9px] text-slate-700 mt-0.5">Not checked in</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Check Out</p>
                    <p className={clsx('text-xs font-semibold font-mono', checkOutDisplay ? 'text-rose-400' : 'text-slate-700')}>{checkOutDisplay||'—'}</p>
                    {!checkOutDisplay && checkInDisplay && <p className="text-[9px] text-slate-700 mt-0.5">No checkout yet</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Working</p>
                    <p className="text-xs font-semibold text-white font-mono">{sessionDuration}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Tea Break</p>
                    <p className="text-xs font-semibold text-slate-400 font-mono">{fmtDuration(session.breakMins)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Lunch</p>
                    <p className="text-xs font-semibold text-slate-400 font-mono">{fmtDuration(session.lunchMins)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Overtime</p>
                    <p className={clsx('text-xs font-semibold font-mono', session.overtimeMins > 0 ? 'text-violet-400' : 'text-slate-700')}>{fmtDuration(session.overtimeMins)}</p>
                  </div>
                </div>
                {(session.lateMins > 0 || session.earlyMins > 0) && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/40 flex items-center gap-2">
                    {session.lateMins > 0 && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Late {session.lateMins}m</span>}
                    {session.earlyMins > 0 && <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">Early exit {session.earlyMins}m</span>}
                  </div>
                )}
              </div>

              {/* 4. ACTIVITY TIMELINE */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5"><Activity className="w-3 h-3 text-slate-600" />Activity Timeline</h3>
                  <span className="text-[10px] text-slate-700 font-mono">Realtime · Click event for raw details</span>
                </div>
                {loading ? (
                  <div className="py-8 flex items-center justify-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" /><span className="text-xs text-slate-600">Loading...</span></div>
                ) : businessEvents.length === 0 ? (
                  <div className="py-10 rounded-xl border border-dashed border-slate-800/60 flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800/40 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-slate-700" /></div>
                    <div className="text-center"><p className="text-sm font-medium text-slate-500">No biometric events today</p><p className="text-xs text-slate-700 mt-0.5">Waiting for first fingerprint scan...</p></div>
                  </div>
                ) : (
                  <div className="relative pl-7">
                    <div className="absolute left-[13px] top-4 bottom-4 w-px bg-slate-800/80" />
                    <div className="space-y-0.5">
                      {businessEvents.map((evt, idx) => {
                        const meta = getEventMeta(evt.eventType); const Icon = meta.icon; const isLast = idx === businessEvents.length - 1;
                        return (
                          <div
                            key={evt.id}
                            onClick={() => {
                              if (evt.rawRecord) {
                                setSelectedPunch(evt.rawRecord);
                              } else {
                                // Construct fallback RawPunchRecord for details drawer
                                setSelectedPunch({
                                  id: evt.id,
                                  device_ip: '192.168.1.56',
                                  device_user_id: evt.employeeId.replace(/\D/g, '') || '10',
                                  machine_timestamp: evt.machineTimestamp || evt.eventTime,
                                  event_time_utc: evt.eventTime,
                                  event_type: evt.eventType.includes('IN') ? 'IN' : 'OUT',
                                  verification_type: 'FINGERPRINT',
                                  mapping_status: 'MAPPED',
                                  source: 'BIOMETRIC_MACHINE',
                                });
                              }
                            }}
                            className={clsx('relative flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-slate-900/60 group', isLast ? 'bg-slate-900/50' : '')}
                          >
                            <div className={clsx('absolute -left-[18px] w-2.5 h-2.5 rounded-full border-[1.5px] border-[#0c0e14] z-10', meta.dot, isLast && `ring-2 ring-offset-1 ring-offset-[#0c0e14] ${meta.ring}`)} />
                            <div className={clsx('w-6 h-6 rounded-md flex items-center justify-center shrink-0 border', meta.bg, meta.border)}><Icon className={clsx('w-3 h-3', meta.color)} /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white leading-tight">{meta.label}</p>
                                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  MACHINE
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5 text-slate-700 shrink-0" /><span className="text-[10px] text-slate-600 truncate">{evt.location||'HQ Main Entrance'}</span></div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={clsx('text-xs font-mono font-semibold', meta.color)}>{evt.formattedTime}</span>
                              {evt.elapsedMinutes !== undefined && evt.elapsedMinutes > 0 && <p className="text-[10px] text-slate-700 mt-0.5 tabular-nums">+{evt.elapsedMinutes}m</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. DEVELOPER EVENTS - Raw Biometric Machine Punches */}
              <div className="border border-slate-800/40 rounded-xl overflow-hidden">
                <button onClick={() => setDevOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-900/30 transition-colors">
                  <div className="flex items-center gap-2"><Zap className="w-3 h-3 text-slate-700" /><span className="text-[11px] font-medium text-slate-600 uppercase tracking-wide">Raw Machine Punches (biometric_raw_punches)</span><span className="text-[10px] text-slate-700 bg-slate-800/50 px-1.5 py-0.5 rounded font-mono">{rawEvents.length} TCP</span></div>
                  {devOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-700" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-700" />}
                </button>
                {devOpen && (
                  <div className="border-t border-slate-800/40 bg-slate-950/60 max-h-56 overflow-y-auto">
                    {rawEvents.length === 0 ? (<p className="text-[11px] text-slate-700 p-4 text-center">No raw machine punches found in biometric_raw_punches.</p>) : (
                      <div className="divide-y divide-slate-800/30">
                        {rawEvents.map(evt => (
                          <div
                            key={evt.id}
                            onClick={() => {
                              if (evt.rawRecord) {
                                setSelectedPunch(evt.rawRecord);
                              }
                            }}
                            className="px-4 py-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/50 transition-colors"
                          >
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 truncate block">
                                {evt.machineTimestamp ? `Machine TS: ${evt.machineTimestamp}` : evt.id}
                              </span>
                              <span className="text-[10px] text-slate-600">{evt.eventType} · {evt.device}</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 shrink-0">{evt.formattedTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="px-5 py-3 border-t border-slate-800/50 bg-[#0c0e14] flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-700">{businessEvents.length} event{businessEvents.length !== 1 ? 's' : ''} · {rawEvents.length} raw punches</span>
            <div className="flex items-center gap-2">
              <button onClick={() => exportAttendanceToExcel([])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors border border-slate-700/40"><FileText className="w-3 h-3" /><span className="hidden sm:inline">Export PDF</span></button>
              <button onClick={() => exportAttendanceToExcel([])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs transition-colors border border-slate-700/40"><FileJson className="w-3 h-3" /><span className="hidden sm:inline">Export JSON</span></button>
              <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors border border-slate-700/50">Close</button>
            </div>
          </div>

        </div>
      </div>

      {/* RAW PUNCH DETAILS DRAWER */}
      {selectedPunch && (
        <RawPunchDetailsDrawer
          punch={selectedPunch}
          employeeName={empInfo.name}
          employeeCode={empInfo.code}
          onClose={() => setSelectedPunch(null)}
        />
      )}
    </>
  );
}
