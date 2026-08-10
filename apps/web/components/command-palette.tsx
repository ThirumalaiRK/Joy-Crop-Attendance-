'use me';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Fingerprint,
  Radio,
  Users,
  MonitorSmartphone,
  MapPin,
  Sparkles,
  UserCheck,
  FileBarChart2,
  Settings,
  X,
  ChevronRight,
  ShieldCheck,
  QrCode,
  ScanFace,
  CreditCard,
} from 'lucide-react';
import { NavTab } from './sidebar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: NavTab) => void;
  openKiosk: () => void;
  openAiAssistant: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  setActiveTab,
  openKiosk,
  openAiAssistant,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else openPalette();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const openPalette = () => {
    // Open action logic trigger
  };

  if (!isOpen) return null;

  const actions = [
    { label: 'Launch Face Recognition Check-in', category: 'Biometric Mode', icon: ScanFace, action: () => { setActiveTab('checkin-modes'); onClose(); } },
    { label: 'Launch Fingerprint Verification', category: 'Biometric Mode', icon: Fingerprint, action: () => { setActiveTab('checkin-modes'); onClose(); } },
    { label: 'Open Aadhaar RD Verification', category: 'Biometric Mode', icon: CreditCard, action: () => { setActiveTab('checkin-modes'); onClose(); } },
    { label: 'Show QR Code Pass Scanner', category: 'Biometric Mode', icon: QrCode, action: () => { setActiveTab('checkin-modes'); onClose(); } },
    { label: 'Check-in via GPS Geofence', category: 'Biometric Mode', icon: MapPin, action: () => { setActiveTab('checkin-modes'); onClose(); } },
    { label: 'Open Real-time Live Stream Feed', category: 'Navigation', icon: Radio, action: () => { setActiveTab('live-attendance'); onClose(); } },
    { label: 'View Interactive Live Floor Map', category: 'Navigation', icon: MapPin, action: () => { setActiveTab('floor-map'); onClose(); } },
    { label: 'Ask AI Copilot for HR Insights', category: 'AI', icon: Sparkles, action: () => { openAiAssistant(); onClose(); } },
    { label: 'Manage Biometric Devices (ZKTeco / Suprema)', category: 'Hardware', icon: MonitorSmartphone, action: () => { setActiveTab('devices'); onClose(); } },
    { label: 'Enroll New Employee Biometrics', category: 'Enrollment', icon: Users, action: () => { setActiveTab('enrollment'); onClose(); } },
    { label: 'Generate Attendance PDF & CSV Reports', category: 'Reports', icon: FileBarChart2, action: () => { setActiveTab('reports'); onClose(); } },
  ];

  const filteredActions = actions.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, employee name, or biometric action..."
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching actions found. Try typing 'Face', 'Device', or 'Report'.
            </div>
          ) : (
            filteredActions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs hover:bg-blue-600/15 hover:border hover:border-blue-500/30 text-slate-300 hover:text-white transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-blue-600/30 text-slate-300 group-hover:text-blue-400 transition">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-200 group-hover:text-blue-300">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.category}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">↑↓</span>
            <span>Navigate</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] ml-2">↵</span>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>AgencyOS Command Engine v4.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
