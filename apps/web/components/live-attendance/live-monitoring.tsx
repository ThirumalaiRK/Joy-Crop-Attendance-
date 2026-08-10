'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeTimelineModal } from '../attendance/employee-timeline-modal';
import {
  Radio,
  ScanFace,
  Fingerprint,
  CreditCard,
  QrCode,
  MapPin,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  ShieldCheck,
  Zap,
  Coffee,
  Utensils,
  Briefcase,
  Navigation,
  LogOut,
  LogIn,
  FileSpreadsheet,
  FileText,
  Clock,
  User,
  AlertTriangle,
  ChevronRight,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord, AttendanceMethod } from '../../types';
import { insertAttendanceRecord, supabase } from '../../lib/supabase';
import {
  AttendanceEvent,
  AttendanceSummary,
  AttendanceEventType,
  AttendanceStatus,
} from '../../lib/attendance/attendance-types';
import {
  logAttendanceEvent,
  fetchAllAttendanceEvents,
  fetchAllAttendanceSummaries,
  fetchEmployeeTimeline,
  subscribeAttendanceEvents,
  formatDurationMinutes,
  syncSupabaseEvents,
} from '../../lib/attendance/time-engine';
import { exportAttendanceToExcel, exportAttendanceToPDF } from '../../lib/attendance/export-engine';
import { useDeviceSocket } from '../../hooks/useDeviceSocket';

interface LiveMonitoringProps {
  records: AttendanceRecord[];
  setRecords?: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  onAddLogClick?: () => void;
}

