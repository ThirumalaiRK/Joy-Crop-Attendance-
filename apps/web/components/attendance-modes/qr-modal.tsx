'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, X, RefreshCw, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord } from '../../types';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export function QrModal({ isOpen, onClose, onSuccess }: QrModalProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isScanned, setIsScanned] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(30);
      setIsScanned(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const simulateScan = () => {
    setIsScanned(true);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handleFinish = () => {
    const newRecord: AttendanceRecord = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: 'EMP-1002',
      employeeName: 'Vikramaditya Sharma',
      employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      department: 'Product & Design',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: 'Today',
      method: 'qr',
      status: 'present',
      deviceName: 'AgencyOS Mobile Scanner Kiosk',
      confidenceScore: 100,
      location: 'HQ West Entrance',
      verified: true,
    };
    onSuccess(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">Dynamic One-Time QR Pass</h3>
              <span className="text-[11px] text-slate-400">Anti-screenshot rotating security QR</span>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic QR Canvas */}
        <div className="p-8 flex flex-col items-center justify-center bg-slate-950/60 space-y-4">
          <div
            onClick={simulateScan}
            className={`p-6 rounded-3xl bg-white border-4 transition-all duration-300 cursor-pointer shadow-2xl flex flex-col items-center justify-center ${
              isScanned ? 'border-emerald-500 ring-4 ring-emerald-500/40' : 'border-slate-800 hover:scale-105'
            }`}
          >
            {/* SVG QR Code Simulation */}
            <div className="w-48 h-48 bg-slate-900 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-12 h-12 border-4 border-amber-400 bg-amber-400/20 rounded-md" />
                <div className="w-12 h-12 border-4 border-amber-400 bg-amber-400/20 rounded-md" />
              </div>
              <div className="flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="w-12 h-12 border-4 border-amber-400 bg-amber-400/20 rounded-md" />
                <div className="w-12 h-12 bg-amber-400 rounded-md" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Refreshes in {timeLeft}s</span>
          </div>

          <span className="text-xs text-slate-400 text-center">
            {isScanned ? 'QR Code Scanned & Verified!' : 'Click QR code above to simulate Kiosk Scan'}
          </span>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300">
            Cancel
          </button>
          <button
            onClick={handleFinish}
            disabled={!isScanned}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              isScanned
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Confirm Check-in
          </button>
        </div>
      </div>
    </div>
  );
}
