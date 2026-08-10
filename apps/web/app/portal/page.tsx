'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Clock, Coffee, Calendar as CalendarIcon, User, HelpCircle, Bell, Menu, X, Key, Lock, ShieldCheck, Sparkles, AlertTriangle, Check, LogOut
} from 'lucide-react';
import { ESSCalendar } from '../../components/ess/ess-calendar';
import { ESSLeaveManager } from '../../components/ess/ess-leave-manager';
import { ESSHeroMesh } from '../../components/ess/ess-hero-mesh';
import { ESSWorkSessionManager } from '../../components/ess/ess-work-session-manager';
import { ESSAttendanceAnalytics } from '../../components/ess/ess-attendance-analytics';
import { ESSTimelineEnhanced } from '../../components/ess/ess-timeline-enhanced';
import { ESSProfileEnterprise } from '../../components/ess/ess-profile-enterprise';
import { ESSSupportAudit } from '../../components/ess/ess-support-audit';
import {
  fetchAllAttendanceSummaries,
  fetchEmployeeTimeline,
  formatDurationMinutes,
  getValidActionsForState,
  hasCheckedOut,
  triggerEmployeeEvent,
  subscribeAttendanceEvents,
  syncSupabaseEvents,
} from '../../lib/attendance/time-engine';
import { AttendanceSummary, AttendanceEvent, AttendanceEventType } from '../../lib/attendance/attendance-types';
import { supabase, fetchEmployeesFromSupabase, fetchEmployeeAccountStatus, completeTemporaryPasswordUpdate } from '../../lib/supabase';
import { GlobalSearchCommand } from '../../components/ui/global-search-command';
import { fetchNotificationsFromSupabase, subscribeToNotifications, markAllNotificationsRead } from '../../lib/notifications/notification-engine';
import { NotificationBell } from '../../components/ui/notification-bell';
import { LiveSessionTicker } from '../../components/ui/live-session-ticker';

export type ESSTab =
  | 'dashboard'
  | 'attendance'
  | 'breaks'
  | 'leave'
  | 'calendar'
  | 'profile'
  | 'support';

const NAVIGATION_ITEMS: { id: ESSTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'My Attendance', icon: Clock },
  { id: 'breaks', label: 'Work Session', icon: Coffee },
  { id: 'leave', label: 'Leave', icon: CalendarIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'support', label: 'Support', icon: HelpCircle },
];

interface EmployeePortalProps {
  targetEmployeeId?: string;
}

