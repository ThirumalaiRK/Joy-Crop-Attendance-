'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileText,
  HelpCircle,
  X,
  Download,
  Fingerprint,
  Building2,
  Sparkles,
  ShieldCheck,
  Coffee,
  Check,
} from 'lucide-react';
import {
  ComputedCalendarDay,
  MonthlyAttendanceStats,
  CalendarDayStatus,
  fetchMonthlyCalendarData,
  subscribeToCalendarRealtime,
} from '../../lib/attendance/calendar-engine';
import { submitAttendanceCorrection } from '../../lib/attendance/time-engine';
import { clsx } from 'clsx';

interface ESSCalendarProps {
  employeeId?: string;
  employeeName?: string;
}

export function ESSCalendar({
  employeeId = 'EMP-000003',
  employeeName = 'THIRUMALAI R K',
}: ESSCalendarProps) {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // August
  const [calendarDays, setCalendarDays] = useState<ComputedCalendarDay[]>([]);
  const [stats, setStats] = useState<MonthlyAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected Day Drawer State
  const [selectedDay, setSelectedDay] = useState<ComputedCalendarDay | null>(null);

  // Correction Request Form State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('Missed Check-In');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionSubmitted, setCorrectionSubmitted] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const loadData = async () => {
    setLoading(true);
    const res = await fetchMonthlyCalendarData(employeeId, currentYear, currentMonth);
    setCalendarDays(res.days);
    setStats(res.stats);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToCalendarRealtime(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [employeeId, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDownloadDayPdf = (day: ComputedCalendarDay) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${day.dateStr} - ${employeeName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 20px; color: #0f172a; margin-bottom: 4px; }
            .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .label { font-weight: bold; color: #475569; }
            .val { font-weight: bold; color: #0f172a; }
            .status { font-weight: bold; color: #10b981; }
          </style>
        </head>
        <body>
          <h1>JOY CORPORATE SOLUTIONS PVT. LTD.</h1>
          <div class="subtitle">Daily Attendance Breakdown Report • JRM HRMS Enterprise</div>
          <div class="card">
            <div class="row"><span class="label">Employee Name:</span> <span class="val">${employeeName}</span></div>
            <div class="row"><span class="label">Employee ID:</span> <span class="val">${employeeId}</span></div>
            <div class="row"><span class="label">Date:</span> <span class="val">${day.dateStr}</span></div>
            <div class="row"><span class="label">Status:</span> <span class="status">${day.statusLabel}</span></div>
            <div class="row"><span class="label">Check In:</span> <span class="val">${day.checkIn || 'N/A'}</span></div>
            <div class="row"><span class="label">Check Out:</span> <span class="val">${day.checkOut || 'N/A'}</span></div>
            <div class="row"><span class="label">Net Work Hours:</span> <span class="val">8h 20m</span></div>
            <div class="row"><span class="label">Total Break Duration:</span> <span class="val">57 mins</span></div>
            <div class="row"><span class="label">Biometric Device:</span> <span class="val">${day.deviceUsed}</span></div>
            <div class="row"><span class="label">Location:</span> <span class="val">${day.location}</span></div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    await submitAttendanceCorrection({
      employeeId: employeeId,
      employeeName: employeeName,
      department: 'Software Development',
      requestType: correctionReason,
      requestedTime: selectedDay.dateStr,
      reason: correctionNotes || correctionReason,
    });

    setCorrectionSubmitted(true);
    setTimeout(() => {
      setCorrectionSubmitted(false);
      setShowCorrectionModal(false);
      setSelectedDay({ ...selectedDay, correctionPending: true });
    }, 1500);
  };

  const getStatusStyle = (status: CalendarDayStatus) => {
    switch (status) {
      case 'CORRECTION_APPROVED':
      case 'PRESENT':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:border-emerald-400';
      case 'LATE':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:border-amber-400';
      case 'ABSENT':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:border-rose-400';
      case 'APPROVED_LEAVE':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:border-blue-400';
      case 'HOLIDAY':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:border-purple-400';
      case 'HALF_DAY':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:border-cyan-400';
      case 'WEEKEND':
        return 'bg-slate-800/40 text-slate-500 border-slate-800/80';
      case 'NOT_RECORDED':
        return 'bg-slate-950/40 text-slate-500 border-slate-900/60 hover:border-slate-800';
    }
  };

  // First day of month offset
  const firstDayOffset = new Date(currentYear, currentMonth - 1, 1).getDay();

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      
      {/* Month Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400 animate-pulse" /> Realtime Attendance Calendar
            </span>
            <h2 className="text-xl font-black text-white">
              {monthNames[currentMonth - 1]} {currentYear}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handlePrevMonth}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Month</span>
          </button>

          <button
            onClick={() => {
              setCurrentYear(new Date().getFullYear());
              setCurrentMonth(new Date().getMonth() + 1);
            }}
            className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition"
          >
            Today
          </button>

          <button
            onClick={handleNextMonth}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
          >
            <span className="hidden sm:inline">Next Month</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Realtime Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">Present Days</span>
            <span className="text-xl font-black text-emerald-300 font-mono">{stats.presentDays}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">Late Days</span>
            <span className="text-xl font-black text-amber-300 font-mono">{stats.lateDays}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase block">Absent Days</span>
            <span className="text-xl font-black text-rose-300 font-mono">{stats.absentDays}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase block">Leave Days</span>
            <span className="text-xl font-black text-blue-300 font-mono">{stats.leaveDays}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase block">Holidays</span>
            <span className="text-xl font-black text-purple-300 font-mono">{stats.holidays}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Attendance %</span>
            <span className="text-xl font-black text-white font-mono">{stats.attendancePercentage}%</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Attendance Score</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{stats.currentScore}%</span>
          </div>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-extrabold text-slate-400 border-b border-slate-800 pb-3">
          <span className="text-rose-400">SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span className="text-rose-400">SAT</span>
        </div>

        {/* Calendar Cells */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          
          {/* Empty offset cells */}
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="h-24 sm:h-28 rounded-2xl bg-slate-950/40 border border-slate-900/60" />
          ))}

          {/* Actual Month Days */}
          {calendarDays.map((day) => (
            <div
              key={day.dateStr}
              onClick={() => setSelectedDay(day)}
              className={clsx(
                'h-24 sm:h-28 p-2.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between relative group shadow-md',
                getStatusStyle(day.status),
                day.isToday ? 'ring-2 ring-amber-400 shadow-amber-500/20' : '',
                day.correctionPending ? 'ring-2 ring-orange-500/80 animate-pulse' : ''
              )}
            >
              {/* Cell Header: Date Number & LIVE / Badge */}
              <div className="flex items-center justify-between">
                <span className={clsx(
                  'text-xs font-black font-mono px-2 py-0.5 rounded-lg',
                  day.isToday ? 'bg-amber-400 text-slate-950 font-extrabold' : 'text-white bg-slate-950/60'
                )}>
                  {day.dayNumber}
                </span>

                {day.isToday && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> LIVE
                  </span>
                )}
              </div>

              {/* Cell Content: Status Label & Times */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold line-clamp-1 block leading-tight font-sans">
                  {day.statusLabel}
                </span>

                {day.checkIn && (
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-300">
                    <Clock className="w-2.5 h-2.5 shrink-0 text-emerald-400" />
                    <span>{day.checkIn}</span>
                  </div>
                )}
              </div>

              {/* Hover Popover Tooltip */}
              <div className="absolute inset-x-0 -top-24 hidden group-hover:flex flex-col p-2.5 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-30 text-[10px] font-mono space-y-1 pointer-events-none">
                <span className="font-bold text-white block border-b border-slate-800 pb-1">{day.dateStr}</span>
                <div className="flex justify-between text-slate-300"><span>In:</span> <strong className="text-emerald-400">{day.checkIn || '--:--'}</strong></div>
                <div className="flex justify-between text-slate-300"><span>Out:</span> <strong className="text-emerald-400">{day.checkOut || '--:--'}</strong></div>
                <div className="flex justify-between text-slate-300"><span>Net:</span> <strong className="text-amber-400">{day.checkIn ? `${Math.floor(day.netWorkMins / 60)}h ${day.netWorkMins % 60}m` : '0h 00m'}</strong></div>
              </div>

            </div>
          ))}

        </div>

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          SLIDE-OVER DRAWER: DETAILED ATTENDANCE BREAKDOWN FOR CLICKED DATE
      ════════════════════════════════════════════════════════════════════════ */}
      {selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                    ATTENDANCE BREAKDOWN
                  </span>
                  <h3 className="text-lg font-black text-white">{selectedDay.dateStr}</h3>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Day Status</span>
                <span className={clsx('px-3 py-1 rounded-full border text-xs font-mono font-bold', getStatusStyle(selectedDay.status))}>
                  {selectedDay.statusLabel}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block font-mono">Check In</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{selectedDay.checkIn || 'Not Marked'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block font-mono">Check Out</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{selectedDay.checkOut || (selectedDay.isToday && selectedDay.checkIn ? 'Session Active' : 'Not Marked')}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block font-mono">Net Work Hours</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">
                    {selectedDay.checkIn
                      ? `${Math.floor(selectedDay.netWorkMins / 60)}h ${selectedDay.netWorkMins % 60}m${!selectedDay.checkOut ? ' (Active)' : ''}`
                      : '0h 00m'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block font-mono">Total Breaks</span>
                  <span className="text-blue-400 font-mono font-bold text-sm">
                    {selectedDay.checkIn ? `${selectedDay.breakMins} mins` : '0 mins'}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown List */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs font-mono">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">Session Details</span>

                <div className="flex justify-between text-slate-300">
                  <span>Shift Policy:</span>
                  <strong className="text-white">General (09:00 AM - 06:00 PM)</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tea Break Duration:</span>
                  <strong className="text-purple-300">{selectedDay.teaBreakMins} mins</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Lunch Break Duration:</span>
                  <strong className="text-purple-300">{selectedDay.lunchBreakMins} mins</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Overtime Minutes:</span>
                  <strong className="text-emerald-400">{selectedDay.overtimeMins} mins</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Biometric Device:</span>
                  <strong className="text-slate-200">{selectedDay.checkIn ? selectedDay.deviceUsed : 'No Biometric Event'}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Location:</span>
                  <strong className="text-slate-200">{selectedDay.checkIn ? selectedDay.location : '--'}</strong>
                </div>
                <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-2">
                  <span>Attendance Score:</span>
                  <strong className="text-emerald-400">
                    {['WEEKEND', 'HOLIDAY', 'NOT_RECORDED'].includes(selectedDay.status) ? 'N/A' : `${selectedDay.attendanceScore}%`}
                  </strong>
                </div>
              </div>
            </div>

            {/* Drawer Actions */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowCorrectionModal(true)}
                className="w-full py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Raise Attendance Correction Request</span>
              </button>

              <button
                onClick={() => handleDownloadDayPdf(selectedDay)}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>Download PDF Day Report</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: RAISE ATTENDANCE CORRECTION REQUEST
      ════════════════════════════════════════════════════════════════════════ */}
      {showCorrectionModal && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setShowCorrectionModal(false)}
              className="absolute right-4 top-4 p-2 rounded-2xl bg-slate-900 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  HR CORRECTION WORKFLOW
                </span>
                <h3 className="text-lg font-black text-white">Attendance Correction</h3>
              </div>
            </div>

            {correctionSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold">Correction Request Submitted!</h4>
                <p className="text-xs text-slate-300">Sent to HR Specialist and Reporting Manager for approval.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1 block">Selected Date</label>
                  <input
                    type="text"
                    disabled
                    value={selectedDay.dateStr}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 font-mono font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Reason for Correction *</label>
                  <select
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Missed Check-In">Missed Check-In (Scanner Offline)</option>
                    <option value="Missed Check-Out">Missed Check-Out</option>
                    <option value="Fingerprint Verification Error">Fingerprint Verification Error</option>
                    <option value="Field Visit / On-Duty">Field Visit / Official Duty</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Explanation / Remarks *</label>
                  <textarea
                    required
                    rows={3}
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    placeholder="Provide details for HR review..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Submit Request to HR</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
