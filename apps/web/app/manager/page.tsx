'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  BarChart3,
  Bell,
  Menu,
  X,
  RefreshCw,
  AlertTriangle,
  Coffee,
  UserCheck,
  ChevronRight,
  Sparkles,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { ManagerApprovalCenter } from '../../components/manager/manager-approval-center';
import { TeamBreakDashboard } from '../../components/manager/team-break-dashboard';
import { GlobalSearchCommand } from '../../components/ui/global-search-command';
import { supabase, fetchEmployeesFromSupabase } from '../../lib/supabase';
import { fetchNotificationsFromSupabase, subscribeToNotifications } from '../../lib/notifications/notification-engine';
import { AppNotification } from '../../lib/notifications/notification-engine';

type ManagerTab = 'dashboard' | 'approvals' | 'team-breaks' | 'team-calendar' | 'analytics';

export default function ManagerPortal() {
  const [activeTab, setActiveTab] = useState<ManagerTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Live team KPIs from Supabase
  const [teamPresent, setTeamPresent] = useState(0);
  const [teamLate, setTeamLate] = useState(0);
  const [teamOnBreak, setTeamOnBreak] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    loadDashboardData();

    // Realtime team attendance updates
    const channel = supabase.channel('manager-portal-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, () => {
        loadDashboardData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_requests' }, () => {
        loadPendingApprovals();
      })
      .subscribe();

    // Notification subscription for this manager
    const unsubNotif = subscribeToNotifications('MGR-001', () => {
      loadNotifications();
    });

    return () => {
      supabase.removeChannel(channel);
      unsubNotif();
    };
  }, []);

  const loadDashboardData = async () => {
    loadPendingApprovals();
    loadNotifications();

    // Load live attendance counts from DB
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [presentRes, lateRes, breakRes] = await Promise.all([
        supabase.from('attendance_records').select('count', { count: 'exact', head: true })
          .eq('date', today).eq('status', 'present'),
        supabase.from('attendance_records').select('count', { count: 'exact', head: true })
          .eq('date', today).eq('status', 'late'),
        supabase.from('attendance_records').select('count', { count: 'exact', head: true })
          .eq('date', today).eq('status', 'on_break'),
      ]);
      setTeamPresent(presentRes.count ?? 0);
      setTeamLate(lateRes.count ?? 0);
      setTeamOnBreak(breakRes.count ?? 0);
    } catch {}
  };

  const loadPendingApprovals = async () => {
    try {
      const { count } = await supabase
        .from('workflow_requests')
        .select('count', { count: 'exact', head: true })
        .eq('approval_status', 'SUBMITTED')
        .eq('assigned_role', 'ReportingManager');
      setPendingApprovals(count ?? 0);
    } catch {}
  };

  const loadNotifications = async () => {
    const notifs = await fetchNotificationsFromSupabase('MGR-001', 20);
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.isRead).length);
  };

  const navItems: { id: ManagerTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2, badge: pendingApprovals },
    { id: 'team-breaks', label: 'Team Live', icon: Coffee },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (!isMounted) return <div className="min-h-screen bg-[#060c14]" />;

  return (
    <div className="min-h-screen bg-[#060c14] text-slate-200 font-sans flex flex-col">

      {/* Global Search Command Palette */}
      <GlobalSearchCommand />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block leading-none">MANAGER PORTAL</span>
            <span className="text-sm font-black text-white">Joy Corporate Solutions Pvt. Ltd.</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === item.id
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
              {(item.badge ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-black text-xs">
              RK
            </div>
            <div className="text-[11px]">
              <span className="font-bold text-white block">Rajesh Kumar</span>
              <span className="text-slate-400 font-mono">Reporting Manager</span>
            </div>
          </div>
        </div>
      </header>

      {/* KPI Strip */}
      {activeTab === 'dashboard' && (
        <div className="bg-slate-950 border-b border-slate-800/60 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Present Today', value: teamPresent, color: 'emerald', icon: UserCheck },
            { label: 'Late Arrivals', value: teamLate, color: 'amber', icon: Clock },
            { label: 'On Break Now', value: teamOnBreak, color: 'blue', icon: Coffee },
            { label: 'Pending Approvals', value: pendingApprovals, color: 'rose', icon: AlertTriangle },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <div className={`w-9 h-9 rounded-xl bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 flex items-center justify-center text-${kpi.color}-400`}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-xl font-black text-${kpi.color}-300 block leading-none`}>{kpi.value}</span>
                <span className="text-[10px] text-slate-400 font-mono">{kpi.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main
        key={activeTab}
        className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block mb-4">Quick Actions</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Review Approvals', icon: CheckCircle2, color: 'purple', action: () => setActiveTab('approvals') },
                  { label: 'Live Team Status', icon: Coffee, color: 'blue', action: () => setActiveTab('team-breaks') },
                  { label: 'Analytics', icon: TrendingUp, color: 'emerald', action: () => setActiveTab('analytics') },
                  { label: 'Export Report', icon: FileText, color: 'amber', action: () => {} },
                ].map((qa) => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-${qa.color}-500/5 border border-${qa.color}-500/20 hover:border-${qa.color}-500/50 hover:bg-${qa.color}-500/10 transition group`}
                  >
                    <qa.icon className={`w-6 h-6 text-${qa.color}-400 group-hover:scale-110 transition`} />
                    <span className={`text-xs font-bold text-${qa.color}-300`}>{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pending approvals hint */}
            {pendingApprovals > 0 && (
              <div
                onClick={() => setActiveTab('approvals')}
                className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between cursor-pointer hover:bg-amber-500/15 transition group"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <div>
                    <span className="font-black text-white text-sm block">
                      {pendingApprovals} Pending Approval{pendingApprovals > 1 ? 's' : ''} Awaiting Your Review
                    </span>
                    <span className="text-xs text-amber-400 font-mono">SLA: 4 hours • Auto-escalates to HR if exceeded</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
              </div>
            )}

            {/* Team Break Status embedded */}
            <TeamBreakDashboard />
          </div>
        )}

        {activeTab === 'approvals' && <ManagerApprovalCenter />}
        {activeTab === 'team-breaks' && <TeamBreakDashboard />}
        {activeTab === 'analytics' && (
          <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-black text-white">Department Analytics</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Realtime department attendance heatmaps, overtime trends, and leave analytics will be rendered here.
            </p>
          </div>
        )}
      </main>

    </div>
  );
}
