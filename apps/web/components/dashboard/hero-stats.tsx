'use me';
'use client';

import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Home,
  Moon,
  Zap,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface HeroStatsProps {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  wfhCount: number;
  onLeaveCount: number;
  overtimeHours: number;
  avgCheckIn: string;
  avgCheckOut: string;
  attendancePercent: number;
  currentlyInsideCount?: number;
}

export function HeroStats({
  presentCount,
  absentCount,
  lateCount,
  wfhCount,
  onLeaveCount,
  overtimeHours,
  avgCheckIn,
  avgCheckOut,
  attendancePercent,
  currentlyInsideCount = 1,
}: HeroStatsProps) {
  const stats = [
    {
      label: 'Present Today',
      value: presentCount.toString(),
      subtext: 'Verified biometric',
      icon: UserCheck,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
    },
    {
      label: 'Currently Inside',
      value: currentlyInsideCount.toString(),
      subtext: 'Active in building',
      icon: Users,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-400/40 animate-pulse',
    },
    {
      label: 'Late Check-ins',
      value: lateCount.toString(),
      subtext: 'Within grace period',
      icon: Clock,
      color: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
    },
    {
      label: 'Absent',
      value: absentCount.toString(),
      subtext: '0 Unexcused leave',
      icon: UserX,
      color: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
    },
    {
      label: 'Work From Home',
      value: wfhCount.toString(),
      subtext: 'Approved remote',
      icon: Home,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/20 text-blue-400',
    },
    {
      label: 'Avg Arrival Time',
      value: avgCheckIn,
      subtext: 'Target 09:00 AM',
      icon: TrendingUp,
      color: 'from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
      iconBg: 'bg-purple-500/20 text-purple-400',
    },
    {
      label: 'Avg Exit Time',
      value: avgCheckOut,
      subtext: 'Shift end 06:00 PM',
      icon: Clock,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
    },
    {
      label: 'Overtime Hours',
      value: `${overtimeHours} hrs`,
      subtext: 'Approved overtime',
      icon: Zap,
      color: 'from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30',
      iconBg: 'bg-orange-500/20 text-orange-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
      {/* Featured Rate Ring Card */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-blue-900/40 via-slate-900/90 to-slate-950 border border-blue-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Today's Attendance Rate
          </span>
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
            Target 95%
          </span>
        </div>

        <div className="my-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-4xl font-extrabold text-white tracking-tight animate-in fade-in duration-300">
              {attendancePercent}%
            </span>
            <span className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              +2.4% vs last week
            </span>
          </div>

          {/* Mini Radial Progress Ring SVG */}
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray={163}
                strokeDashoffset={163 - (163 * attendancePercent) / 100}
                className="text-blue-500 transition-all duration-1000 ease-out"
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <Sparkles className="w-4 h-4 text-blue-400 absolute" />
          </div>
        </div>

        <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
            style={{ width: `${attendancePercent}%` }}
          />
        </div>
      </div>

      {/* Individual Stat Cards */}
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`col-span-1 p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 shadow-lg flex flex-col justify-between group hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400 truncate">
                {stat.label}
              </span>
              <div className={`p-2 rounded-xl ${stat.iconBg} transition-transform group-hover:scale-110`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-2xl font-bold text-slate-100 tracking-tight font-sans">
                {stat.value}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">{stat.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
