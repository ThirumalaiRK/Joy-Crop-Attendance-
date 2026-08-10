'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Coffee, Utensils, Briefcase, Navigation,
  LogOut, CheckCircle2, Clock, Search, ChevronDown,
  ChevronUp, RefreshCcw, Activity, BarChart3, Shield,
} from 'lucide-react';
import { AttendanceSummary, AttendanceStatus } from '../../lib/attendance/attendance-types';
import {
  fetchAllAttendanceSummaries,
  subscribeAttendanceEvents,
  formatDurationMinutes,
  syncSupabaseEvents,
} from '../../lib/attendance/time-engine';

// ─── Group Config ─────────────────────────────────────────────────────────

type GroupKey = 'WORKING' | 'ON_LUNCH' | 'ON_BREAK' | 'IN_MEETING' | 'ON_FIELD_VISIT' | 'CHECKED_OUT' | 'ABSENT';

const GROUP_META: Record<GroupKey, {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  emoji: string;
  bg: string;
  border: string;
  countColor: string;
  badgeClass: string;
}> = {
  WORKING: {
    label: 'Working Now',
    sublabel: 'Active working sessions',
    icon: Activity,
    emoji: '🟢',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    countColor: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  ON_LUNCH: {
    label: 'Lunch Break',
    sublabel: 'On lunch break',
    icon: Utensils,
    emoji: '🍽️',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    countColor: 'text-amber-400',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  ON_BREAK: {
    label: 'Tea Break',
    sublabel: 'On short break',
    icon: Coffee,
    emoji: '☕',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    countColor: 'text-blue-400',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  IN_MEETING: {
    label: 'In Meeting',
    sublabel: 'Attending a meeting',
    icon: Briefcase,
    emoji: '📋',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    countColor: 'text-purple-400',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  ON_FIELD_VISIT: {
    label: 'Field Visit',
    sublabel: 'Off-site visit',
    icon: Navigation,
    emoji: '🧭',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    countColor: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  CHECKED_OUT: {
    label: 'Checked Out',
    sublabel: 'Completed for today',
    icon: LogOut,
    emoji: '✅',
    bg: 'bg-slate-800/60',
    border: 'border-slate-700/50',
    countColor: 'text-slate-400',
    badgeClass: 'bg-slate-700/50 text-slate-400 border-slate-600/40',
  },
  ABSENT: {
    label: 'Not Checked In',
    sublabel: 'No check-in recorded',
    icon: Users,
    emoji: '🔴',
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/20',
    countColor: 'text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  },
};

function mapSummaryToGroup(s: AttendanceSummary): GroupKey {
  const statusStr = s.status as string;
  if (statusStr === 'ON_BREAK') return 'ON_BREAK';
  if (statusStr === 'ON_LUNCH') return 'ON_LUNCH';
  if (statusStr === 'IN_MEETING') return 'IN_MEETING';
  if (statusStr === 'ON_FIELD_VISIT') return 'ON_FIELD_VISIT';
  if (statusStr === 'ABSENT') return 'ABSENT';
  if (statusStr === 'CHECKED_OUT') return 'CHECKED_OUT';
  if (s.checkOutTime && s.checkOutTime !== '—' && (s.eventsCount === 0 || s.workingTimeMinutes === 0)) return 'CHECKED_OUT';
  return 'WORKING';
}

// ─── Employee Row ─────────────────────────────────────────────────────────

function EmployeeRow({ s, groupKey }: { s: AttendanceSummary; groupKey: GroupKey }) {
  const meta = GROUP_META[groupKey];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition group">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-sm font-black text-white shrink-0">
        {s.employeeName[0]}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-bold text-slate-100 text-sm truncate">{s.employeeName}</span>
        <span className="text-[10px] text-slate-500 truncate">{s.department}</span>
      </div>
      <div className="text-right space-y-0.5 shrink-0">
        <div className="font-mono text-xs font-bold text-emerald-400">
          {s.checkInTime || '—'}
        </div>
        <div className="text-[9px] text-slate-500">
          {formatDurationMinutes(s.workingTimeMinutes)} net
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${meta.badgeClass} shrink-0`}>
        {meta.emoji}
      </span>
    </div>
  );
}

// ─── Group Card ────────────────────────────────────────────────────────────

function GroupCard({ groupKey, employees }: { groupKey: GroupKey; employees: AttendanceSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const meta = GROUP_META[groupKey];
  const Icon = meta.icon;
  const count = employees.length;

  return (
    <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all duration-300 ${meta.border}`}>
      {/* Header */}
      <button
        className={`w-full flex items-center gap-4 p-5 text-left ${meta.bg} hover:opacity-90 transition-opacity`}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <div className={`p-3 rounded-xl bg-white/10 ${meta.countColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-black ${meta.countColor}`}>{count}</span>
            <span className="text-xs font-bold text-white">{meta.label}</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{meta.sublabel}</p>
        </div>
        {count > 0 && (
          <div className="flex items-center gap-1 text-slate-400">
            <span className="text-[10px]">{expanded ? 'Hide' : 'Show'}</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>

      {/* Employee List */}
      {expanded && count > 0 && (
        <div className="p-4 space-y-2 bg-slate-950 border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
          {employees.map((emp) => (
            <EmployeeRow key={emp.id} s={emp} groupKey={groupKey} />
          ))}
        </div>
      )}

      {expanded && count === 0 && (
        <div className="p-6 text-center text-slate-600 text-xs bg-slate-950 border-t border-slate-800">
          No employees in this group right now.
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────

export function TeamBreakDashboard() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [filterDept, setFilterDept] = useState<string>('All');

  const load = async () => {
    await syncSupabaseEvents();
    setSummaries(fetchAllAttendanceSummaries());
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    load();
    const unsub = subscribeAttendanceEvents(() => load());
    return () => unsub();
  }, []);

  // Departments from loaded data
  const departments = ['All', ...Array.from(new Set(summaries.map((s) => s.department)))];

  const filtered = summaries.filter((s) => {
    const matchDept = filterDept === 'All' || s.department === filterDept;
    const matchSearch =
      s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  // Group employees by status
  const groups: Record<GroupKey, AttendanceSummary[]> = {
    WORKING: [],
    ON_LUNCH: [],
    ON_BREAK: [],
    IN_MEETING: [],
    ON_FIELD_VISIT: [],
    CHECKED_OUT: [],
    ABSENT: [],
  };
  filtered.forEach((s) => {
    const g = mapSummaryToGroup(s);
    groups[g].push(s);
  });

  const totalEmployees = filtered.length;
  const totalWorking = groups.WORKING.length + groups.ON_LUNCH.length + groups.ON_BREAK.length + groups.IN_MEETING.length + groups.ON_FIELD_VISIT.length;
  const totalCheckedOut = groups.CHECKED_OUT.length;
  const totalAbsent = groups.ABSENT.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Live Status</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time break & attendance status — all employees
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-bold">Live Realtime</span>
          </div>
          <div className="text-[10px] text-slate-600 font-mono">
            Updated: {lastRefreshed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: totalEmployees, color: 'text-white', border: 'border-slate-700', icon: Users },
          { label: 'Active on Site', value: totalWorking, color: 'text-emerald-400', border: 'border-emerald-500/30', icon: Activity },
          { label: 'Checked Out', value: totalCheckedOut, color: 'text-purple-400', border: 'border-purple-500/30', icon: CheckCircle2 },
          { label: 'Not Checked In', value: totalAbsent, color: 'text-rose-400', border: 'border-rose-500/30', icon: Shield },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`p-5 rounded-2xl bg-slate-900/90 border ${kpi.border} shadow-xl flex flex-col`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">{kpi.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search + Department Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or department..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-amber-500 focus:outline-none placeholder:text-slate-600"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDept(d)}
              className={`px-3 py-2 rounded-xl font-bold text-xs border transition ${
                filterDept === d
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Department Summary Bar */}
      {filterDept === 'All' && summaries.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap gap-4">
          {departments.filter((d) => d !== 'All').map((dept) => {
            const deptEmps = summaries.filter((s) => s.department === dept);
            const deptWorking = deptEmps.filter((s) => ['PRESENT', 'LATE', 'OVERTIME', 'ON_BREAK', 'ON_LUNCH', 'IN_MEETING', 'ON_FIELD_VISIT'].includes(s.status)).length;
            return (
              <div key={dept} className="flex items-center gap-2 text-xs">
                <BarChart3 className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-slate-300 font-bold">{dept}</span>
                <span className="text-emerald-400 font-mono">{deptWorking}/{deptEmps.length}</span>
                <span className="text-slate-600 text-[10px]">active</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Status Group Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(GROUP_META) as GroupKey[]).map((key) => (
          <GroupCard key={key} groupKey={key} employees={groups[key]} />
        ))}
      </div>

      {summaries.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-600 text-sm space-y-2">
          <Users className="w-12 h-12 opacity-20 mb-2" />
          <p className="font-semibold">No attendance data yet</p>
          <p className="text-xs">Employees need to check in first via the Employee Portal or biometric terminals</p>
        </div>
      )}
    </div>
  );
}
