'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Radio, UserCheck, UserX, Clock, Fingerprint, Coffee,
  Utensils, AlertTriangle, Cpu, Wifi, RefreshCw, Sparkles,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { eventBus, EnterpriseEvent, EnterpriseEventType } from '../../../lib/events/event-bus';
import { clsx } from 'clsx';

interface FeedItem {
  id: string;
  type: EnterpriseEventType | 'DB_RECORD';
  message: string;
  detail: string;
  time: string;
  isoTime: string;
  color: string;
  dotColor: string;
  icon: any;
  isNew?: boolean;
}

function formatFeedTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function eventToFeedItem(evt: EnterpriseEvent): FeedItem {
  const p = evt.payload || {};
  const empName = evt.senderName || p.employee_name || p.employeeName || 'Unknown';
  const dept = evt.department || p.department || 'Staff';
  const method = p.method || p.mode || 'Fingerprint';
  const device = p.device || p.device_name || 'Mantra MFS110';
  const isoTime = evt.timestamp;

  const map: Record<string, { msg: string; detail: string; color: string; dot: string; icon: any }> = {
    ATTENDANCE_CHECK_IN: {
      msg: `${empName} checked in`,
      detail: `${dept} · ${method} · ${device}`,
      color: 'text-emerald-400', dot: 'bg-emerald-400', icon: UserCheck,
    },
    ATTENDANCE_CHECK_OUT: {
      msg: `${empName} checked out`,
      detail: `${dept} · ${method} · ${device}`,
      color: 'text-slate-400', dot: 'bg-slate-400', icon: UserX,
    },
    BREAK_START: {
      msg: `${empName} started a break`,
      detail: `${dept} · Tea Break · ${formatFeedTime(isoTime)}`,
      color: 'text-amber-400', dot: 'bg-amber-400', icon: Coffee,
    },
    BREAK_END: {
      msg: `${empName} returned from break`,
      detail: `${dept} · Back at desk`,
      color: 'text-amber-300', dot: 'bg-amber-300', icon: Coffee,
    },
    LUNCH_START: {
      msg: `${empName} went for lunch`,
      detail: `${dept} · Lunch Break`,
      color: 'text-orange-400', dot: 'bg-orange-400', icon: Utensils,
    },
    LUNCH_END: {
      msg: `${empName} returned from lunch`,
      detail: `${dept} · Back at desk`,
      color: 'text-orange-300', dot: 'bg-orange-300', icon: Utensils,
    },
    WORKFLOW_SUBMITTED: {
      msg: `${empName} submitted correction request`,
      detail: `${p.request_type || 'Attendance Correction'} · Pending manager review`,
      color: 'text-purple-400', dot: 'bg-purple-400', icon: AlertTriangle,
    },
    WORKFLOW_APPROVED: {
      msg: `Correction approved for ${empName}`,
      detail: `${p.approval_status || 'APPROVED'} · Applied to attendance`,
      color: 'text-emerald-400', dot: 'bg-emerald-400', icon: Sparkles,
    },
    WORKFLOW_REJECTED: {
      msg: `Correction rejected for ${empName}`,
      detail: `Notified employee`,
      color: 'text-rose-400', dot: 'bg-rose-400', icon: AlertTriangle,
    },
    DEVICE_ONLINE: {
      msg: `Biometric device came online`,
      detail: `${device} · Heartbeat received`,
      color: 'text-cyan-400', dot: 'bg-cyan-400', icon: Wifi,
    },
    DEVICE_OFFLINE: {
      msg: `Biometric device went offline`,
      detail: `${device} · No heartbeat`,
      color: 'text-rose-400', dot: 'bg-rose-400', icon: Cpu,
    },
    EMPLOYEE_CREATED: {
      msg: `New employee enrolled: ${empName}`,
      detail: `${dept} · Fingerprint registered`,
      color: 'text-violet-400', dot: 'bg-violet-400', icon: Fingerprint,
    },
    EMPLOYEE_UPDATED: {
      msg: `Employee profile updated: ${empName}`,
      detail: `${dept} · Record sync`,
      color: 'text-blue-400', dot: 'bg-blue-400', icon: Fingerprint,
    },
  };

  const cfg = map[evt.type] || {
    msg: `Event: ${evt.type}`,
    detail: JSON.stringify(p).slice(0, 60),
    color: 'text-slate-300', dot: 'bg-slate-400', icon: Radio,
  };

  return {
    id: evt.id,
    type: evt.type,
    message: cfg.msg,
    detail: cfg.detail,
    time: formatFeedTime(isoTime),
    isoTime,
    color: cfg.color,
    dotColor: cfg.dot,
    icon: cfg.icon,
    isNew: true,
  };
}

