'use me';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ScanFace,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord } from '../../types';

interface FaceRecModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export function FaceRecModal({ isOpen, onClose, onSuccess }: FaceRecModalProps) {
  const [stage, setStage] = useState<'scanning' | 'verifying' | 'success'>('scanning');
  const [confidence, setConfidence] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStage('scanning');
      setConfidence(0);
      return;
    }

    // Try starting camera stream
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setCameraError(true);
      }
    }
    startCamera();

    // Auto verify sequence simulation
    const timer1 = setTimeout(() => {
      setStage('verifying');
      let currentConf = 0;
      const interval = setInterval(() => {
        currentConf += 15;
        if (currentConf >= 99.4) {
          currentConf = 99.4;
          clearInterval(interval);
          setConfidence(99.4);
          setStage('success');
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } else {
          setConfidence(parseFloat(currentConf.toFixed(1)));
        }
      }, 100);
    }, 2000);

    return () => {
      clearTimeout(timer1);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    const newRecord: AttendanceRecord = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: 'EMP-1001',
      employeeName: 'Sarah Jenkins',
      employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      department: 'Engineering',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: 'Today',
      method: 'face',
      status: 'present',
      deviceName: 'ZKTeco ProFace X (Main Gate)',
      confidenceScore: 99.4,
      location: 'HQ Floor 4 Gate A',
      verified: true,
    };
    onSuccess(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <ScanFace className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">AI Face Recognition Check-in</h3>
              <span className="text-[11px] text-slate-400">Liveness & 3D Feature Mesh Scanner</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Preview Area */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
          {!cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600"
                alt="Simulated Face"
                className="w-full h-full object-cover filter brightness-75"
              />
            </div>
          )}

          {/* Overlay Face Mesh Box & Scanning Bar */}
          <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
            <div
              className={`relative w-48 h-56 rounded-3xl border-2 transition-all duration-500 flex flex-col justify-between p-3 ${
                stage === 'success'
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_50px_rgba(34,197,94,0.4)]'
                  : stage === 'verifying'
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-blue-500/50 animate-pulse'
              }`}
            >
              {/* Corner Accents */}
              <div className="w-4 h-4 border-t-2 border-l-2 border-blue-400 absolute -top-1 -left-1 rounded-tl-lg" />
              <div className="w-4 h-4 border-t-2 border-r-2 border-blue-400 absolute -top-1 -right-1 rounded-tr-lg" />
              <div className="w-4 h-4 border-b-2 border-l-2 border-blue-400 absolute -bottom-1 -left-1 rounded-bl-lg" />
              <div className="w-4 h-4 border-b-2 border-r-2 border-blue-400 absolute -bottom-1 -right-1 rounded-br-lg" />

              {/* Laser Scanning Line */}
              {stage !== 'success' && (
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#60a5fa] animate-bounce" />
              )}

              {/* Status Pill Inside Frame */}
              <div className="self-center mt-auto px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg">
                {stage === 'success' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 99.4% MATCH VERIFIED
                  </span>
                ) : (
                  <span className="text-blue-300 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-400 animate-spin" /> ALIGN FACE IN FRAME
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-300">
                {stage === 'success'
                  ? 'Verification Complete!'
                  : stage === 'verifying'
                  ? 'Verifying Liveness & Match...'
                  : 'Scanning Face Features...'}
              </span>
              <span className="text-[10px] text-slate-500">ZKTeco ProFace Engine v4.18</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-extrabold text-blue-400">
                {confidence}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stage === 'success' ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${confidence}%` }}
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleFinish}
              disabled={stage !== 'success'}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition shadow-lg ${
                stage === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                  : 'bg-blue-600/50 text-white/50 cursor-not-allowed'
              }`}
            >
              Confirm Check-in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
