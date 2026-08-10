'use me';
'use client';

import React from 'react';
import {
  Radio,
  ScanFace,
  Fingerprint,
  CreditCard,
  QrCode,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { AttendanceRecord, AttendanceMethod } from '../../types';

interface LiveFeedPreviewProps {
  records: AttendanceRecord[];
  onViewAll: () => void;
}

export function LiveFeedPreview({ records, onViewAll }: LiveFeedPreviewProps) {
  const getMethodBadge = (method: AttendanceMethod) => {
    switch (method) {
      case 'face':
        return { label: 'Face AI', icon: ScanFace, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'fingerprint':
        return { label: 'Fingerprint', icon: Fingerprint, color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' };
      case 'aadhaar':
        return { label: 'Aadhaar RD', icon: CreditCard, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'qr':
        return { label: 'Dynamic QR', icon: QrCode, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'gps':
        return { label: 'GPS Radius', icon: MapPin, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'selfie_gps':
        return { label: 'Selfie + GPS', icon: Smartphone, color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' };
      default:
        return { label: 'Manual', icon: Radio, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Live Attendance Feed
              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                REAL-TIME STREAM
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Live event stream from ZKTeco, Suprema & Mobile Terminals
            </p>
          </div>
        </div>

        <button
          onClick={onViewAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition"
        >
          <span>Full Stream</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Record Cards List */}
      <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
        {records.slice(0, 10).map((record, idx) => {
          const methodInfo = getMethodBadge(record.method);
          const Icon = methodInfo.icon;
          const isLatest = idx === 0;
          return (
            <div
              key={record.id}
              className={`p-3.5 rounded-xl bg-slate-950/60 border transition-all duration-300 flex items-center justify-between gap-4 group ${
                isLatest
                  ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(52,211,153,0.15)] animate-in slide-in-from-top-3 duration-300 ring-1 ring-emerald-500/30'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {/* Employee Info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {record.employeeAvatar ? (
                    <img
                      src={record.employeeAvatar}
                      alt={record.employeeName}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-blue-500/40 transition"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs ring-2 ring-slate-800 group-hover:ring-blue-500/40 transition">
                      {(record.employeeName || '?')[0]}
                    </div>
                  )}
                  {isLatest && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-blue-300 transition flex items-center gap-1.5">
                    {record.employeeName}
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                      {record.employeeId}
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {record.department} • {record.deviceName}
                  </span>
                </div>
              </div>

              {/* Attendance Method & Confidence */}
              <div className="hidden sm:flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${methodInfo.color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{methodInfo.label}</span>
                </div>

                {record.confidenceScore && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                    {record.confidenceScore}%
                  </span>
                )}
              </div>

              {/* Timestamp & Verified Badge */}
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs font-mono font-bold text-slate-200">
                  {record.checkInTime}
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
