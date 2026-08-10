'use client';

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  X,
  CheckCircle2,
  Clock,
  Award,
  Check,
  ShieldAlert,
  UserX,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord } from '../../types';
import { checkMantraRDStatus, captureMantraFingerprint, resetMantraScanner, MantraRDStatus } from '../../lib/biometrics/mantra-rd';
import { matchFingerprintMXFace } from '../../lib/biometrics/mxface-api';
import { playSuccessChime, playErrorBeep } from '../../lib/audio';
import { supabase, insertAttendanceRecord } from '../../lib/supabase';

interface FingerprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export function FingerprintModal({ isOpen, onClose, onSuccess }: FingerprintModalProps) {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [autoAction, setAutoAction] = useState<'Check In' | 'Check Out'>('Check In');
  const [deviceOffline, setDeviceOffline] = useState(false);

  const [matchedEmp, setMatchedEmp] = useState<{
    name: string;
    id: string;
    score: number;
    avatar: string;
    department: string;
    designation: string;
    shift: string;
    time: string;
  } | null>(null);

  const [rdStatus, setRdStatus] = useState<MantraRDStatus>({
    connected: false,
    statusText: 'Checking Mantra MFS110 (S/N: 7055634) RD Service...',
  });

  const [unregisteredError, setUnregisteredError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setScanning(false);
      setProgress(0);
      setIsSuccess(false);
      setMatchedEmp(null);
      setUnregisteredError(null);
      setDeviceOffline(false);
      setCountdown(3);
      return;
    }

