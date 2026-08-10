'use me';
'use client';

import React, { useState } from 'react';
import { MapPin, X, Navigation, CheckCircle2, ShieldCheck, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AttendanceRecord } from '../../types';

interface GpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export function GpsModal({ isOpen, onClose, onSuccess }: GpsModalProps) {
  const [distance, setDistance] = useState(14); // 14m inside 50m radius
  const [isVerified, setIsVerified] = useState(false);

  if (!isOpen) return null;

  const checkGeofence = () => {
    setIsVerified(true);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  };

  const handleFinish = () => {
    const newRecord: AttendanceRecord = {
      id: `LOG-${Math.floor(10000 + Math.random() * 90000)}`,
      employeeId: 'EMP-1006',
      employeeName: 'David Vance',
      employeeAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      department: 'Finance',
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: 'Today',
      method: 'gps',
      status: 'present',
      deviceName: 'AgencyOS Mobile App (iOS Geofence)',
      confidenceScore: 99.1,
      location: `HQ Geofence (${distance}m from center)`,
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
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-slate-100">GPS Mobile Geofence</h3>
              <span className="text-[11px] text-slate-400">Office Radius Boundary: 50 Meters</span>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Visualization Simulation */}
        <div className="p-6 bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center aspect-square">
          {/* Radar Geofence Circles */}
          <div className="relative w-64 h-64 rounded-full border-2 border-cyan-500/30 bg-cyan-500/5 flex items-center justify-center animate-pulse">
            <div className="w-44 h-44 rounded-full border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border border-cyan-400/60 bg-cyan-400/20 flex items-center justify-center">
                {/* Office Pin */}
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-cyan-500/50">
                  <Navigation className="w-4 h-4 fill-slate-950" />
                </div>
              </div>
            </div>

            {/* Current Position Pin */}
            <div className="absolute top-16 right-16 flex items-center gap-1 bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded-full text-[10px] shadow-lg animate-bounce">
              <MapPin className="w-3 h-3 fill-slate-950" />
              <span>You ({distance}m)</span>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-center space-y-1 w-full">
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-semibold">
              <Compass className="w-4 h-4" />
              <span>Lat: 37.7749° N, Lon: 122.4194° W</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Inside Defined Boundary • High Accuracy (±2.1m)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-3">
          {!isVerified ? (
            <button
              onClick={checkGeofence}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg"
            >
              Verify Location Coordinates
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-300">
                Cancel
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg"
              >
                Confirm Geofence Check-in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
