'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCircle, UserCheck2, ShieldCheck, ShieldAlert,
  Fingerprint, Building2, Activity, Cpu, ArrowRight,
  Users, Clock, Coffee, Wifi, CheckCircle2, AlertTriangle,
  Sparkles, BarChart3, Globe, Lock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';

interface PortalCard {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
  border: string;
  badge?: string;
  badgeColor?: string;
  stats?: { label: string; value: string | number }[];
  role: string;
}

export default function PortalHub() {
  const [liveStats, setLiveStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onBreak: 0,
    pendingWorkflows: 0,
    openTickets: 0,
    devicesOnline: 1,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    setIsMounted(true);
    loadStats();
    const interval = setInterval(loadStats, 30000);
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);

    const ch = supabase.channel('portal-hub-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_requests' }, loadStats)
      .subscribe();

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
      supabase.removeChannel(ch);
    };
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [empRes, presentRes, onBreakRes, wfRes, ticketRes] = await Promise.all([
        supabase.from('employees').select('count', { count: 'exact', head: true }),
        supabase.from('attendance_records').select('count', { count: 'exact', head: true }).or(`date.eq.${today},created_at.gte.${today}T00:00:00Z`),
        supabase.from('attendance_records').select('count', { count: 'exact', head: true }).eq('status', 'on_break'),
        supabase.from('workflow_requests').select('count', { count: 'exact', head: true }).in('approval_status', ['SUBMITTED', 'MANAGER_APPROVED']),
        supabase.from('support_tickets').select('count', { count: 'exact', head: true }).neq('status', 'CLOSED'),
      ]);
      setLiveStats({
        totalEmployees: empRes.count ?? 0,
        presentToday: presentRes.count ?? 0,
        onBreak: onBreakRes.count ?? 0,
        pendingWorkflows: wfRes.count ?? 0,
        openTickets: ticketRes.count ?? 0,
        devicesOnline: 1,
      });
    } catch {}
  };

  const portals: PortalCard[] = [
    {
      title: 'Employee Self-Service',
      subtitle: 'ESS Portal',
      description: 'Check-in, breaks, leave requests, attendance calendar, and personal analytics.',
      href: '/portal',
      icon: UserCircle,
      gradient: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
      border: 'border-emerald-500/30 hover:border-emerald-400/60',
      badge: 'EMPLOYEE',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      role: 'Employee',
      stats: [
        { label: 'Present Today', value: liveStats.presentToday },
        { label: 'On Break', value: liveStats.onBreak },
      ],
    },
    {
      title: 'Manager Portal',
      subtitle: 'Team Management',
      description: 'Approve corrections, monitor team attendance, live break tracker, and SLA queue.',
      href: '/manager',
      icon: UserCheck2,
      gradient: 'from-purple-500/20 via-purple-600/10 to-transparent',
      border: 'border-purple-500/30 hover:border-purple-400/60',
      badge: 'MANAGER',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      role: 'Reporting Manager',
      stats: [
        { label: 'Pending Approvals', value: liveStats.pendingWorkflows },
        { label: 'Team Headcount', value: liveStats.totalEmployees },
      ],
    },
    {
      title: 'HR Specialist Portal',
      subtitle: 'Human Resources',
      description: 'Employee directory, attendance corrections, leave management, and HR reports.',
      href: '/hr',
      icon: ShieldCheck,
      gradient: 'from-blue-500/20 via-blue-600/10 to-transparent',
      border: 'border-blue-500/30 hover:border-blue-400/60',
      badge: 'HR',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      role: 'HR Specialist',
      stats: [
        { label: 'Employees', value: liveStats.totalEmployees },
        { label: 'Open Tickets', value: liveStats.openTickets },
      ],
    },
    {
      title: 'Super Admin Control Center',
      subtitle: 'Full Platform Access',
      description: 'Executive dashboard, biometric devices, companies, branches, AI copilot, and system health.',
      href: '/admin',
      icon: ShieldAlert,
      gradient: 'from-amber-500/20 via-amber-600/10 to-transparent',
      border: 'border-amber-500/30 hover:border-amber-400/60',
      badge: 'SUPER ADMIN',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      role: 'Super Admin',
      stats: [
        { label: 'Devices Online', value: liveStats.devicesOnline },
        { label: 'Total Employees', value: liveStats.totalEmployees },
      ],
    },
  ];

  const systemStats = [
    { icon: Users, label: 'Total Employees', value: liveStats.totalEmployees, color: 'text-emerald-400' },
    { icon: CheckCircle2, label: 'Present Today', value: liveStats.presentToday, color: 'text-emerald-400' },
    { icon: Coffee, label: 'On Break', value: liveStats.onBreak, color: 'text-amber-400' },
    { icon: AlertTriangle, label: 'Pending Reviews', value: liveStats.pendingWorkflows, color: 'text-rose-400' },
    { icon: Activity, label: 'Devices Online', value: liveStats.devicesOnline, color: 'text-cyan-400' },
    { icon: BarChart3, label: 'Open Tickets', value: liveStats.openTickets, color: 'text-purple-400' },
  ];

  if (!isMounted) return <div className="min-h-screen bg-[#060c14]" />;

  return (
    <div className="min-h-screen bg-[#060c14] text-slate-200 font-sans relative overflow-hidden">

      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[100px]" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] rounded-full bg-blue-500/4 blur-[100px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="JOY CORPORATE" className="w-10 h-10 object-contain drop-shadow-lg" />
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">JRM HRMS ENTERPRISE</span>
            <span className="text-base font-black text-white">Joy Corporate Solutions Pvt. Ltd.</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold">ALL SYSTEMS OPERATIONAL</span>
          </div>
          <div className="font-mono text-slate-400 text-xs">{currentTime}</div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            JRM HRMS v2.0 — Enterprise Attendance Platform
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Role-Based Portal Hub
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Select your portal below. All data is live from Supabase — no page refresh needed.
          </p>
        </div>

        {/* Live System Stats Strip */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {systemStats.map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1 hover:border-slate-700 transition">
              <stat.icon className={clsx('w-4 h-4 mx-auto', stat.color)} />
              <span className={clsx('text-2xl font-black block', stat.color)}>{stat.value}</span>
              <span className="text-[10px] text-slate-500 font-mono block leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map((portal) => (
            <a
              key={portal.href}
              href={portal.href}
              className={clsx(
                'group relative p-8 rounded-3xl bg-slate-900 border transition-all duration-300',
                'hover:shadow-2xl hover:-translate-y-1',
                portal.border
              )}
            >
              {/* Gradient overlay */}
              <div className={clsx('absolute inset-0 rounded-3xl bg-gradient-to-br opacity-60', portal.gradient)} />

              <div className="relative space-y-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <portal.icon className="w-7 h-7 text-slate-300" />
                  </div>
                  <span className={clsx('px-2.5 py-1 rounded-full border text-[10px] font-black font-mono', portal.badgeColor)}>
                    {portal.badge}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest block">{portal.subtitle}</span>
                  <h2 className="text-xl font-black text-white mt-0.5">{portal.title}</h2>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed font-sans">{portal.description}</p>
                </div>

                {/* Live mini-stats */}
                {portal.stats && (
                  <div className="flex gap-4">
                    {portal.stats.map((s) => (
                      <div key={s.label} className="flex-1 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 text-center">
                        <span className="text-lg font-black text-white block">{s.value}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <Lock className="w-3 h-3" />
                    {portal.role}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-300 group-hover:text-white transition">
                    Open Portal
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Quick Access Row */}
        <div className="space-y-3">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Quick Access</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Main Dashboard', href: '/', icon: BarChart3, color: 'text-slate-300' },
              { label: 'Biometric Devices', href: '/admin?tab=devices', icon: Cpu, color: 'text-cyan-400' },
              { label: 'Live Activity', href: '/admin?tab=devices', icon: Activity, color: 'text-emerald-400' },
              { label: 'AI Copilot', href: '/admin?tab=ai-copilot', icon: Sparkles, color: 'text-purple-400' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition text-xs font-bold group"
              >
                <item.icon className={clsx('w-4 h-4 shrink-0', item.color)} />
                <span className="text-slate-300 group-hover:text-white transition">{item.label}</span>
                <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition ml-auto" />
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-slate-800/60">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            JRM HRMS v2.0 · Joy Corporate Solutions Pvt. Ltd. · Powered by Supabase Realtime
          </p>
        </div>
      </main>
    </div>
  );
}
