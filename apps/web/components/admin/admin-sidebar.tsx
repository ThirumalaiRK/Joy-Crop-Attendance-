'use client';

import React from 'react';
import {
  LayoutDashboard, Radio, Users, Fingerprint, MonitorSmartphone,
  Building2, GitBranch, UserCheck2, BarChart3, Bot, Bell,
  ScrollText, ShieldAlert, Code2, Activity, Settings2,
  AlertOctagon, Cpu, FileBarChart2, CreditCard, Plug,
  ChevronRight, ShieldCheck, Sparkles, CalendarClock, UserX,
  Layers, Key, MapPin, Coffee, Server,
} from 'lucide-react';
import { clsx } from 'clsx';

export type AdminTab =
  | 'dashboard'
  | 'live-attendance'
  | 'employee-portal'
  | 'team-breaks'
  | 'employees'
  | 'leave-management'
  | 'enrollment-queue'
  | 'devices'
  | 'companies'
  | 'branches'
  | 'visitors'
  | 'corrections'
  | 'support'
  | 'reports'
  | 'ai-copilot'
  | 'subscriptions'
  | 'integrations'
  | 'notifications'
  | 'audit-logs'
  | 'security'
  | 'developer'
  | 'system-health'
  | 'unknown-fingerprints'
  | 'device-diagnostics'
  | 'settings'
  | 'connector-status'
  | 'pay-codes'
  | 'pay-periods'
  | 'payroll-processing'
  | 'payroll-reports'
  | 'access-control'
  // Aligned Employee/Kiosk views
  | 'checkin-modes'
  | 'floor-map'
  | 'enrollment'
  | 'shifts'
  | 'visitors-passes'
  | 'user-settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  openKiosk: (mode: 'check_in' | 'check_out') => void;
  liveAttendanceCount?: number;
  unknownFpCount?: number;
  employeeCount?: number;
  systemAlerts?: number;
}

const sections = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'dashboard' as AdminTab, label: 'Executive Dashboard', icon: LayoutDashboard },
      { id: 'live-attendance' as AdminTab, label: 'Live Attendance', icon: Radio, liveKey: 'attendance' },
      { id: 'corrections' as AdminTab, label: 'Attendance Corrections', icon: CalendarClock },
      { id: 'team-breaks' as AdminTab, label: 'Team Status & On-Duty', icon: Coffee },
    ],
  },
  {
    label: 'HR MANAGEMENT',
    items: [
      { id: 'employees' as AdminTab, label: 'Employees Directory', icon: Users, liveKey: 'employees' },
      { id: 'enrollment-queue' as AdminTab, label: 'Biometric Enrollment', icon: Key },
      { id: 'visitors' as AdminTab, label: 'Visitors Management', icon: UserCheck2 },
    ],
  },
  {
    label: 'ORGANIZATION',
    items: [
      { id: 'companies' as AdminTab, label: 'Companies & Departments', icon: Layers },
      { id: 'branches' as AdminTab, label: 'Branches & Locations', icon: MapPin },
      { id: 'shifts' as AdminTab, label: 'Shifts & Work Schedules', icon: CalendarClock },
    ],
  },
  {
    label: 'HARDWARE & DEVICES',
    items: [
      { id: 'devices' as AdminTab, label: 'Device Center', icon: MonitorSmartphone },
      { id: 'connector-status' as AdminTab, label: 'Connector & Sync Status', icon: Server },
      { id: 'unknown-fingerprints' as AdminTab, label: 'Unknown Fingerprints', icon: UserX, liveKey: 'unknownFp', alertColor: 'text-red-400' },
    ],
  },
  {
    label: 'REPORTS & INSIGHTS',
    items: [
      { id: 'reports' as AdminTab, label: 'Attendance & Punch Reports', icon: FileBarChart2 },
      { id: 'audit-logs' as AdminTab, label: 'Audit Logs', icon: ScrollText },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { id: 'access-control' as AdminTab, label: 'Access Control & User Roles', icon: Key },
      { id: 'security' as AdminTab, label: 'Security Center', icon: ShieldAlert },
      { id: 'notifications' as AdminTab, label: 'Notifications Settings', icon: Bell, liveKey: 'systemAlerts' },
      { id: 'settings' as AdminTab, label: 'Enterprise Settings', icon: Settings2 },
    ],
  },
];


export function AdminSidebar({
  activeTab,
  setActiveTab,
  openKiosk,
  liveAttendanceCount,
  unknownFpCount,
  employeeCount,
  systemAlerts = 0,
}: AdminSidebarProps) {
  const getBadge = (liveKey?: string) => {
    if (!liveKey) return undefined;
    if (liveKey === 'attendance' && liveAttendanceCount != null) return { value: String(liveAttendanceCount), color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    if (liveKey === 'employees' && employeeCount != null) return { value: String(employeeCount), color: 'bg-slate-700/60 text-slate-300 border-slate-600/40' };
    if (liveKey === 'unknownFp' && unknownFpCount && unknownFpCount > 0) return { value: String(unknownFpCount), color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (liveKey === 'systemAlerts' && systemAlerts > 0) return { value: String(systemAlerts), color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    return undefined;
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col bg-[#0a0f1a] border-r border-slate-800/60 shadow-2xl overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-slate-800/60 shrink-0">
        <img
          src="/logo.png"
          alt="JOY CORPORATE SOLUTIONS"
          className="w-10 h-10 object-contain shrink-0 drop-shadow-md"
        />
        <div className="flex flex-col text-left overflow-hidden">
          <span className="text-xs font-black text-white leading-tight tracking-tight truncate">
            JOY CORPORATE
          </span>
          <span className="text-[9px] uppercase font-mono font-extrabold text-amber-400 tracking-wider mt-0.5 truncate">
            JRM HRMS • SUPER ADMIN
          </span>
        </div>
      </div>

      {/* System health indicator */}
      <div className="mx-3 mt-2 mb-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] text-emerald-400 font-medium">All systems operational</span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-2 text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">
              {section.label}
            </p>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const badge = getBadge(item.liveKey);
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 group relative',
                      isActive
                        ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-violet-400 rounded-r-full" />
                    )}
                    <Icon className={clsx('w-3.5 h-3.5 shrink-0', isActive ? 'text-violet-400' : (item as any).alertColor || 'text-slate-500', 'group-hover:scale-110 transition-transform')} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {badge && (
                      <span className={clsx('px-1.5 py-0.5 text-[9px] font-bold rounded-full border', badge.color)}>
                        {badge.value}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-800/60 shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-900/50">
          <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-200">Super Admin</span>
            <span className="text-[9px] text-slate-500">Full Platform Access</span>
          </div>
          <a href="/" className="ml-auto text-[9px] text-slate-600 hover:text-slate-400 transition border border-slate-700 rounded px-1.5 py-0.5">
            ← App
          </a>
        </div>
      </div>
    </aside>
  );
}