function dbRowToFeedItem(row: any): FeedItem {
  const empName = row.employee_name || 'Unknown';
  const dept = row.department || 'Staff';
  const isOut = !!(row.check_out_time && row.check_out_time !== '—' && row.check_out_time !== '-');
  const isoTime = row.created_at || new Date().toISOString();
  const displayTime = isOut ? row.check_out_time : (row.check_in_time || formatFeedTime(isoTime));
  return {
    id: `db-${row.id}`,
    type: 'DB_RECORD',
    message: isOut ? `${empName} checked out` : `${empName} checked in`,
    detail: `${dept} · ${row.method || 'fingerprint'} · ${row.device_name?.split('(')[0]?.trim() || 'Device'}`,
    time: displayTime,
    isoTime,
    color: isOut ? 'text-slate-400' : 'text-emerald-400',
    dotColor: isOut ? 'bg-slate-400' : 'bg-emerald-400',
    icon: isOut ? UserX : UserCheck,
    isNew: false,
  };
}

const MAX_FEED = 50;

export function LiveActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const feedRef = useRef<FeedItem[]>([]);
  const [tick, setTick] = useState(0); // force re-render for timeAgo

  const prependItem = (item: FeedItem) => {
    feedRef.current = [item, ...feedRef.current].slice(0, MAX_FEED);
    setFeed([...feedRef.current]);
    setLiveCount((c) => c + 1);

    // Clear "isNew" glow after 3 seconds
    setTimeout(() => {
      feedRef.current = feedRef.current.map((f) =>
        f.id === item.id ? { ...f, isNew: false } : f
      );
      setFeed([...feedRef.current]);
    }, 3000);
  };

  // Load initial DB records
  const loadInitial = async () => {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);

    const items = (data || []).map(dbRowToFeedItem);
    feedRef.current = items;
    setFeed(items);
    setLoading(false);
  };

  useEffect(() => {
    loadInitial();

    // Subscribe to ALL enterprise event bus events
    const unsubAll = eventBus.subscribe('*', (evt: EnterpriseEvent) => {
      prependItem(eventToFeedItem(evt));
    });

    // Also subscribe directly to Supabase for DB inserts not going through event bus
    const ch = supabase.channel('live-feed-direct')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_records' }, (p) => {
        prependItem(dbRowToFeedItem(p.new));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'employees' }, (p) => {
        const row = p.new as any;
        prependItem({
          id: `new-emp-${row.id}`,
          type: 'EMPLOYEE_CREATED',
          message: `New employee enrolled: ${row.name || 'Unknown'}`,
          detail: `${row.department || 'Staff'} · ${row.designation || ''} · Fingerprint registered`,
          time: formatFeedTime(row.created_at || new Date().toISOString()),
          isoTime: row.created_at || new Date().toISOString(),
          color: 'text-violet-400',
          dotColor: 'bg-violet-400',
          icon: Fingerprint,
          isNew: true,
        });
      })
      .subscribe();

    // Refresh timeAgo strings every 30s
    const tickInterval = setInterval(() => setTick((t) => t + 1), 30000);

    return () => {
      unsubAll();
      supabase.removeChannel(ch);
      clearInterval(tickInterval);
    };
  }, []);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">ENTERPRISE EVENT STREAM</span>
          <h1 className="text-xl font-black text-white flex items-center gap-3">
            Live Activity Feed
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 font-sans">
            Zero-latency biometric events — powered by Supabase Realtime + Event Bus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
            {liveCount > 0 && <span className="ml-1 font-mono">+{liveCount}</span>}
          </span>
          <button
            onClick={() => { feedRef.current = []; setFeed([]); setLiveCount(0); loadInitial(); }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Event Stream */}
      <div className="space-y-1.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-700/30" />
          ))
        ) : feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600 rounded-3xl bg-slate-900 border border-slate-800">
            <Radio className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-mono">No events yet — waiting for biometric activity...</p>
          </div>
        ) : (
          feed.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={clsx(
                  'flex items-center gap-4 px-4 py-3.5 rounded-2xl border transition-all duration-500',
                  item.isNew
                    ? 'bg-slate-800/80 border-slate-600/80 shadow-lg shadow-emerald-500/5 scale-[1.005]'
                    : 'bg-slate-900/50 border-slate-800/40 hover:bg-slate-900/80 hover:border-slate-700/60'
                )}
              >
                {/* Dot indicator */}
                <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', item.dotColor, item.isNew && 'animate-ping')} />

                {/* Icon */}
                <div className="w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center shrink-0">
                  <Icon className={clsx('w-3.5 h-3.5', item.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-xs font-bold leading-tight', item.color)}>{item.message}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-mono">{item.detail}</p>
                </div>

                {/* Time */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-slate-500 block">{item.time}</span>
                  <span className="text-[9px] font-mono text-slate-600 block mt-0.5">{timeAgo(item.isoTime)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {feed.length > 0 && (
        <p className="text-center text-[10px] text-slate-600 font-mono">
          Showing {feed.length} events · Auto-updates via Supabase Realtime
        </p>
      )}
    </div>
  );
}