export default function EmployeeSelfServicePortal({ targetEmployeeId }: EmployeePortalProps = {}) {
  const [activeTab, setActiveTab] = useState<ESSTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as ESSTab | null;
      const storedTab = localStorage.getItem('portal_active_tab') as ESSTab | null;
      if (tabParam) {
        setActiveTab(tabParam);
      } else if (storedTab) {
        setActiveTab(storedTab);
      }
    }
  }, []);

  const handleSetTab = (tab: ESSTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('portal_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const activeEmployeeId = targetEmployeeId || 'EMP-000003';

  // Dynamic Realtime Employee profile state loaded from Supabase DB
  const [employee, setEmployee] = useState({
    id: activeEmployeeId,
    name: 'THIRUMALAI R K',
    email: 'thirumalai@joycorporate.in',
    department: 'Software Development',
    designation: 'Managing Director (MD)',
    reportingManager: 'Joy Corporate Board',
    branch: 'Coimbatore HQ',
    shift: 'General Shift (09:00 AM - 06:00 PM)',
    joinedDate: '2023-01-15',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  });

  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [timeline, setTimeline] = useState<AttendanceEvent[]>([]);

  // Password Reset / First-Login Temporary Password Change State
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccessBanner, setPasswordSuccessBanner] = useState<string | null>(null);

  const checkAccountSecurityStatus = async () => {
    const acc = await fetchEmployeeAccountStatus(activeEmployeeId);
    if (acc && acc.password_reset_required === true) {
      setShowPasswordChangeModal(true);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New Password and Confirm Password do not match.');
      return;
    }

    setPasswordUpdating(true);
    setPasswordChangeError(null);

    const res = await completeTemporaryPasswordUpdate(employee.id, employee.email, newPassword);
    setPasswordUpdating(false);

    if (res.success) {
      setShowPasswordChangeModal(false);
      setPasswordSuccessBanner('✓ Password updated successfully! Your account is now fully secured.');
      setTimeout(() => setPasswordSuccessBanner(null), 5000);
    } else {
      setPasswordChangeError(res.message);
    }
  };

  const loadRealEmployeeProfile = async () => {
    try {
      const emps = await fetchEmployeesFromSupabase();
      if (emps && emps.length > 0) {
        const match = emps.find((e) => e.id === activeEmployeeId || e.employeeCode === activeEmployeeId);
        if (match) {
          setEmployee((prev) => ({
            ...prev,
            id: match.id || match.employeeCode || activeEmployeeId,
            name: match.name,
            email: match.email || `${match.name.toLowerCase().replace(/\s+/g, '')}@joycorporate.in`,
            department: match.department || prev.department,
            designation: match.designation || prev.designation,
            reportingManager: match.manager || prev.reportingManager,
            shift: match.shift || prev.shift,
            phone: match.phone || prev.phone,
            avatarUrl: match.avatar || prev.avatarUrl,
          }));
        }
      }
    } catch (e) {
      console.warn('Real employee profile fetch notice:', e);
    }
  };

  const loadData = async () => {
    await syncSupabaseEvents();
    const sums = fetchAllAttendanceSummaries();
    setSummaries(sums);
    setTimeline(fetchEmployeeTimeline(activeEmployeeId));
  };

  useEffect(() => {
    setIsMounted(true);
    loadRealEmployeeProfile();
    loadData();
    checkAccountSecurityStatus();

    // 2-Way Realtime Subscription to employees table for instant profile changes
    const empChannel = supabase
      .channel('portal-employee-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        loadRealEmployeeProfile();
      })
      .subscribe();

    const unsubscribe = subscribeAttendanceEvents(() => {
      loadData();
    });

    return () => {
      supabase.removeChannel(empChannel);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [activeEmployeeId]);

  const empSummary: AttendanceSummary | undefined = summaries.find(s => s.employeeId === employee.id);

  const currentSummary: AttendanceSummary = empSummary || {
    id: `sum-${employee.id}`,
    employeeId: employee.id,
    employeeCode: employee.id,
    employeeName: employee.name,
    department: employee.department,
    date: new Date().toISOString().split('T')[0],
    checkInTime: undefined,
    checkOutTime: undefined,
    breakDurationMinutes: 0,
    lunchDurationMinutes: 0,
    meetingDurationMinutes: 0,
    fieldDurationMinutes: 0,
    workingTimeMinutes: 0,
    totalTimeMinutes: 0,
    lateMinutes: 0,
    overtimeMinutes: 0,
    earlyExitMinutes: 0,
    shiftTargetMinutes: 480,
    payableHours: 0,
    status: 'ABSENT',
    eventsCount: 0,
  };

  const checkedOut = hasCheckedOut(employee.id);
  const validActions = getValidActionsForState(currentSummary.status, checkedOut);

  const handleTriggerEvent = async (eventType: AttendanceEventType, notes?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-jrm-client-token': 'jrm_dev_token_secret_1842',
        },
        body: JSON.stringify({
          employeeId: employee.id,
          employeeName: employee.name,
          department: employee.department,
          action: eventType,
          eventType,
          notes,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        await triggerEmployeeEvent(
          employee.id,
          employee.name,
          employee.department,
          eventType,
          'Employee Portal (Web)',
          'Manual',
          notes
        );
      }
      await syncSupabaseEvents();
      loadData();
    } catch (e) {
      await triggerEmployeeEvent(
        employee.id,
        employee.name,
        employee.department,
        eventType,
        'Employee Portal (Web)'
      );
      loadData();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-[#060c14]" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#060c14] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">

      {/* Global Command Palette — Ctrl+K */}
      <GlobalSearchCommand />

      {/* ── Top Clean Header ───────────────────────────────────────────────────── */}
      <header className="h-16 px-4 md:px-8 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JOY CORPORATE SOLUTIONS"
              className="w-10 h-10 object-contain shrink-0 drop-shadow-md"
            />
            <div className="flex flex-col text-left">
              <span className="font-black text-sm text-white tracking-wide">JOY CORPORATE SOLUTIONS</span>
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest -mt-0.5 font-mono">
                JRM HRMS • EMPLOYEE PORTAL
              </span>
            </div>
          </div>
        </div>

        {/* 7 Clean Navigation Items */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Side — Notification Bell + Profile */}
        <div className="flex items-center gap-3">
          <NotificationBell recipientId={employee.id} />

          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-emerald-500/50 transition cursor-pointer"
          >
            <img src={employee.avatarUrl} alt={employee.name} className="w-7 h-7 rounded-xl object-cover" />
            <div className="hidden sm:flex flex-col text-left text-xs">
              <span className="font-bold text-white leading-tight">{employee.name}</span>
              <span className="text-[10px] text-slate-400 leading-tight font-mono">{employee.id}</span>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/portal/login'}
            title="Logout"
            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md animate-in fade-in p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-sm font-bold text-white">Portal Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-1">
              {NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Workspace Body ──────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">

        {/* ── MODULE 1: Dashboard (Single Large Action Card + Compact Timeline) ──── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in">
            <ESSHeroMesh
              employeeName={employee.name}
              employeeId={employee.id}
              department={employee.department}
              avatarUrl={employee.avatarUrl}
              status={currentSummary.status}
              checkInTime={currentSummary.checkInTime || '—'}
              workingTimeStr={formatDurationMinutes(currentSummary.workingTimeMinutes)}
              netWorkingMinutes={currentSummary.workingTimeMinutes}
              validActions={validActions}
              onTriggerEvent={handleTriggerEvent}
              isLoading={isLoading}
              isMounted={isMounted}
            />

            {/* ── Live Session Ticker — real-time second-by-second work clock ── */}
            {currentSummary.checkInTime && (
              <div className="flex items-center justify-between px-5 py-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                    LIVE SESSION
                  </span>
                </div>
                <LiveSessionTicker
                  checkInTime={currentSummary.checkInTime}
                  isCheckedOut={currentSummary.checkOutTime !== undefined && currentSummary.checkOutTime !== null}
                  breakStartTime={
                    (currentSummary.status === 'ON_BREAK' || currentSummary.status === 'ON_LUNCH')
                      ? (timeline.filter(e => e.eventType === 'BREAK_START' || e.eventType === 'LUNCH_START').slice(-1)[0]?.eventTime)
                      : undefined
                  }
                />
              </div>
            )}

            <ESSTimelineEnhanced events={timeline} employeeName={employee.name} />
          </div>
        )}

        {/* ── MODULE 2: My Attendance ────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="animate-in fade-in">
            <ESSAttendanceAnalytics
              summaries={summaries}
              employeeName={employee.name}
              department={employee.department}
            />
          </div>
        )}

        {/* ── MODULE 3: Work Session ─────────────────────────────────────────── */}
        {activeTab === 'breaks' && (
          <div className="animate-in fade-in">
            <ESSWorkSessionManager
              summary={currentSummary}
              validActions={validActions}
              onTriggerEvent={handleTriggerEvent}
              isLoading={isLoading}
              isMounted={isMounted}
            />
          </div>
        )}

        {/* ── MODULE 4: Leave ────────────────────────────────────────────────── */}
        {activeTab === 'leave' && (
          <div className="animate-in fade-in">
            <ESSLeaveManager />
          </div>
        )}

        {/* ── MODULE 5: Calendar ─────────────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="animate-in fade-in">
            <ESSCalendar />
          </div>
        )}

        {/* ── MODULE 6: Profile ──────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="animate-in fade-in">
            <ESSProfileEnterprise
              employeeName={employee.name}
              employeeId={employee.id}
              department={employee.department}
              designation={employee.designation}
              reportingManager={employee.reportingManager}
              shift={employee.shift}
              avatarUrl={employee.avatarUrl}
              email={employee.email}
              phone={employee.phone}
            />
          </div>
        )}

        {/* ── MODULE 7: Support ──────────────────────────────────────────────── */}
        {activeTab === 'support' && (
          <div className="animate-in fade-in">
            <ESSSupportAudit employeeName={employee.name} employeeId={employee.id} />
          </div>
        )}

      </main>

      {/* Success Notification Banner */}
      {passwordSuccessBanner && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{passwordSuccessBanner}</span>
        </div>
      )}

      {/* Mandatory Temporary Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-950 border border-amber-500/40 rounded-[32px] shadow-2xl overflow-hidden flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200 relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Key className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
                  SECURITY POLICY ENFORCED
                </span>
                <h3 className="text-lg font-black text-white">
                  Update Temporary Password
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your account is currently using a temporary password assigned by HR. For account security, you must create a new secure password before accessing your dashboard.
            </p>

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 font-sans">
              {passwordChangeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">New Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Confirm New Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg flex items-center justify-center gap-2"
                >
                  {passwordUpdating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Updating Security Credentials...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Update Password & Enter Dashboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
