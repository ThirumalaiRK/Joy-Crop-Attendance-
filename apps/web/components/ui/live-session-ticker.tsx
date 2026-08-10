'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Wifi, WifiOff } from 'lucide-react';

interface LiveSessionTickerProps {
  checkInTime?: string; // ISO timestamp
  isCheckedOut?: boolean;
  breakStartTime?: string; // ISO timestamp if currently on break
}

function padZ(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatElapsed(ms: number): string {
  if (ms <= 0) return '00h 00m 00s';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${padZ(h)}h ${padZ(m)}m ${padZ(s)}s`;
}

/**
 * LiveSessionTicker — Real-time ticking clock for active work sessions.
 * Shows elapsed work time from check-in time, ticking every second.
 * Freezes when checked-out. Turns amber during breaks.
 * Zero mock data — driven only by actual check-in timestamp.
 */
export function LiveSessionTicker({ checkInTime, isCheckedOut, breakStartTime }: LiveSessionTickerProps) {
  const [elapsed, setElapsed] = useState('00h 00m 00s');
  const [breakElapsed, setBreakElapsed] = useState('00m 00s');
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!checkInTime || isCheckedOut) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const checkInMs = new Date(checkInTime).getTime();

    const tick = () => {
      const now = Date.now();

      // If on break, freeze work elapsed and show break timer
      if (breakStartTime) {
        const breakMs = new Date(breakStartTime).getTime();
        const breakDiff = now - breakMs;
        const totalBreakSec = Math.floor(breakDiff / 1000);
        const bm = Math.floor(totalBreakSec / 60);
        const bs = totalBreakSec % 60;
        setBreakElapsed(`${padZ(bm)}m ${padZ(bs)}s`);
      } else {
        setBreakElapsed('00m 00s');
      }

      // Work elapsed = time since check-in (break time NOT subtracted here — shown separately)
      const workDiff = now - checkInMs;
      setElapsed(formatElapsed(workDiff));
      setPulse((p) => !p);
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkInTime, isCheckedOut, breakStartTime]);

  if (!checkInTime) return null;

  const isOnBreak = !!breakStartTime;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs transition-all duration-300 ${
      isCheckedOut
        ? 'bg-slate-800/60 border-slate-700 text-slate-400'
        : isOnBreak
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    }`}>
      {isCheckedOut ? (
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnBreak ? 'bg-amber-400' : 'bg-emerald-400'} ${pulse ? 'opacity-100' : 'opacity-40'} transition-opacity duration-500`} />
      )}

      <span className="font-black tracking-widest text-[11px]">
        {isCheckedOut
          ? 'Session Ended'
          : isOnBreak
          ? `On Break ${breakElapsed}`
          : elapsed}
      </span>

      {!isCheckedOut && !isOnBreak && (
        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider hidden sm:block">
          LIVE
        </span>
      )}
    </div>
  );
}