export function LiveMonitoring({ records, setRecords, activeFilter = 'all', onFilterChange, onAddLogClick }: LiveMonitoringProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);

  // Time Engine States
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [selectedEmployeeForTimeline, setSelectedEmployeeForTimeline] = useState<string | null>(null);
  const [employeeTimelineEvents, setEmployeeTimelineEvents] = useState<AttendanceEvent[]>([]);

  // Event Trigger Modal State
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerForm, setTriggerForm] = useState({
    employeeId: 'EMP-000003',
    employeeName: 'THIRUMALAI R K',
    department: 'Executive Leadership',
    eventType: 'CHECK_IN' as AttendanceEventType,
    notes: 'Logged via Workforce Action Bar',
  });

  const loadTimeEngineData = async () => {
    await syncSupabaseEvents();
    const evts = fetchAllAttendanceEvents();
    const sums = fetchAllAttendanceSummaries();
    setEvents(evts);
    setSummaries(sums);

    if (selectedEmployeeForTimeline) {
      setEmployeeTimelineEvents(fetchEmployeeTimeline(selectedEmployeeForTimeline));
    }
  };

  const { lastAttendance } = useDeviceSocket();

  useEffect(() => {
    loadTimeEngineData();
    const unsub = subscribeAttendanceEvents(() => loadTimeEngineData());
    return () => unsub();
  }, [selectedEmployeeForTimeline]);

  useEffect(() => {
    const processLiveAttendance = async () => {
      if (!lastAttendance) return;
      console.log('Received live attendance:', lastAttendance);
      
      const userIdStr = String(lastAttendance.userId);
      
      // 1. Fetch real employee name from DB
      const { data: emp } = await supabase
        .from('employees')
        .select('name, department')
        .or(`id.eq.${userIdStr},employee_code.eq.${userIdStr}`)
        .single();
        
      const empName = emp?.name || `Employee ${userIdStr}`;
      const empDept = emp?.department || 'HQ';

      // 2. Determine Check-In vs Check-Out based on today's latest punch
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: todayEvents } = await supabase
        .from('attendance_events')
        .select('event_type')
        .eq('employee_id', userIdStr)
        .gte('timestamp', `${todayStr}T00:00:00Z`)
        .order('timestamp', { ascending: false })
        .limit(1);

      let evtType: AttendanceEventType = 'CHECK_IN';
      if (todayEvents && todayEvents.length > 0) {
        const lastEvt = todayEvents[0].event_type;
        if (lastEvt === 'CHECK_IN') evtType = 'CHECK_OUT';
        else if (lastEvt === 'CHECK_OUT') evtType = 'CHECK_IN';
      }

      const methodMap: Record<number, AttendanceMethod> = {
        1: 'fingerprint',
        4: 'manual',
        15: 'face',
      };
      
      logAttendanceEvent({
        employeeId: userIdStr, 
        employeeName: empName,
        department: empDept,
        eventType: evtType,
        device: 'Biometric Terminal',
        method: methodMap[lastAttendance.verifyMode] || 'fingerprint',
        notes: 'Auto-logged via Device Socket'
      });
    };

    processLiveAttendance();
  }, [lastAttendance]);

  // Simulation runner (optional)
  useEffect(() => {
    if (!isAutoSimulating) return;

    const names = [
      { id: 'EMP-000003', name: 'THIRUMALAI R K', dept: 'Executive' },
      { id: 'EMP-000002', name: 'Dharun DB', dept: 'Product' },
      { id: 'EMP-000005', name: 'Praveen', dept: 'Engineering' },
    ];

    const interval = setInterval(() => {
      const rand = names[Math.floor(Math.random() * names.length)];
      logAttendanceEvent({
        employeeId: rand.id,
        employeeName: rand.name,
        department: rand.dept,
        eventType: 'BREAK_START',
        device: 'Web Command Bar',
        notes: 'Simulated Tea Break Event',
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [isAutoSimulating]);

  // Handle Event Triggers
  const handleQuickEventLog = async (eventType: AttendanceEventType) => {
    const res = await logAttendanceEvent({
      employeeId: triggerForm.employeeId,
      employeeName: triggerForm.employeeName,
      department: triggerForm.department,
      eventType,
      device: 'Enterprise Command Terminal',
      method: 'Manual',
      notes: `Event triggered: ${eventType}`,
    });

    if (res.success) {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      loadTimeEngineData();
    }
  };

  // Open Timeline Modal
  const handleOpenTimeline = (empId: string) => {
    setSelectedEmployeeForTimeline(empId);
    setEmployeeTimelineEvents(fetchEmployeeTimeline(empId));
  };

  // Status Metrics — exclude checked-out employees from working count
  const totalWorking = summaries.filter(
    (s) => (s.status === 'PRESENT' || s.status === 'LATE' || s.status === 'OVERTIME') &&
    (!s.checkOutTime || s.checkOutTime === '—')
  ).length;
  const totalOnLunch = summaries.filter((s) => s.status === 'ON_LUNCH').length;
  const totalOnBreak = summaries.filter((s) => s.status === 'ON_BREAK').length;
  const totalInMeeting = summaries.filter((s) => s.status === 'IN_MEETING').length;
  const totalOnField = summaries.filter((s) => s.status === 'ON_FIELD_VISIT').length;
  const totalCheckedOut = summaries.filter((s) => s.checkOutTime && s.checkOutTime !== '—').length;

  const filteredSummaries = summaries.filter((s) => {
    const matchesSearch =
      s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in select-none">
      {/* Top Banner & Enterprise Command Bar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-xl shadow-emerald-500/20 ring-1 ring-white/20">
            <Radio className="w-7 h-7 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Enterprise Time & Attendance Command Center</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-mono">
                REALTIME EVENT ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Net Working Hours, Break/Lunch Deductions, Overtime & Multi-Format Excel/PDF Reports
            </p>
          </div>
        </div>

        {/* Export & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => exportAttendanceToExcel(summaries)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition active:scale-[0.98]"
            title="Download Professional Multi-Sheet CSV Report"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => exportAttendanceToPDF(summaries)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition active:scale-[0.98]"
            title="Generate Print-Ready PDF Report with Letterhead & QR"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => setIsAutoSimulating(!isAutoSimulating)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              isAutoSimulating
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoSimulating ? 'text-emerald-400 fill-emerald-400 animate-pulse' : ''}`} />
            <span>{isAutoSimulating ? 'Simulation ON' : 'Hardware Stream'}</span>
          </button>
        </div>
      </div>

      {/* Realtime Status Command Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-lg flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Working Now</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">{totalWorking}</span>
            <span className="text-[10px] font-mono text-emerald-400/80">Active</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Lunch</span>
            <Utensils className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-400">{totalOnLunch}</span>
            <span className="text-[10px] font-mono text-amber-400/80">Dining</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-500/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On Break</span>
            <Coffee className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-400">{totalOnBreak}</span>
            <span className="text-[10px] font-mono text-blue-400/80">Tea/Coffee</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Meeting</span>
            <Briefcase className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-400">{totalInMeeting}</span>
            <span className="text-[10px] font-mono text-purple-400/80">Conference</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Field Visit</span>
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-cyan-400">{totalOnField}</span>
            <span className="text-[10px] font-mono text-cyan-400/80">Client Audit</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Checked Out</span>
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-300">{totalCheckedOut}</span>
            <span className="text-[10px] font-mono text-slate-500">Day Done</span>
          </div>
        </div>
      </div>

      {/* Break & Event Action Bar (Quick Event Logging) */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Quick Event Trigger (Thirumalai RK):</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleQuickEventLog('CHECK_IN')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] transition flex items-center gap-1"
          >
            <LogIn className="w-3.5 h-3.5" /> Check In
          </button>

          <button
            onClick={() => handleQuickEventLog('BREAK_START')}
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold text-[11px] transition flex items-center gap-1"
          >
            <Coffee className="w-3.5 h-3.5" /> Tea Break Start
          </button>

          <button
            onClick={() => handleQuickEventLog('BREAK_END')}
            className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold text-[11px] transition"
          >
            Resume Work
          </button>

          <button
            onClick={() => handleQuickEventLog('LUNCH_START')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[11px] transition flex items-center gap-1"
          >
            <Utensils className="w-3.5 h-3.5" /> Lunch Start
          </button>

          <button
            onClick={() => handleQuickEventLog('LUNCH_END')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[11px] transition"
          >
            Lunch End
          </button>

          <button
            onClick={() => handleQuickEventLog('FIELD_VISIT_START')}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-[11px] transition flex items-center gap-1"
          >
            <Navigation className="w-3.5 h-3.5" /> Field Visit
          </button>

          <button
            onClick={() => handleQuickEventLog('CHECK_OUT')}
            className="px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-[11px] transition flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Check Out
          </button>
        </div>
      </div>

      {/* Main Attendance Summaries & Net Calculation Table */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Daily Attendance Engine & Net Working Summaries</h3>
            <span className="text-xs text-slate-500 font-mono">Formula: Total - Breaks - Lunch</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee, dept..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 outline-none focus:border-amber-500 placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <th className="pb-3">Employee</th>
                <th className="pb-3">Check In</th>
                <th className="pb-3">Check Out</th>
                <th className="pb-3">Tea Break</th>
                <th className="pb-3">Lunch</th>
                <th className="pb-3">Meeting / Field</th>
                <th className="pb-3">Net Working Time</th>
                <th className="pb-3">Overtime</th>
                <th className="pb-3">Late Arrival</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    No attendance calculation summaries available yet.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((sum) => (
                  <tr key={sum.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-100">{sum.employeeName}</span>
                        <span className="text-slate-400 text-[10px]">{sum.department} • {sum.employeeCode}</span>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className="text-emerald-400 font-mono font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                        {sum.checkInTime || '—'}
                      </span>
                    </td>

                    <td className="py-3.5">
                      {sum.checkOutTime && sum.checkOutTime !== '—' ? (
                        <span className="text-purple-400 font-mono font-bold bg-purple-500/5 px-2.5 py-1 rounded-lg border border-purple-500/10">
                          {sum.checkOutTime}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">—</span>
                      )}
                    </td>

                    <td className="py-3.5 font-mono text-blue-300">
                      {sum.breakDurationMinutes > 0 ? `${sum.breakDurationMinutes}m` : '—'}
                    </td>

                    <td className="py-3.5 font-mono text-amber-300">
                      {sum.lunchDurationMinutes > 0 ? `${sum.lunchDurationMinutes}m` : '—'}
                    </td>

                    <td className="py-3.5 font-mono text-cyan-300">
                      {sum.fieldDurationMinutes > 0 || sum.meetingDurationMinutes > 0
                        ? `${sum.meetingDurationMinutes + sum.fieldDurationMinutes}m`
                        : '—'}
                    </td>

                    <td className="py-3.5">
                      <span className="text-white font-mono font-black text-sm bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        {formatDurationMinutes(sum.workingTimeMinutes)}
                      </span>
                    </td>

                    <td className="py-3.5 font-mono">
                      {sum.overtimeMinutes > 0 ? (
                        <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          +{formatDurationMinutes(sum.overtimeMinutes)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 font-mono">
                      {sum.lateMinutes > 0 ? (
                        <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {formatDurationMinutes(sum.lateMinutes)} Late
                        </span>
                      ) : (
                        <span className="text-emerald-400/80 font-bold">On Time</span>
                      )}
                    </td>

                    <td className="py-3.5">
                      <span
                        className={`px-2.5 py-1 text-[9px] font-bold rounded-full uppercase border ${
                          sum.status === 'OVERTIME'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : sum.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : sum.status === 'ON_LUNCH'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                            : sum.status === 'ON_BREAK'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {sum.status}
                      </span>
                    </td>

                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleOpenTimeline(sum.employeeId)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Timeline ({sum.eventsCount})</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: INTERACTIVE EMPLOYEE DAY TIMELINE ───────────────────────── */}
      {selectedEmployeeForTimeline && (
        <EmployeeTimelineModal
          employeeId={selectedEmployeeForTimeline}
          onClose={() => setSelectedEmployeeForTimeline(null)}
        />
      )}
    </div>
  );
}
