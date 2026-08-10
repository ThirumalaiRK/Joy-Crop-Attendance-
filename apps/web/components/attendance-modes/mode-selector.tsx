'use me';
'use client';

import React from 'react';
import {
  ScanFace,
  Fingerprint,
  CreditCard,
  QrCode,
  MapPin,
  Smartphone,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type ActiveMode = 'face' | 'fingerprint' | 'aadhaar' | 'qr' | 'gps' | 'selfie_gps' | 'manual' | null;

interface ModeSelectorProps {
  onSelectMode: (mode: ActiveMode) => void;
}

export function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const modes = [
    {
      id: 'face' as ActiveMode,
      title: 'Face Recognition AI',
      subtitle: 'Real-time Camera Liveness & AI Match',
      description: 'Zero-touch optical face recognition with 99.7% liveness detection. Auto-capture in 1.2s.',
      icon: ScanFace,
      gradient: 'from-blue-600 to-indigo-600 text-white shadow-blue-500/20',
      badge: 'RECOMMENDED',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      specs: ['3D Liveness Detection', '99.7% Confidence', '< 1.2s Capture'],
    },
    {
      id: 'fingerprint' as ActiveMode,
      title: 'Fingerprint Biometric',
      subtitle: 'Capacitive / Optical Sensor Match',
      description: 'High-speed ridge pattern extraction compatible with ZKTeco, Suprema & Matrix hardware.',
      icon: Fingerprint,
      gradient: 'from-purple-600 to-indigo-600 text-white shadow-purple-500/20',
      badge: 'HARDWARE SDK',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      specs: ['FIPS 201 Compliant', '500 DPI Resolution', 'Sub-second Sync'],
    },
    {
      id: 'aadhaar' as ActiveMode,
      title: 'Aadhaar Authentication',
      subtitle: 'UIDAI Government Verified (India)',
      description: 'Official UIDAI RD Service integration supporting biometric & OTP identification.',
      icon: CreditCard,
      gradient: 'from-emerald-600 to-teal-600 text-white shadow-emerald-500/20',
      badge: 'UIDAI APPROVED',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      specs: ['L1 Registered Device', 'HMAC SHA-256 Encrypted', 'Govt Verified'],
    },
    {
      id: 'qr' as ActiveMode,
      title: 'Dynamic QR Attendance',
      subtitle: 'Anti-spoof One-Time Pass',
      description: 'Rotating dynamic QR pass generated on employee mobile with 30s auto-expiry timer.',
      icon: QrCode,
      gradient: 'from-amber-600 to-orange-600 text-white shadow-amber-500/20',
      badge: 'TEMPORARY PASS',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      specs: ['30s Expiry Timer', 'Anti-screenshot Tech', 'Offline Scanning'],
    },
    {
      id: 'gps' as ActiveMode,
      title: 'GPS Geofence Attendance',
      subtitle: 'Live Map & Geofence Circle',
      description: 'Verifies employee coordinates against defined 50m office boundary radius.',
      icon: MapPin,
      gradient: 'from-cyan-600 to-blue-600 text-white shadow-cyan-500/20',
      badge: 'MOBILE GEOFENCE',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      specs: ['50m Precision Radius', 'High Accuracy GPS', 'Remote WFH Ready'],
    },
    {
      id: 'selfie_gps' as ActiveMode,
      title: 'Selfie + GPS Verification',
      subtitle: 'Dual Verification for Field Force',
      description: 'Combines real-time front camera selfie with GPS location & device hardware ID.',
      icon: Smartphone,
      gradient: 'from-pink-600 to-rose-600 text-white shadow-pink-500/20',
      badge: 'FIELD FORCE',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      specs: ['Dual Factor Auth', 'Timestamp Watermark', 'Device ID Stamp'],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Multi-Modal Biometric Attendance Engines
            </h2>
            <p className="text-xs text-slate-400">
              Select an authentication mode to test interactive check-in flow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Supports Face, Fingerprint, Aadhaar & GPS</span>
        </div>
      </div>

      {/* Grid of 6 Luxury Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-blue-500/50 transition-all duration-300 shadow-xl flex flex-col justify-between cursor-pointer group hover:-translate-y-1 relative overflow-hidden"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full border ${mode.badgeColor}`}>
                    {mode.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition">
                  {mode.title}
                </h3>
                <span className="text-xs font-semibold text-blue-400 block mb-2">{mode.subtitle}</span>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{mode.description}</p>
              </div>

              {/* Specs Chips & CTA */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {mode.specs.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[10px] bg-slate-800/80 text-slate-400 rounded-md font-mono"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <button className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-800 group-hover:bg-blue-600 text-xs font-semibold text-slate-200 group-hover:text-white transition">
                  <span>Start Check-in Verification</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