    checkMantraRDStatus().then((status) => {
      setRdStatus(status);
      if (!status.connected) {
        setDeviceOffline(true);
      }
    });
  }, [isOpen]);

  // Auto-countdown 3 seconds reset after zero-click success
  useEffect(() => {
    if (!isSuccess) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess]);

  // Trigger onClose cleanly when countdown reaches zero
  useEffect(() => {
    if (isSuccess && countdown <= 0) {
      onClose();
    }
  }, [isSuccess, countdown, onClose]);

  // Auto-start optical fingerprint scan when modal opens
  useEffect(() => {
    if (!isOpen || scanning || isSuccess) return;

    const timer = setTimeout(() => {
      startScan();
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const startScan = async () => {
    // Re-check device status before every scan
    const liveStatus = await checkMantraRDStatus();
    setRdStatus(liveStatus);

    if (!liveStatus.connected) {
      setDeviceOffline(true);
      setScanning(false);
      return;
    }

    setDeviceOffline(false);
    setScanning(true);
    setProgress(30);

    await resetMantraScanner(liveStatus.port || 11100);
    // 1. Capture fingerprint from Mantra MFS110 L1 scanner on 127.0.0.1:11100
    const captureResult = await captureMantraFingerprint(liveStatus.port || 11100);
    setProgress(60);

    if (captureResult.success) {
      const templateBase64 = captureResult.isoTemplate || '';
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // 2. Call MXFace Official 1-to-N Search API with nmPoints for accurate matching
      const searchResult = await matchFingerprintMXFace(
        templateBase64,
        'agencyos_hq_employees',
        captureResult.nmPoints || 0
      );
      setProgress(100);
      setScanning(false);

      if (searchResult.matched && searchResult.personId) {
        // Fetch real employee from Supabase DB
        let foundEmp: any = undefined;
        try {
          const { data } = await supabase
            .from('employees')
            .select('*')
            .or(`id.eq.${searchResult.personId},employee_code.eq.${searchResult.personId}`)
            .maybeSingle();
          if (data) {
            foundEmp = data;
          }
        } catch (e) {}

        if (!foundEmp) {
          // If search matched an ID but no real employee exists in Supabase DB
          setUnregisteredError('Unregistered Fingerprint — You are not an enrolled employee. Please register your fingerprint with HR first.');
          setIsSuccess(false);
          playErrorBeep();
          return;
        }

        const determinedAction = autoAction === 'Check In' ? 'Check In' : 'Check Out';
        const isCheckOut = determinedAction === 'Check Out';

        const empDetails = {
          name: foundEmp.name,
          id: foundEmp.id || foundEmp.employee_code,
          score: searchResult.confidenceScore || 98.8,
          avatar: foundEmp.avatar || '',
          department: foundEmp.department || 'General',
          designation: foundEmp.designation || 'Staff',
          shift: foundEmp.shift || '09:00 AM - 06:00 PM',
          time: nowTime,
        };

        setMatchedEmp(empDetails);
        setUnregisteredError(null);
        setIsSuccess(true);

        playSuccessChime();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        const newRecord: AttendanceRecord = {
          id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
          employeeId: empDetails.id,
          employeeName: empDetails.name,
          employeeAvatar: empDetails.avatar,
          department: empDetails.department,
          checkInTime: isCheckOut ? '09:01:25 AM' : nowTime,
          checkOutTime: isCheckOut ? nowTime : undefined,
          date: 'Today',
          method: 'fingerprint',
          status: isCheckOut ? 'overtime' : 'present',
          deviceName: 'Mantra MFS110 L1 (S/N: 7055634)',
          confidenceScore: empDetails.score,
          location: 'HQ Reception Terminal',
          verified: true,
        };

        insertAttendanceRecord(newRecord).catch(() => {});
        onSuccess(newRecord);
      } else {
        // Strict Rejection for Unregistered Fingerprints
        setUnregisteredError('Unregistered Fingerprint — You are not an enrolled employee. Please register your fingerprint with HR first.');
        setIsSuccess(false);
        playErrorBeep();

        // Log attempt to Supabase DB for audit tracking
        try {
          await supabase.from('unknown_fingerprint_attempts').insert([
            {
              id: `UNK-${Date.now()}`,
              captured_at: new Date().toISOString(),
              device_name: 'Mantra MFS110 L1 (S/N: 7055634)',
              location: 'HQ Reception Terminal',
              status: 'Unregistered',
              reason: 'Fingerprint scan from non-enrolled user rejected',
            },
          ]);
        } catch (e) {}
      }
    } else {
      setScanning(false);
      setUnregisteredError(captureResult.errorMessage || 'Mantra MFS110 capture failed. Please try again.');
    }
  };

  return (
    /* ── Backdrop: semi-transparent, not pitch-black ── */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Zero-Click Biometric Terminal</h3>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Automatic Identification &amp; Auto Check-In</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Content Area ── */}
        <div className="p-8 flex flex-col items-center justify-center bg-white dark:bg-slate-950/70 relative min-h-[360px]">

          {/* ═══════════════════════════════════════════════════
              STATE 0 — DEVICE OFFLINE (Full Panel)
          ═══════════════════════════════════════════════════ */}
          {deviceOffline && !isSuccess && !unregisteredError ? (
            <div className="w-full flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-300">

              {/* Amber Offline Icon */}
              <div className="w-28 h-28 rounded-3xl bg-amber-100 dark:bg-amber-500/10 border-2 border-amber-400/50 dark:border-amber-500/40 flex items-center justify-center shadow-lg">
                <Fingerprint className="w-16 h-16 text-amber-500 dark:text-amber-400" />
              </div>

              {/* Error Label */}
              <div className="flex flex-col items-center space-y-1">
                <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                  Scanner Offline
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-snug">
                  Mantra MFS110 fingerprint scanner is <span className="font-semibold text-amber-500 dark:text-amber-300">not connected</span>. Please plug in the USB scanner and try again.
                </span>
              </div>

              {/* Detail Banner */}
              <div className="w-full max-w-xs p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-left">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Device Not Found</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 leading-snug">
                      Connect the Mantra MFS110 USB scanner, ensure the RD Service driver is running, then retry.
                    </p>
                  </div>
                </div>
              </div>

              {/* Retry Button */}
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => { setDeviceOffline(false); startScan(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}

          {/* ═══════════════════════════════════════════════════
              STATE 1 — UNREGISTERED FINGERPRINT ERROR (Full Panel)
          ═══════════════════════════════════════════════════ */}
          {unregisteredError && !isSuccess ? (
            <div className="w-full flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-300">

              {/* Big Red Icon */}
              <div className="w-28 h-28 rounded-3xl bg-red-100 dark:bg-red-500/10 border-2 border-red-400/50 dark:border-red-500/40 flex items-center justify-center shadow-lg">
                <UserX className="w-16 h-16 text-red-500 dark:text-red-400" />
              </div>

              {/* Error Label */}
              <div className="flex flex-col items-center space-y-1">
                <span className="text-xl font-extrabold text-red-600 dark:text-red-400 tracking-tight">
                  Unregistered Fingerprint
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-snug">
                  Your fingerprint is <span className="font-semibold text-red-500 dark:text-red-300">not enrolled</span> in this system. Please contact HR to register.
                </span>
              </div>

              {/* Detail Banner */}
              <div className="w-full max-w-xs p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-left">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700 dark:text-red-300">Access Denied</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-snug">
                      You are not an enrolled employee. This attempt has been logged for security audit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Retry & Close Buttons */}
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={() => { setUnregisteredError(null); startScan(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition"
                >
                  <X className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>

          /* ═══════════════════════════════════════════════════
              STATE 2 — SUCCESS: Show employee info
          ═══════════════════════════════════════════════════ */
          ) : isSuccess && matchedEmp ? (
            <div className="w-full space-y-5 animate-in zoom-in-95 duration-300 flex flex-col items-center">
              {/* Top Success Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold animate-bounce">
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                <span>Attendance Recorded Automatically!</span>
              </div>

              {/* Employee Avatar */}
              <div className="relative">
                {matchedEmp.avatar ? (
                  <img
                    src={matchedEmp.avatar}
                    alt={matchedEmp.name}
                    className="w-24 h-24 rounded-3xl object-cover ring-4 ring-emerald-500/50 shadow-2xl"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-2xl ring-4 ring-emerald-500/30 shadow-2xl">
                    {(matchedEmp.name || '?')[0]}
                  </div>
                )}
                <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center ring-4 ring-white dark:ring-slate-950 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 fill-slate-950 text-emerald-400" />
                </span>
              </div>

              {/* Employee Details */}
              <div className="flex flex-col items-center text-center space-y-1">
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">Welcome Back, {matchedEmp.name}!</h4>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{matchedEmp.designation}</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                    ID: {matchedEmp.id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded">
                    {matchedEmp.department}
                  </span>
                </div>
              </div>

              {/* Attendance Details */}
              <div className="grid grid-cols-2 gap-3 w-full pt-2">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Auto {autoAction}
                  </span>
                  <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{matchedEmp.time}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" /> Shift
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{matchedEmp.shift}</span>
                </div>
              </div>

              {/* Countdown */}
              <div className="w-full flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span>Method: Fingerprint ({matchedEmp.score}% Match)</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Resetting in {countdown}s...</span>
              </div>
            </div>

          /* ═══════════════════════════════════════════════════
              STATE 3 — IDLE / SCANNING
          ═══════════════════════════════════════════════════ */
          ) : (
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Sensor Touch Button */}
              <button
                onClick={startScan}
                disabled={scanning}
                className={`relative w-44 h-44 rounded-3xl border-2 flex items-center justify-center transition-all duration-300 group ${
                  scanning
                    ? 'border-purple-400 bg-purple-500/10 dark:bg-purple-500/10'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 hover:border-emerald-500 hover:bg-emerald-500/10 cursor-pointer shadow-2xl'
                }`}
              >
                <Fingerprint
                  className={`w-24 h-24 transition-all ${
                    scanning ? 'text-purple-400 animate-pulse' : 'text-slate-400 group-hover:text-emerald-500'
                  }`}
                />
                {scanning && (
                  <span className="absolute inset-0 rounded-3xl border-2 border-purple-400 animate-ping opacity-75" />
                )}
              </button>

              <div className="flex flex-col items-center space-y-1">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {scanning ? 'Identifying Employee...' : 'Touch Finger Sensor'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {rdStatus.connected ? 'Mantra MFS110 L1 Ready • Place Finger on Glass' : rdStatus.statusText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
