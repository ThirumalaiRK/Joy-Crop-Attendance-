'use me';
'use client';

import React from 'react';
import {
  User,
  Clock,
  Calendar,
  Award,
  Flame,
  CheckCircle2,
  XCircle,
  ScanFace,
  Fingerprint,
  CreditCard,
  QrCode,
  MapPin,
  Sparkles,
  TrendingUp,
  Briefcase,
  Mail,
  Phone,
} from 'lucide-react';
import { Employee, AttendanceRecord } from '../../types';

interface EmployeeProfileProps {
  employee: Employee;
  todayLog?: AttendanceRecord;
  onBackToDirectory?: () => void;
}

export function EmployeeProfile({ employee, todayLog, onBackToDirectory }: EmployeeProfileProps) {
  if (!employee) {
    return (
      <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-400 space-y-4">
        <p className="text-sm font-semibold">No employee selected or profile unavailable.</p>
        {onBackToDirectory && (
          <button onClick={onBackToDirectory} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition">
            Back to Staff Directory
          </button>
        )}
      </div>
    );
  }

  const firstName = employee.name ? employee.name.split(' ')[0] : 'Employee';
  const managerDisplay =
    employee.department === 'Executive'
      ? 'Board of Directors / CEO'
      : employee.manager || 'Executive Management';

  const steps = [
    { label: 'Check-in', time: employee.avgArrival || '08:52 AM', status: 'completed' },
    { label: 'Morning Break', time: '10:45 AM', status: 'completed' },
    { label: 'Lunch Break', time: '01:15 PM', status: 'completed' },
    { label: 'Team Standup Meeting', time: '03:30 PM', status: 'completed' },
    { label: 'Shift Check-out', time: employee.avgExit ? `${employee.avgExit} (Expected)` : '06:14 PM (Expected)', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button if navigated from Directory */}
      {onBackToDirectory && (
        <button
          onClick={onBackToDirectory}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition"
        >
          <span>← Back to Staff Directory</span>
        </button>
      )}

      {/* Top Banner / Hero Profile Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Avatar & Personal Details */}
        <div className="flex items-center gap-5">
          <div className="relative">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-blue-500/40 shadow-2xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-2xl ring-4 ring-blue-500/30 shadow-2xl">
                {(employee.name || '?')[0]}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-white">{employee.name}</h2>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                {employee.id}
              </span>
            </div>
            <span className="text-sm font-semibold text-blue-400">{employee.designation}</span>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> {employee.department}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Scores & Streaks */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center min-w-[110px]">
            <span className="text-2xl font-extrabold text-emerald-400">{employee.attendanceScore}%</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
              Attendance Score
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center min-w-[110px]">
            <span className="text-2xl font-extrabold text-blue-400">{employee.productivityScore}%</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
              Productivity
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center min-w-[110px]">
            <span className="text-2xl font-extrabold text-amber-400 flex items-center gap-1">
              <Flame className="w-5 h-5 fill-amber-400 animate-pulse" /> {employee.currentStreak}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
              Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Timeline & Biometric Registration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Step Timeline Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" /> Today's Attendance Activity Timeline
              </h3>
              <span className="text-xs text-slate-400">Target Shift: {employee.shift}</span>
            </div>

            {/* Step Bar */}
            <div className="relative py-4">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-800 transform -translate-y-1/2" />
              <div className="grid grid-cols-5 gap-2 relative z-10">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform hover:scale-110 ${
                        step.status === 'completed'
                          ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-200">{step.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{step.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Biometric Enrollment Registration Status */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-purple-400" /> Biometric Authentication Status Checklist
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: 'Face Recognition', enabled: employee.biometricStatus?.face ?? true, icon: ScanFace },
                { name: 'Fingerprint SDK', enabled: employee.biometricStatus?.fingerprint ?? true, icon: Fingerprint },
                { name: 'Aadhaar Linked', enabled: employee.biometricStatus?.aadhaar ?? false, icon: CreditCard },
                { name: 'Dynamic QR', enabled: employee.biometricStatus?.qr ?? true, icon: QrCode },
                { name: 'GPS Geofence', enabled: employee.biometricStatus?.gps ?? true, icon: MapPin },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col items-center text-center space-y-2"
                  >
                    <Icon className={`w-6 h-6 ${item.enabled ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                        item.enabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.enabled ? 'ENROLLED' : 'NOT LINKED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: AI Insights & Employment Details */}
        <div className="space-y-6">
          {/* AI Insights Card */}
          <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-900/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" /> AI Attendance Insights
              </span>
              <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-300 rounded">
                99% ACCURACY
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white">{firstName}</strong> arrives on average at <strong className="text-white">{employee.avgArrival || '08:52 AM'}</strong> (8 minutes ahead of shift start). Zero unexcused leaves recorded in the last 180 days.
            </p>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="text-emerald-400 font-semibold block">Predictive Risk: Extremely Low (&lt;0.1%)</span>
              <p>Top check-in gate: Ground Lobby ZKTeco ProFace X.</p>
            </div>
          </div>

          {/* Manager & Shift Info */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl space-y-3 text-xs text-slate-300">
            <h3 className="font-bold text-slate-100 text-sm">Shift & Reporting Line</h3>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Shift:</span>
                <span className="font-medium text-slate-100">{employee.shift}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direct Manager:</span>
                <span className="font-medium text-slate-100">{managerDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Desk Number:</span>
                <span className="font-mono text-blue-400">{employee.deskLocation?.deskNo || 'DESK-502'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Employment Status:</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-semibold rounded">
                  {employee.employmentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
