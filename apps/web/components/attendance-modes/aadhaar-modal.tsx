'use me';
'use client';

import React, { useState } from 'react';
import { CreditCard, X, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord } from '../../types';

interface AadhaarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export function AadhaarModal({ isOpen, onClose, onSuccess }: AadhaarModalProps) {
  const [aadhaarNo, setAadhaarNo] = useState('XXXX-XXXX-8821');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'input' | 'otp' | 'verified'>('input');

  if (!isOpen) return null;

  const requestOtp = () => {
    setStage('otp');
  };

  const verifyOtp = () => {
    setStage('verified');
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handleFinish = () => {
    const newRecord: AttendanceRecord = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: 'EMP-1005',
      employeeName: 'Aanya Patel',
      employeeAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      department: 'Human Resources',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: 'Today',
      method: 'aadhaar',
      status: 'present',
      deviceName: 'Mantra L1 RD Service Terminal',
      confidenceScore: 98.6,
      location: 'HQ Reception Counter 2',
      verified: true,
    };
    onSuccess(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* UIDAI Style Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">UIDAI Aadhaar RD Service</h3>
              <span className="text-[11px] text-slate-400">Official Government Verified Gate Pass</span>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 bg-slate-950/40">
          {stage === 'input' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Masked Aadhaar Number (12 Digit UID)
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-slate-200">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <input
                    type="text"
                    value={aadhaarNo}
                    onChange={(e) => setAadhaarNo(e.target.value)}
                    className="bg-transparent border-none outline-none flex-1 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={requestOtp}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg"
              >
                Send Aadhaar OTP / Scan Iris
              </button>
            </div>
          )}

          {stage === 'otp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">
                  Enter 6-Digit UIDAI OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="884 921"
                  className="w-full text-center px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-lg font-mono text-emerald-400 outline-none"
                />
              </div>

              <button
                onClick={verifyOtp}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition shadow-lg"
              >
                Authenticate with UIDAI Server
              </button>
            </div>
          )}

          {stage === 'verified' && (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
              <span className="text-base font-bold text-emerald-300">Aadhaar HMAC Signature Verified</span>
              <p className="text-xs text-slate-400">Government Badge Issued for Aanya Patel (EMP-1005)</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">Mantra RD Service L1 Certified</span>
          <button
            onClick={handleFinish}
            disabled={stage !== 'verified'}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              stage === 'verified'
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
