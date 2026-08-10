'use client';

import React from 'react';
import {
  Award,
  TrendingUp,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Zap,
  ShieldCheck,
  Star,
} from 'lucide-react';

interface ESSManagerNotesScoreProps {
  employeeName: string;
}

export function ESSManagerNotesScore({ employeeName }: ESSManagerNotesScoreProps) {
  const scoreBreakdown = [
    { title: 'Attendance Rate', value: 98, color: 'text-emerald-400', border: 'border-emerald-500/30', desc: 'Present 20 of 22 working days' },
    { title: 'Punctuality Score', value: 95, color: 'text-amber-400', border: 'border-amber-500/30', desc: 'Only 2 minor late check-ins' },
    { title: 'Break Compliance', value: 100, color: 'text-blue-400', border: 'border-blue-500/30', desc: 'Zero policy overbreak warnings' },
    { title: 'Leave Usage Ratio', value: 98, color: 'text-purple-400', border: 'border-purple-500/30', desc: 'Planned leaves properly documented' },
  ];

  const managerNotes = [
    {
      id: 'note-01',
      author: 'Rajesh Kumar (VP Engineering)',
      role: 'Direct Manager',
      date: '2026-08-02',
      type: 'PRAISE',
      message: 'Excellent punctuality and team collaboration during the Q3 product release. Keep up the great work!',
    },
    {
      id: 'note-02',
      author: 'Anita Sharma (HR Manager)',
      role: 'People Operations',
      date: '2026-07-28',
      type: 'INFO',
      message: 'Reminder: Annual Cyber Security & Safety Training module is due by Aug 15. Please complete via the portal.',
    },
    {
      id: 'note-03',
      author: 'Rajesh Kumar (VP Engineering)',
      role: 'Direct Manager',
      date: '2026-07-20',
      type: 'COACHING',
      message: 'Noticed check-in at 09:28 AM on July 20. Thanks for staying late to complete the deployment!',
    },
  ];

  const badges = [
    { name: 'Punctuality Ninja', desc: '10 consecutive days on-time', icon: Zap, color: 'text-amber-400' },
    { name: 'Shift Champion', desc: 'Top 2% net working hours', icon: Star, color: 'text-purple-400' },
    { name: 'Break Compliant', desc: '100% tea/lunch policy compliance', icon: ShieldCheck, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Score Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Gamified Attendance & Compliance Score</h3>
          </div>
          <p className="text-xs text-slate-400">
            Realtime performance metrics calculated by the Time Engine • Grade: Exemplary
          </p>
        </div>

        <div className="flex items-baseline gap-2 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 uppercase">Overall Index</span>
          <span className="text-3xl font-black text-purple-400 font-mono">97%</span>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreBreakdown.map((item, idx) => (
          <div key={idx} className={`p-5 rounded-2xl bg-slate-900 border ${item.border} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">{item.title}</span>
              <span className={`text-xl font-black ${item.color} font-mono`}>{item.value}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r from-emerald-500 to-purple-500 rounded-full`}
                style={{ width: `${item.value}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Badges Row */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> Earned Achievement Badges
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {badges.map((b, i) => {
            const Icon = b.icon;
            return (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <Icon className={`w-6 h-6 ${b.color}`} />
                <div>
                  <span className="font-bold text-white text-xs block">{b.name}</span>
                  <span className="text-[10px] text-slate-400">{b.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manager Notes Feed */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Manager Feedback & Coaching Notes</h3>
          </div>
          <span className="text-xs text-slate-500">{managerNotes.length} Notes Received</span>
        </div>

        <div className="space-y-3">
          {managerNotes.map((note) => (
            <div key={note.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{note.author}</span>
                  <span className="text-[10px] text-slate-500 font-medium">({note.role})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{note.date}</span>
              </div>
              <p className="text-xs text-slate-300 italic">"{note.message}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
