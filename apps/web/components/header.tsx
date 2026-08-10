'use me';
'use client';

import React from 'react';
import {
  Search,
  Command,
  Bell,
  Sparkles,
  MonitorSmartphone,
  MapPin,
  Wifi,
  ChevronDown,
  Sun,
  Moon,
  User,
  ShieldCheck,
  Zap,
  UserPlus,
} from 'lucide-react';
import { NotificationBell } from './ui/notification-bell';

interface HeaderProps {
  openCommandPalette: () => void;
  openAiAssistant: () => void;
  openKiosk: () => void;
  openEnrollment?: () => void;
  onOpenAdminProfile?: () => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  unreadNotifications: number;
}

export function Header({
  openCommandPalette,
  openAiAssistant,
  openKiosk,
  openEnrollment,
  onOpenAdminProfile,
  darkMode,
  setDarkMode,
  selectedLocation,
  setSelectedLocation,
  unreadNotifications,
}: HeaderProps) {
  const locations = [
    'Global HQ - Floor 4 & 5',
    'Bangalore Tech Park (India)',
    'San Francisco Hub (USA)',
    'London Innovation Lab',
  ];

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-6 bg-slate-900/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 text-slate-200">
      {/* Search & Location Bar */}
      <div className="flex items-center gap-4">
        {/* Cmd+K Search Trigger Button */}
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs transition min-w-[240px] shadow-inner group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition-colors" />
          <span className="flex-1 text-left">Search employee, device, log...</span>
          <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-900/90 border border-slate-700/80 rounded">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Location Dropdown Selector */}
        <div className="relative hidden md:flex items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-transparent border-none outline-none font-medium cursor-pointer text-slate-200"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc} className="bg-slate-900 text-slate-200">
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Sync Status Indicator Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <Wifi className="w-3 h-3" />
          <span>Biometric Mesh Live (0.4ms)</span>
        </div>
      </div>

      {/* Action Icons & User Profile */}
      <div className="flex items-center gap-3">
        {/* + Add Employee Button */}
        {openEnrollment && (
          <button
            onClick={openEnrollment}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Employee</span>
          </button>
        )}

        {/* AI Copilot Button */}
        <button
          onClick={openAiAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-medium transition shadow-lg shadow-purple-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Realtime Notification Bell */}
        <NotificationBell recipientId="SUPER-ADMIN" />

        {/* Dark/Light Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
        </button>

        {/* Super Admin Portal Link */}
        <a
          href="/admin"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition text-xs font-semibold"
          title="Open Super Admin Control Center"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Super Admin
        </a>

        {/* User Profile Avatar (Clickable to open Super Admin Profile) */}

        <button
          onClick={onOpenAdminProfile}
          className="flex items-center gap-2 pl-2 border-l border-slate-800/80 hover:opacity-80 transition cursor-pointer text-left"
          title="Click to view Super Admin Profile"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center ring-2 ring-blue-500/40">
              <span className="text-white text-xs font-bold">SA</span>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-none">Super Admin</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Administrator</span>
          </div>
        </button>
      </div>
    </header>
  );
}
