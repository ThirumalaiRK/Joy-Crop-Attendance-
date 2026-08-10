'use client';

import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Radio,
  Users,
  Building2,
  Receipt,
  Fingerprint,
  UserCheck,
  FileBarChart2,
  Bell,
  Settings,
  MonitorSmartphone,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Key,
  ExternalLink,
  UserCircle,
  UserCheck2,
  ShieldAlert,
} from 'lucide-react';
import { clsx } from 'clsx';

export type NavTab =
  | 'dashboard'
  | 'live-attendance'
  | 'checkin-modes'
  | 'employees'
  | 'floor-map'
  | 'profile'
  | 'devices'
  | 'enrollment'
  | 'shifts'
  | 'visitors'
  | 'reports'
  | 'analytics'
  | 'notifications'
  | 'settings'
  | 'kiosk';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  openKiosk: (mode: 'check_in' | 'check_out') => void;
  openAiAssistant: () => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  // Live counts from Supabase
  liveEmployeeCount?: number;
  liveDeviceCount?: number;
  unreadNotifications?: number;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  openKiosk,
  openAiAssistant,
  collapsed,
  setCollapsed,
  liveEmployeeCount,
  liveDeviceCount,
  unreadNotifications = 0,
}: SidebarProps) {
  const mainNav = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'live-attendance' as NavTab,
      label: 'Live Attendance',
      icon: Radio,
      badge: 'LIVE',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    { id: 'checkin-modes' as NavTab, label: 'Attendance Modes', icon: Fingerprint },
    {
      id: 'employees' as NavTab,
      label: 'Employees',
      icon: Users,
      badge: liveEmployeeCount != null ? String(liveEmployeeCount) : undefined,
      badgeColor: 'bg-slate-700/60 text-slate-300 border border-slate-600/40',
    },
    {
      id: 'floor-map' as NavTab,
      label: 'Live Floor Map',
      icon: MapPin,
      badge: 'NEW',
      badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    },
  ];

  const managementNav = [
    {
      id: 'devices' as NavTab,
      label: 'Biometric Devices',
      icon: MonitorSmartphone,
      badge: liveDeviceCount != null ? `${liveDeviceCount} Active` : '5 Active',
      badgeColor: 'bg-slate-700/60 text-slate-300 border border-slate-600/40',
    },
    { id: 'enrollment' as NavTab, label: 'Biometric Enrollment', icon: Key },
    { id: 'shifts' as NavTab, label: 'Shift Rules', icon: Clock },
    { id: 'visitors' as NavTab, label: 'Visitor Passes', icon: Building2 },
    { id: 'reports' as NavTab, label: 'Reports & Analytics', icon: FileBarChart2 },
  ];

  const systemNav = [
    {
      id: 'notifications' as NavTab,
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications > 0 ? String(unreadNotifications) : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    },
    { id: 'settings' as NavTab, label: 'Security & Settings', icon: Settings },
  ];

  const NavItem = ({
    item,
    badgeRound = false,
  }: {
    item: { id: NavTab; label: string; icon: any; badge?: string; badgeColor?: string };
    badgeRound?: boolean;
  }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 group relative',
          isActive
            ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-inner scale-[1.01]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 hover:scale-[1.005]'
        )}
        title={collapsed ? item.label : undefined}
      >
        {/* Active left indicator */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full" />
        )}
        <Icon
          className={clsx(
            'w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110',
            isActive ? 'text-blue-400' : 'text-slate-400'
          )}
        />
        {!collapsed && (
          <span className="truncate flex-1 text-left">{item.label}</span>
        )}
        {!collapsed && item.badge && (
          <span
            className={clsx(
              'px-1.5 py-0.5 text-[9px] font-bold shrink-0',
              badgeRound ? 'rounded-full' : 'rounded-md',
              item.badgeColor || 'bg-slate-800 text-slate-400 border border-slate-700'
            )}
          >
            {item.badge}
          </span>
        )}
        {/* Collapsed mode: show badge dot if there's a numeric badge */}
        {collapsed && item.badge && /^\d+$/.test(item.badge) && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
        )}
      </button>
    );
  };

  return (
    <aside
      className={clsx(
        'relative z-30 flex flex-col bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 ease-in-out text-slate-300 select-none shadow-2xl h-screen sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo.png"
            alt="JOY CORPORATE SOLUTIONS"
            className="w-9 h-9 object-contain shrink-0 drop-shadow-md"
          />
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black tracking-tight text-white leading-none truncate">
                JOY CORPORATE
              </span>
              <span className="text-[9px] uppercase font-mono font-bold text-amber-400 tracking-wider mt-0.5 truncate">
                JRM HRMS ENGINE
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight
            className={clsx('w-3.5 h-3.5 transition-transform duration-300', !collapsed && 'rotate-180')}
          />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-5 scrollbar-thin scrollbar-thumb-slate-800/80 scrollbar-track-transparent">
        {/* Core Operations */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 mt-1">
              Core Operations
            </h3>
          )}
          <nav className="space-y-0.5">
            {mainNav.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Management & Hardware */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Management & Hardware
            </h3>
          )}
          <nav className="space-y-0.5">
            {managementNav.map((item) => (
              <NavItem key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* System */}
        <div>
          {!collapsed && (
            <h3 className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              System
            </h3>
          )}
          <nav className="space-y-0.5">
            {systemNav.map((item) => (
              <NavItem key={item.id} item={item} badgeRound />
            ))}
          </nav>
        </div>
      </div>

      {/* Portal Shortcuts */}
      {!collapsed && (
        <div className="px-2.5 py-2.5 border-t border-slate-800/80 shrink-0">
          <h3 className="px-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Role Portals</h3>
          <div className="space-y-1">
            {[
              { label: 'Employee Portal', href: '/portal', color: 'text-emerald-400', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20', icon: UserCircle },
              { label: 'Manager Portal', href: '/manager', color: 'text-purple-400', bg: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20', icon: UserCheck2 },
              { label: 'HR Portal',      href: '/hr',      color: 'text-blue-400',   bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',     icon: ShieldCheck },
              { label: 'Super Admin',    href: '/admin',   color: 'text-amber-400',  bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',  icon: ShieldAlert },
            ].map((p) => (
              <a
                key={p.href}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition group ${p.bg} ${p.color}`}
              >
                <p.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 truncate">{p.label}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* AI Assistant Footer */}
      <div className="px-2.5 py-2.5 border-t border-slate-800/80 shrink-0">
        <button
          onClick={openAiAssistant}
          className={clsx(
            'w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-purple-500/30 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 transition-all duration-150 group hover:scale-[1.01]'
          )}
          title={collapsed ? 'AI Attendance Copilot' : undefined}
        >
          <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-purple-300 group-hover:rotate-45 transition-transform duration-200" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-xs font-semibold text-purple-200 truncate leading-none">
                AI Attendance Copilot
              </span>
              <span className="text-[10px] text-purple-400/70 mt-0.5">Ask HR Insights & Anomalies</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
