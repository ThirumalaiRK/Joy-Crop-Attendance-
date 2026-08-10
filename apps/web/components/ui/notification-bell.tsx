'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Fingerprint,
  Cpu,
} from 'lucide-react';
import {
  AppNotification,
  fetchNotificationsFromSupabase,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../../lib/notifications/notification-engine';
import { clsx } from 'clsx';

interface NotificationBellProps {
  recipientId: string;
}

function getCategoryIcon(category: AppNotification['category']) {
  switch (category) {
    case 'ATTENDANCE': return Fingerprint;
    case 'WORKFLOW': return CheckCircle2;
    case 'LEAVE': return Clock;
    case 'SUPPORT': return HelpCircle;
    case 'DEVICE': return Cpu;
    default: return Bell;
  }
}

function getPriorityColor(priority: AppNotification['priority']) {
  switch (priority) {
    case 'URGENT': return 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    case 'HIGH': return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'MEDIUM': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
    default: return 'text-slate-400 border-slate-700 bg-slate-900';
  }
}

/**
 * NotificationBell — Enterprise realtime notification dropdown.
 * Subscribes to Supabase notifications table in realtime.
 * Marks notifications as read on open.
 * Plays browser Audio API chime when new HIGH/URGENT notification arrives.
 */
export function NotificationBell({ recipientId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  const load = async () => {
    const notifs = await fetchNotificationsFromSupabase(recipientId, 30);
    const unread = notifs.filter((n) => !n.isRead).length;

    // Play chime if new unread notifications arrived
    if (unread > prevCountRef.current) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } catch {}
    }

    prevCountRef.current = unread;
    setNotifications(notifs);
    setUnreadCount(unread);
  };

  useEffect(() => {
    load();
    const unsub = subscribeToNotifications(recipientId, () => load());

    // Close on outside click
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);

    return () => {
      unsub();
      document.removeEventListener('mousedown', handleClick);
    };
  }, [recipientId]);

  const handleOpen = async () => {
    setIsOpen((prev) => !prev);
    if (!isOpen && unreadCount > 0) {
      await markAllNotificationsRead(recipientId);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center px-1 animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block">NOTIFICATION CENTER</span>
              <h3 className="text-sm font-black text-white">
                {unreadCount === 0 ? 'All caught up' : `${unreadCount} new notifications`}
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <CheckCheck className="w-8 h-8 text-slate-700" />
                <span className="text-xs font-mono">No notifications yet</span>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = getCategoryIcon(notif.category);
                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      'flex items-start gap-3 px-5 py-3.5 border-b border-slate-800/60 hover:bg-slate-900/80 transition cursor-pointer',
                      !notif.isRead && 'bg-slate-900/40'
                    )}
                  >
                    <div className={clsx('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5', getPriorityColor(notif.priority))}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={clsx('text-xs font-bold leading-tight', notif.isRead ? 'text-slate-300' : 'text-white')}>
                          {notif.title}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono shrink-0">{timeAgo(notif.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans line-clamp-2">{notif.body}</p>
                      {!notif.isRead && (
                        <span className="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 font-mono">JRM HRMS Notification Center</span>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await markAllNotificationsRead(recipientId);
                  setUnreadCount(0);
                  setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                }}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition font-mono"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
