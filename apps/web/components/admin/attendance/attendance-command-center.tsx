'use client';

import React, { useEffect, useState } from 'react';
import {
  Radio, Filter, UserCheck, UserX, Clock, Eye,
  Coffee, Utensils, Briefcase, Navigation,
  LogOut, LogIn, FileSpreadsheet, FileText,
  AlertTriangle, X, Search, Plus,
  CalendarClock, CheckCircle2, RefreshCw, Database, RotateCcw,
  Calculator,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { clsx } from 'clsx';
import {
  AttendanceEvent,
  AttendanceSummary,
  AttendanceEventType,
} from '../../../lib/attendance/attendance-types';
import {
  logAttendanceEvent,
  fetchAllAttendanceSummaries,
  fetchEmployeeTimeline,
  subscribeAttendanceEvents,
  formatDurationMinutes,
  syncSupabaseEvents,
} from '../../../lib/attendance/time-engine';
import { EmployeeTimelineModal } from '../../attendance/employee-timeline-modal';
import { AttendanceExportModal } from './attendance-export-modal';
import { useDynamicTimeGreeting } from '../../../lib/time-greeting';
import { eventBus } from '../../../lib/events/event-bus';

function parseDateTimeString(dtStr?: string): { date: string; time: string } {
  if (!dtStr || dtStr === '—' || dtStr === '-') return { date: '—', time: '' };
  const parts = dtStr.split('•').map((s) => s.trim());
  if (parts.length === 2) {
    return { date: parts[0], time: parts[1] };
  }
  return { date: '', time: dtStr };
}

export function AttendanceCommandCenter() {
  const { salutation, icon, tagline } = useDynamicTimeGreeting('Joy Corporate Admin');
  // Use IST date - on Vercel (UTC server) toISOString().split('T')[0] returns the UTC date
  const TODAY_STR = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [selectedDate, setSelectedDate] = useState<string>(TODAY_STR);
  const [dateScope, setDateScope] = useState<'today' | 'custom_date' | 'month' | 'all'>('today');

  // Legacy Supabase records stream
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'late' | 'overtime'>('all');
  const [stats, setStats] = useState({ present: 0, late: 0, overtime: 0, inside: 0 });

  // New Time Engine data
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<AttendanceEvent[]>([]);
  const [selectedBreakdown, setSelectedBreakdown] = useState<AttendanceSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'live' | 'engine'>('engine');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | null>(null);

  // Load real attendance_records from Supabase
  const loadLegacyRecords = async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      // Fetch official employee lookup table from Supabase
      const { data: empData } = await supabase
        .from('employees')
        .select('id, full_name, department, employee_code');

      const empLookup = new Map<string, { name: string; dept: string }>();
      (empData ?? []).forEach((e: any) => {
        const idKey = (e.id || '').toLowerCase().trim();
        const codeKey = (e.employee_code || '').toLowerCase().trim();
        if (idKey) empLookup.set(idKey, { name: e.full_name, dept: e.department || 'General' });
        if (codeKey) empLookup.set(codeKey, { name: e.full_name, dept: e.department || 'General' });
      });

      let query = supabase
        .from('attendance_records')
        .select('*')
        .not('employee_name', 'ilike', '%Employee R K%')
        .not('employee_id', 'eq', 'EMP-NaN')
        .order('created_at', { ascending: false });

      if (dateScope === 'today') {
        query = query.eq('date', TODAY_STR);
      } else if (dateScope === 'custom_date' && selectedDate) {
        query = query.eq('date', selectedDate);
      } else if (dateScope === 'month' && selectedDate) {
        const monthPrefix = selectedDate.slice(0, 7);
        const monthStart = `${monthPrefix}-01`;
        const nextMonthDate = new Date(selectedDate.slice(0, 7) + '-01');
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const monthEnd = nextMonthDate.toLocaleDateString('en-CA');
        query = query.gte('date', monthStart).lt('date', monthEnd);
      }

      const { data } = await query.limit(500);
      const rawRows = data ?? [];

      // Filter out corrupted records without check-in time or fake users
      const validRows = rawRows.filter(
        (r) =>
          r.employee_name !== 'Employee R K' &&
          r.employee_id !== 'EMP-NaN' &&
          r.check_in_time &&
          r.check_in_time !== '—' &&
          r.check_in_time !== '-'
      );

      // Deduplicate by employee ID, taking latest record
      const seenEmps = new Set<string>();
      const uniqueRows: any[] = [];
      validRows.forEach((r: any) => {
        const raw = (r.employee_id || '').toLowerCase().trim();
        const empMatch = empLookup.get(raw);
        const resolvedName = empMatch?.name || r.employee_name;
        const resolvedDept = empMatch?.dept || r.department || 'General';

        if (!seenEmps.has(raw || resolvedName)) {
          seenEmps.add(raw || resolvedName);
          uniqueRows.push({
            ...r,
            employee_name: resolvedName === 'Employee R K' ? 'Employee Record Unavailable' : resolvedName,
            department: resolvedDept,
          });
        }
      });

      setRecords(uniqueRows);

      // Calculate Summary Card Metrics cleanly from real records
      const presentCount = uniqueRows.length;
      const lateCount = uniqueRows.filter((r) => r.status === 'late').length;
      const overtimeCount = uniqueRows.filter((r) => r.status === 'overtime').length;
      const insideCount = uniqueRows.filter((r) => {
        const hasCheckOut = r.check_out_time && r.check_out_time !== '—' && r.check_out_time !== '-';
        return !hasCheckOut;
      }).length;

      setStats({
        present: presentCount,
        late: lateCount,
        overtime: overtimeCount,
        inside: insideCount,
      });
    } catch (err) {
      console.warn('loadLegacyRecords error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Time Engine Summaries
  const loadTimeEngineSummaries = async () => {
    await syncSupabaseEvents();
    let targetDateParam: string;
    if (dateScope === 'today') {
      targetDateParam = TODAY_STR;  // IST date e.g. '2026-08-10'
    } else if (dateScope === 'custom_date' && selectedDate) {
      targetDateParam = selectedDate;
    } else {
      targetDateParam = 'ALL';  // month and all-history both show everything
    }
    const sums = fetchAllAttendanceSummaries(targetDateParam);
    setSummaries(sums);
    if (selectedTimeline) {
      setTimelineEvents(fetchEmployeeTimeline(selectedTimeline));
    }
  };


  const handleResetEngine = async () => {
    if (!confirm('Rebuild all calculated attendance sessions from raw biometric events?')) return;
    const connectorUrl = process.env.NEXT_PUBLIC_CONNECTOR_URL || 'http://localhost:4000';
    try {
      setLoading(true);
      const res = await fetch(`${connectorUrl}/attendance/reset-engine`, { method: 'POST' });
      const json = await res.json();
      await syncSupabaseEvents(true);
      loadTimeEngineSummaries();
      alert(json.message || 'Attendance Engine Rebuilt Successfully');
    } catch (e: any) {
      await syncSupabaseEvents(true);
      loadTimeEngineSummaries();
      alert('Engine rebuilt from raw event stream.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAndClearLogs = async () => {
    if (!confirm('Download logs from device -> Verify in Supabase -> Backup -> Clear device logs?')) return;
    const connectorUrl = process.env.NEXT_PUBLIC_CONNECTOR_URL || 'http://localhost:4000';
    try {
      setLoading(true);
      const res = await fetch(`${connectorUrl}/attendance/sync-and-clear-device-logs`, { method: 'POST' });
      const json = await res.json();
      await syncSupabaseEvents(true);
      loadTimeEngineSummaries();
      alert(json.message || 'Log sync, verification, backup, and device clear complete.');
    } catch (e: any) {
      alert(e?.message || 'Connector request completed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegacyRecords(true);
    loadTimeEngineSummaries();

    // 10-second live ticker interval for real-time minute updates on net working hours
    const liveTicker = setInterval(() => {
      loadTimeEngineSummaries();
    }, 10000);

    const ch = supabase
      .channel('admin-attendance-cc-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        loadLegacyRecords();
      })
      .subscribe();

    const unsub = subscribeAttendanceEvents(() => loadTimeEngineSummaries());

    // Event Bus — instant zero-latency refresh on every biometric event
    const unsubBusIn   = eventBus.subscribe('ATTENDANCE_CHECK_IN',  () => { loadLegacyRecords(); loadTimeEngineSummaries(); });
    const unsubBusOut  = eventBus.subscribe('ATTENDANCE_CHECK_OUT', () => { loadLegacyRecords(); loadTimeEngineSummaries(); });
    const unsubBusBreak = eventBus.subscribe('BREAK_START',         () => loadTimeEngineSummaries());
    const unsubBusLunch = eventBus.subscribe('LUNCH_START',         () => loadTimeEngineSummaries());

    return () => {
      clearInterval(liveTicker);
      supabase.removeChannel(ch);
      unsub();
      unsubBusIn();
      unsubBusOut();
      unsubBusBreak();
      unsubBusLunch();
    };
  }, [selectedTimeline, dateScope, selectedDate]);

  const handleQuickEvent = async (eventType: AttendanceEventType, empId = 'EMP-000003', empName = 'THIRUMALAI R K') => {
    await logAttendanceEvent({
      employeeId: empId,
      employeeName: empName,
      department: 'Executive Leadership',
      eventType,
      device: 'Admin Command Terminal',
      method: 'Manual',
      notes: `Admin triggered ${eventType}`,
    });
    loadTimeEngineSummaries();
  };

  const filtered = filter === 'all' ? records : records.filter((r) => r.status === filter);
  const filteredSummaries = summaries.filter((s) =>
    s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Live Status Metrics from Time Engine
  // Note: PRESENT/LATE/OVERTIME employees who have a checkOutTime are checked OUT — exclude them from "Working Now"
  const engineStats = {
    working: summaries.filter(
      (s) => ['PRESENT', 'LATE', 'OVERTIME'].includes(s.status) && (!s.checkOutTime || s.checkOutTime === '—')
    ).length,
    onLunch: summaries.filter((s) => s.status === 'ON_LUNCH').length,
    onBreak: summaries.filter((s) => s.status === 'ON_BREAK').length,
    inMeeting: summaries.filter((s) => s.status === 'IN_MEETING').length,
    onField: summaries.filter((s) => s.status === 'ON_FIELD_VISIT').length,
    checkedOut: summaries.filter((s) => s.checkOutTime && s.checkOutTime !== '—').length,
    lateToday: summaries.filter((s) => s.lateMinutes > 0 && (!s.checkOutTime || s.checkOutTime === '—')).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <span>{icon}</span> {salutation}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Attendance Command Center</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {tagline} • Enterprise Realtime Time Engine
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleResetEngine}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs shadow-lg transition"
            title="Rebuild attendance_sessions from raw attendance_events"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Engine</span>
          </button>
          <button
            onClick={handleSyncAndClearLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold text-xs shadow-lg transition"
            title="Download -> Verify -> Backup -> Clear Device Logs"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Sync & Clear Logs</span>
          </button>
          <button
            onClick={() => setExportFormat('excel')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => setExportFormat('pdf')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-bold">Live Realtime</span>
          </div>
        </div>
      </div>

      {/* Live Status Widgets Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Working Now', value: engineStats.working, color: 'text-emerald-400', border: 'border-emerald-500/30' },
          { label: 'On Lunch', value: engineStats.onLunch, color: 'text-amber-400', border: 'border-amber-500/30' },
          { label: 'On Break', value: engineStats.onBreak, color: 'text-blue-400', border: 'border-blue-500/30' },
          { label: 'In Meeting', value: engineStats.inMeeting, color: 'text-purple-400', border: 'border-purple-500/30' },
          { label: 'Field Visit', value: engineStats.onField, color: 'text-cyan-400', border: 'border-cyan-500/30' },
          { label: 'Late Today', value: engineStats.lateToday, color: 'text-rose-400', border: 'border-rose-500/30' },
          { label: 'Checked Out', value: engineStats.checkedOut, color: 'text-slate-400', border: 'border-slate-700' },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl bg-slate-900/90 border shadow-lg flex flex-col justify-between ${stat.border}`}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
            <span className={`text-2xl font-black mt-2 ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Quick Event Trigger Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Quick Event Logger (THIRUMALAI RK):</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {([
            { type: 'CHECK_IN', label: 'Check In', icon: LogIn, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20' },
            { type: 'BREAK_START', label: 'Tea Break', icon: Coffee, color: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' },
            { type: 'BREAK_END', label: 'Resume Work', icon: CheckCircle2, color: 'text-blue-300 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15' },
            { type: 'LUNCH_START', label: 'Lunch Start', icon: Utensils, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20' },
            { type: 'LUNCH_END', label: 'Lunch End', icon: CheckCircle2, color: 'text-amber-300 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15' },
            { type: 'FIELD_VISIT_START', label: 'Field Visit', icon: Navigation, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20' },
            { type: 'CHECK_OUT', label: 'Check Out', icon: LogOut, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20' },
          ] as { type: AttendanceEventType; label: string; icon: any; color: string }[]).map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleQuickEvent(type)}
              className={`px-3 py-1.5 rounded-lg border font-bold text-[11px] transition flex items-center gap-1 ${color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date & Payroll Scope Bar */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">Date &amp; Payroll Scope:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setDateScope('today'); setSelectedDate(TODAY_STR); }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
              dateScope === 'today'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Today Only ({TODAY_STR})
          </button>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">Select Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setDateScope('custom_date'); }}
              className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setDateScope('month')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
              dateScope === 'month'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            Monthly Payroll ({selectedDate.slice(0, 7)})
          </button>

          <button
            onClick={() => setDateScope('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${
              dateScope === 'all'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            All Saved Dates (Full History)
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveView('engine')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition border ${
            activeView === 'engine'
              ? 'bg-slate-800 text-white border-slate-700 shadow'
              : 'text-slate-400 border-slate-900 hover:text-white'
          }`}
        >
          Time Engine Summaries (Net Working Hours)
        </button>
        <button
          onClick={() => setActiveView('live')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition border ${
            activeView === 'live'
              ? 'bg-slate-800 text-white border-slate-700 shadow'
              : 'text-slate-400 border-slate-900 hover:text-white'
          }`}
        >
          Live Biometric Stream ({records.length} Records)
        </button>
      </div>

      {/* ── VIEW A: Time Engine Summaries (Enterprise Data Table) ────────── */}
      {activeView === 'engine' && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl overflow-hidden">
          {/* Toolbar Header */}
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">Net Working Hours</h2>
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
                  Net Working = Total Work Duration − Break Duration
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Attendance Summary & Payroll Calculations</p>
            </div>

            <div className="relative w-64 max-w-[260px]">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500/50 focus:outline-none placeholder:text-slate-600 transition-colors"
              />
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 min-w-[180px] w-[20%]">EMPLOYEE</th>
                  <th className="px-4 py-3 min-w-[120px]">CHECK IN</th>
                  <th className="px-4 py-3 min-w-[120px]">CHECK OUT</th>
                  <th className="px-4 py-3 min-w-[85px] text-center">TEA BREAK</th>
                  <th className="px-4 py-3 min-w-[140px]">LUNCH</th>
                  <th className="px-4 py-3 min-w-[115px] text-center">NET HOURS</th>
                  <th className="px-4 py-3 min-w-[90px] text-center">OVERTIME</th>
                  <th className="px-4 py-3 min-w-[105px] text-center">LATE</th>
                  <th className="px-4 py-3 min-w-[110px] text-center">STATUS</th>
                  <th className="px-4 py-3 min-w-[90px] text-center">TIMELINE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500 font-medium">
                      No time engine summaries found — waiting for biometric punch events.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((s) => {
                    const checkIn = parseDateTimeString(s.checkInTime);
                    const checkOut = parseDateTimeString(s.checkOutTime);

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors group">
                        {/* Employee */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5 max-w-[180px]">
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                              {s.employeeName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-100 text-xs truncate block" title={s.employeeName}>
                                {s.employeeName}
                              </span>
                              <span className="text-[10px] text-slate-500 truncate block">
                                {s.department || 'General'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Check In */}
                        <td className="px-4 py-3.5 font-mono">
                          {checkIn.time ? (
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-tight">{checkIn.date}</span>
                              <span className="text-emerald-400 font-bold text-xs block mt-0.5">{checkIn.time}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-sans text-xs">—</span>
                          )}
                        </td>

                        {/* Check Out */}
                        <td className="px-4 py-3.5 font-mono">
                          {checkOut.time ? (
                            <div>
                              <span className="text-[10px] text-slate-400 block leading-tight">{checkOut.date}</span>
                              <span className="text-purple-400 font-bold text-xs block mt-0.5">{checkOut.time}</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-600 font-sans text-xs block">—</span>
                              <span className="text-[10px] text-slate-500 font-sans italic block">Working</span>
                            </div>
                          )}
                        </td>

                        {/* Tea Break */}
                        <td className="px-4 py-3.5 text-center font-mono">
                          {s.breakDurationMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold text-xs inline-block">
                              {s.breakDurationMinutes}m
                            </span>
                          ) : (
                            <span className="text-slate-600 font-sans text-xs">No break</span>
                          )}
                        </td>

                        {/* Lunch */}
                        <td className="px-4 py-3.5">
                          {s.lunchBreakMode === 'ACTUAL' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                                <Utensils className="w-2.5 h-2.5" />
                                <span>ACTUAL {s.lunchDurationMinutes}m</span>
                              </span>
                              <span className="text-[9px] text-slate-500 block mt-0.5 font-mono truncate max-w-[130px]">
                                {s.lunchDetails?.replace(/^Actual \d+m\s*\(/, '').replace(/\)$/, '') || 'Punched Break'}
                              </span>
                            </div>
                          ) : s.lunchBreakMode === 'AUTO' && s.lunchDurationMinutes > 0 ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                                <Clock className="w-2.5 h-2.5" />
                                <span>AUTO {s.lunchDurationMinutes}m</span>
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-0.5 font-mono whitespace-nowrap">
                                1:00 PM – 2:00 PM
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">No lunch</span>
                          )}
                        </td>

                        {/* Net Working Hours */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => setSelectedBreakdown(s)}
                            className="w-[95px] h-7 mx-auto flex items-center justify-center gap-1 bg-slate-950 hover:bg-slate-900 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl text-emerald-400 font-mono font-bold text-xs transition-all shadow-inner"
                            title="Click to view full attendance calculation breakdown"
                          >
                            <span>{formatDurationMinutes(s.workingTimeMinutes)}</span>
                            <Eye className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 opacity-60" />
                          </button>
                        </td>

                        {/* Overtime */}
                        <td className="px-4 py-3.5 text-center font-mono">
                          {s.overtimeMinutes > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-xs whitespace-nowrap inline-block">
                              +{formatDurationMinutes(s.overtimeMinutes)}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Late (Single-Line Badge) */}
                        <td className="px-4 py-3.5 text-center font-mono">
                          {s.lateMinutes > 0 ? (
                            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-xs whitespace-nowrap inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>{formatDurationMinutes(s.lateMinutes)} late</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>On Time</span>
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={clsx(
                              'px-2.5 py-1 text-[9px] font-bold rounded-full uppercase border tracking-wider whitespace-nowrap inline-block',
                              s.status === 'OVERTIME' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                              s.status === 'LATE' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                              s.status === 'ON_LUNCH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse' :
                              s.status === 'ON_BREAK' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse' :
                              'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            )}
                          >
                            ● {s.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Timeline */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => {
                              setSelectedTimeline(s.employeeId);
                              setTimelineEvents(fetchEmployeeTimeline(s.employeeId));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition flex items-center justify-center gap-1 mx-auto whitespace-nowrap"
                          >
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{s.eventsCount}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Summary Cards Layout */}
          <div className="block md:hidden p-4 space-y-3">
            {filteredSummaries.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No attendance records found.</p>
            ) : (
              filteredSummaries.map((s) => {
                const checkIn = parseDateTimeString(s.checkInTime);
                const checkOut = parseDateTimeString(s.checkOutTime);
                return (
                  <div key={s.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{s.employeeName}</h4>
                        <p className="text-[10px] text-slate-500">{s.department}</p>
                      </div>
                      <span className="px-2.5 py-1 text-[9px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {s.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block font-sans">Check In</span>
                        <span className="text-emerald-400 font-bold">{checkIn.time || '—'}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block font-sans">Check Out</span>
                        <span className="text-purple-400 font-bold">{checkOut.time || 'Working'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                      <span className="text-slate-400">Net Working:</span>
                      <span className="text-emerald-400 font-bold font-mono">{formatDurationMinutes(s.workingTimeMinutes)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── VIEW B: Live Biometric Records Stream ──────────────────────────── */}
      {activeView === 'live' && (
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-sm font-semibold text-slate-200">Biometric Check-In Stream (attendance_records)</span>
            <span className="ml-auto text-[10px] text-slate-500">{filtered.length} records</span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            {[
              { label: 'Present', value: stats.present, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: UserCheck },
              { label: 'Late', value: stats.late, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
              { label: 'Overtime', value: stats.overtime, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: Radio },
              { label: 'Live Inside', value: stats.inside, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Eye },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className={clsx('p-4 rounded-2xl border', s.bg)}>
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={clsx('w-4 h-4', s.color)} />
                  </div>
                  <div className={clsx('text-2xl font-black', s.color)}>{loading ? '—' : s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 px-4 pb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            {(['all', 'present', 'late', 'overtime'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-medium transition border capitalize',
                  filter === f
                    ? 'bg-violet-600/15 text-violet-300 border-violet-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                )}
              >
                {f} {f !== 'all' && `(${f === 'present' ? stats.present : f === 'late' ? stats.late : stats.overtime})`}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/40">
                  {['Employee', 'Department', 'Check In', 'Check Out', 'Status', 'Method', 'Device', 'Score'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-slate-800/60 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-slate-600">
                          No biometric records yet — waiting for fingerprint/face check-ins
                        </td>
                      </tr>
                    )
                  : filtered.map((r) => (
                      <tr key={r.id} className="border-b border-slate-800/20 hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-200">{r.employee_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.department || '—'}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{r.check_in_time || '—'}</td>
                        <td className="px-4 py-3 font-mono text-purple-400">
                          {(r.check_out_time && r.check_out_time !== '—' && r.check_out_time !== '-')
                            ? r.check_out_time
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {/* IMPORTANT: '—' (em dash) is truthy — only treat as checked-out if it's a real time string */}
                          {(() => {
                            const hasRealCheckOut = r.check_out_time && r.check_out_time !== '—' && r.check_out_time !== '-';
                            const isLate = r.status === 'late';
                            return (
                              <span className={clsx(
                                'px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase',
                                hasRealCheckOut
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                  : isLate
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              )}>
                                {hasRealCheckOut ? 'Checked Out' : r.status || 'present'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-400 capitalize">{r.method || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-[10px]">
                          {r.device_name ? r.device_name.split('(')[0].trim() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-emerald-400 font-bold">
                            {r.confidence_score ? `${r.confidence_score}%` : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CALCULATION BREAKDOWN MODAL ────────────────────────────────────── */}
      {selectedBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Attendance Calculation Breakdown</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedBreakdown.employeeName} • {selectedBreakdown.department}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreakdown(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              {/* Check-In & Check-Out Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">First Check-In</span>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-1">
                    {selectedBreakdown.checkInTime || '—'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {selectedBreakdown.lateMinutes > 0 ? `⚠️ ${selectedBreakdown.lateMinutes}m Late Arrival` : '✅ On Time'}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Check-Out</span>
                  <div className="text-sm font-black text-purple-400 font-mono mt-1">
                    {selectedBreakdown.checkOutTime && selectedBreakdown.checkOutTime !== '—'
                      ? selectedBreakdown.checkOutTime
                      : 'In Progress (Live)'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {selectedBreakdown.calculationBreakdown?.isCompleted ? 'Finalized Session' : 'Currently Active'}
                  </span>
                </div>
              </div>

              {/* Step-by-Step Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1.5">
                    <span>⏱️</span> Gross Worked Span:
                  </span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatDurationMinutes(selectedBreakdown.totalTimeMinutes)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <span>☕</span> Tea / Short Breaks:
                  </span>
                  <span className="font-mono font-bold">
                    - {selectedBreakdown.breakDurationMinutes > 0 ? `${selectedBreakdown.breakDurationMinutes}m` : '0m'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <span>🍱</span> Lunch Break:
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-bold">
                      - {selectedBreakdown.lunchDurationMinutes > 0 ? `${selectedBreakdown.lunchDurationMinutes}m` : '0m'}
                    </span>
                    <span className="text-[10px] text-amber-400/80 block">
                      {selectedBreakdown.lunchDetails || (selectedBreakdown.lunchBreakMode === 'AUTO' ? 'Auto 1:00 PM – 2:00 PM' : 'No overlap')}
                    </span>
                  </div>
                </div>

                {selectedBreakdown.meetingDurationMinutes + selectedBreakdown.fieldDurationMinutes > 0 && (
                  <div className="flex items-center justify-between text-xs text-cyan-300">
                    <span className="flex items-center gap-1.5">
                      <span>💼</span> Meeting / Field Visits:
                    </span>
                    <span className="font-mono font-bold">
                      - {selectedBreakdown.meetingDurationMinutes + selectedBreakdown.fieldDurationMinutes}m
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                      Net Working Hours
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Payable: {selectedBreakdown.payableHours} hrs
                    </span>
                  </div>
                  <span className="text-xl font-black font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                    {formatDurationMinutes(selectedBreakdown.workingTimeMinutes)}
                  </span>
                </div>
              </div>

              {/* Status and Shift Target Tags */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                <span className="text-slate-400">Shift Target: 8h 00m (480m)</span>
                {selectedBreakdown.overtimeMinutes > 0 ? (
                  <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    +{formatDurationMinutes(selectedBreakdown.overtimeMinutes)} Overtime
                  </span>
                ) : (
                  <span className="text-slate-500">Standard Shift</span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex justify-end bg-slate-950/60">
              <button
                onClick={() => setSelectedBreakdown(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TIMELINE MODAL ──────────────────────────────────────────────────── */}
      {selectedTimeline && (
        <EmployeeTimelineModal
          employeeId={selectedTimeline}
          employeeName={summaries.find((s) => s.employeeId === selectedTimeline)?.employeeName}
          department={summaries.find((s) => s.employeeId === selectedTimeline)?.department}
          onClose={() => setSelectedTimeline(null)}
        />
      )}

      {/* ── EXPORT CONFIGURATION MODAL ──────────────────────────────────────── */}
      <AttendanceExportModal
        isOpen={exportFormat !== null}
        defaultFormat={exportFormat || 'pdf'}
        onClose={() => setExportFormat(null)}
        filteredSummaries={filteredSummaries}
        allSummaries={summaries}
      />
    </div>
  );
}
