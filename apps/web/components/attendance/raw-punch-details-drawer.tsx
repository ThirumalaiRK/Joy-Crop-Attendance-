'use client';

import React, { useState } from 'react';
import {
  X, Fingerprint, Cpu, ShieldCheck, Clock, Layers,
  Lock, ArrowRight, CheckCircle2, ChevronDown, ChevronRight, FileJson
} from 'lucide-react';
import { formatMachineTimeIST, formatDisplayIST } from '../../lib/timezone';

export interface RawPunchRecord {
  id: string;
  company_id?: string;
  device_id?: string;
  device_ip: string;
  device_serial_number?: string;
  device_user_id: string;
  employee_id?: string | null;
  mapping_status: 'MAPPED' | 'UNMAPPED' | 'PENDING';
  machine_log_id?: string | null;
  machine_timestamp: string; // e.g. "2026-08-13 09:20:59"
  machine_timezone?: string;
  event_time_utc: string;    // UTC ISO
  event_type: string;        // IN / OUT / UNKNOWN
  verification_type: string; // FINGERPRINT / CARD / PASSWORD / FACE
  raw_payload?: any;
  source?: string;
  received_at_utc?: string;
  created_at?: string;
}

interface RawPunchDetailsDrawerProps {
  punch: RawPunchRecord;
  employeeName?: string;
  employeeCode?: string;
  onClose: () => void;
}

export function RawPunchDetailsDrawer({
  punch,
  employeeName = 'Employee',
  employeeCode = 'EMP-001',
  onClose,
}: RawPunchDetailsDrawerProps) {
  const [showPayload, setShowPayload] = useState(false);

  const formattedMachineTime = formatMachineTimeIST(punch.machine_timestamp);
  const formattedUtcTime = punch.event_time_utc
    ? `${new Date(punch.event_time_utc).toUTCString().replace('GMT', 'UTC')}`
    : '—';
  const formattedReceivedAt = punch.received_at_utc
    ? `${new Date(punch.received_at_utc).toUTCString().replace('GMT', 'UTC')}`
    : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/80 backdrop-blur-md transition-opacity"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg h-full bg-[#0c0e14] border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">

        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Raw Machine Punch</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  MACHINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Immutable Source Record · Device ID {punch.device_user_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IMMUTABLE WARNING BADGE */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300 shrink-0">
          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Source Data Immutable:</strong> Machine records cannot be edited. HR corrections create separate audit adjustment records.
          </span>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. EMPLOYEE & DEVICE IDENTITY */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Identity Mapping
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500">Employee Name</p>
                <p className="text-sm font-semibold text-white">{employeeName}</p>
                <p className="text-[11px] font-mono text-slate-400">{employeeCode}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Mapping Status</p>
                <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  punch.mapping_status === 'MAPPED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {punch.mapping_status}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Device User ID</p>
                <p className="text-sm font-mono font-semibold text-white">{punch.device_user_id}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Verification Method</p>
                <p className="text-xs font-medium text-slate-200 capitalize mt-1">
                  {punch.verification_type || 'FINGERPRINT'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. TIMESTAMPS COMPARISON */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-4">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Timestamp Integrity
            </h4>

            {/* Machine Local Time (PRIMARY DISPLAY) */}
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Machine Local Timestamp (Original Source)
                </span>
                <span className="text-[10px] font-mono text-slate-400">{punch.machine_timezone || 'Asia/Kolkata'}</span>
              </div>
              <p className="text-base font-mono font-bold text-white tracking-wide">
                {formattedMachineTime}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Exact string from hardware: &quot;{punch.machine_timestamp}&quot;
              </p>
            </div>

            {/* UTC Canonical Time */}
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Canonical UTC Timestamp
              </span>
              <p className="text-sm font-mono font-medium text-slate-300">
                {formattedUtcTime}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                {punch.event_time_utc}
              </p>
            </div>

            {/* Received At UTC */}
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Agent Receipt Timestamp (Server Received At)
              </span>
              <p className="text-sm font-mono font-medium text-slate-300">
                {formattedReceivedAt}
              </p>
            </div>
          </div>

          {/* 3. HARDWARE TERMINAL INFO */}
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-3">
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" /> Biometric Hardware Terminal
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">Device IP Address</span>
                <span className="font-mono font-medium text-white">{punch.device_ip}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Punch Type</span>
                <span className="font-semibold text-emerald-400">{punch.event_type || 'IN'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Machine Log Sequence ID</span>
                <span className="font-mono text-slate-300">{punch.machine_log_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Device Serial Number</span>
                <span className="font-mono text-slate-300">{punch.device_serial_number || 'K90PRO-DEFAULT'}</span>
              </div>
            </div>
          </div>

          {/* 4. RAW JSON PAYLOAD (COLLAPSIBLE) */}
          <div className="border border-slate-800/60 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowPayload(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/30 hover:bg-slate-900/60 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">Raw Device JSON Payload</span>
              </div>
              {showPayload ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {showPayload && (
              <div className="p-4 bg-slate-950 border-t border-slate-800/60 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                <pre>{JSON.stringify(punch.raw_payload || punch, null, 2)}</pre>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#0c0e14] flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-slate-500 truncate max-w-[240px]">ID: {punch.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors border border-slate-700/50"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
}
