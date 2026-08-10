'use me';
'use client';

import React, { useState } from 'react';
import { Calendar, Flame, Award, Info } from 'lucide-react';

export function AttendanceHeatmap() {
  const [hoveredDay, setHoveredDay] = useState<{ day: number; count: number; date: string } | null>(null);

  // Generate 52 weeks * 7 days = 364 days mock intensity data deterministically to avoid SSR hydration mismatch
  const generateMockDays = () => {
    const days = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 364; i++) {
      const isWeekend = i % 7 === 0 || i % 7 === 6;
      let level = 0; // 0 = weekend/none, 1 = late/partial, 2 = 100% present, 3 = streak/overtime
      if (!isWeekend) {
        // Deterministic pseudo-random number based on day index i to prevent SSR hydration mismatch
        const rand = ((i * 13 + 7) % 100) / 100;
        if (rand > 0.85) level = 1; // Late
        else if (rand > 0.35) level = 2; // Present
        else level = 3; // Overtime / 100% score
      }

      const monthIdx = Math.floor(i / 30) % 12;
      const dayNum = (i % 30) + 1;

      days.push({
        id: i,
        level,
        date: `${months[monthIdx]} ${dayNum}, 2026`,
        status:
          level === 3
            ? 'On Time + Overtime'
            : level === 2
            ? 'On Time (100%)'
            : level === 1
            ? 'Late Arrival'
            : 'Weekend / Off',
      });
    }
    return days;
  };

  const days = generateMockDays();

  const getLevelColor = (level: number) => {
    switch (level) {
      case 3:
        return 'bg-emerald-400 shadow-sm shadow-emerald-400/30';
      case 2:
        return 'bg-emerald-600/80';
      case 1:
        return 'bg-amber-500/70';
      case 0:
      default:
        return 'bg-slate-800/60 hover:bg-slate-700';
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-xl flex flex-col gap-4">
      {/* Header & Streak Badge */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Annual Attendance Heatmap (2026)
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                GitHub Style
              </span>
            </h3>
            <p className="text-xs text-slate-400">364 days verified biometric activity across all gateways</p>
          </div>
        </div>

        {/* Streak & Score Chips */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span>19 Day Streak!</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Award className="w-4 h-4 text-blue-400" />
            <span>Score: 98.4 / 100</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid Visualizer */}
      <div className="relative overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="grid grid-rows-7 grid-flow-col gap-1.5 min-w-[720px]">
          {days.map((day) => (
            <div
              key={day.id}
              onMouseEnter={() => setHoveredDay({ day: day.id, count: day.level, date: day.date })}
              onMouseLeave={() => setHoveredDay(null)}
              className={`w-3.5 h-3.5 rounded-sm transition-all duration-200 cursor-pointer hover:scale-125 hover:z-10 ${getLevelColor(
                day.level
              )}`}
              title={`${day.date}: ${day.status}`}
            />
          ))}
        </div>
      </div>

      {/* Legend & Tooltip Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-slate-800/60" />
            <span className="w-3 h-3 rounded-sm bg-amber-500/70" />
            <span className="w-3 h-3 rounded-sm bg-emerald-600/80" />
            <span className="w-3 h-3 rounded-sm bg-emerald-400" />
          </div>
          <span>More</span>
        </div>

        {hoveredDay ? (
          <span className="text-slate-200 font-medium bg-slate-800 px-2.5 py-1 rounded-md text-[11px] animate-in fade-in">
            {hoveredDay.date} — Level {hoveredDay.count} Verification
          </span>
        ) : (
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <Info className="w-3 h-3" /> Hover over any box to view daily biometric check-in details
          </span>
        )}
      </div>
    </div>
  );
}
