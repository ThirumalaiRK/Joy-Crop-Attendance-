'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Users, Building2, CheckCircle2, Coffee, ShieldCheck, Filter, Loader2 } from 'lucide-react';
import { Employee } from '../../types';
import { supabase } from '../../lib/supabase';

interface LiveFloorMapProps {
  employees?: Employee[];
}

interface ZoneEmployee {
  id: string;
  name: string;
  deskNo: string;
  status: string;
  avatar: string;
  x: number;
  y: number;
}

interface FloorZone {
  id: string;
  name: string;
  capacity: number;
  presentCount: number;
  employees: ZoneEmployee[];
}

export function LiveFloorMap({ employees }: LiveFloorMapProps) {
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [hoveredEmployee, setHoveredEmployee] = useState<any>(null);
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadZones() {
      try {
        const [zonesRes, employeesRes] = await Promise.all([
          supabase.from('floor_zones').select('*'),
          supabase.from('floor_zone_employees').select('*')
        ]);
        
        if (zonesRes.data && employeesRes.data) {
          const mappedZones: FloorZone[] = zonesRes.data.map(z => ({
            id: z.id,
            name: z.name,
            capacity: z.capacity,
            presentCount: z.present_count,
            employees: employeesRes.data
              .filter((e: any) => e.zone_id === z.id)
              .map((e: any) => ({
                id: e.id,
                name: e.name,
                deskNo: e.desk_no,
                status: e.status,
                avatar: e.avatar,
                x: e.x,
                y: e.y
              }))
          }));
          setZones(mappedZones);
        }
      } catch (err) {
        console.error('Failed to load floor zones', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadZones();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Live Architectural Office Floor Map
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
                REAL-TIME DESK MONITORING
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Floor 4 & 5 Architectural Zone Occupancy & Desk Status
            </p>
          </div>
        </div>

        {/* Zone Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedZone('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedZone === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Zones
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                selectedZone === zone.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {zone.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Floor Blueprint Diagram Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blueprint Canvas Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Global HQ — Floor 4 Architectural Plan
            </span>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Desk Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> On Break / Away
              </span>
            </div>
          </div>

          {/* SVG/CSS Blueprint Graphic Area */}
          <div className="relative aspect-[16/9] w-full bg-slate-950/80 rounded-2xl border-2 border-dashed border-slate-800 p-6 flex flex-col justify-between overflow-hidden">
            {/* Blueprint Grid Lines SVG overlay */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Zone Boundaries Demarcations */}
            <div className="absolute top-4 left-4 border border-blue-500/30 bg-blue-500/5 rounded-2xl p-3 w-[45%] h-[40%] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-blue-300 uppercase">Engineering Wing</span>
              <span className="text-[10px] text-slate-500">Desks ENG-401 to ENG-440</span>
            </div>

            <div className="absolute top-4 right-4 border border-purple-500/30 bg-purple-500/5 rounded-2xl p-3 w-[45%] h-[40%] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-purple-300 uppercase">Design Studio</span>
              <span className="text-[10px] text-slate-500">Desks DES-101 to DES-125</span>
            </div>

            <div className="absolute bottom-4 left-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-3 w-[45%] h-[45%] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-300 uppercase">HR & Operations</span>
              <span className="text-[10px] text-slate-500">Desks HR-201 to HR-230</span>
            </div>

            <div className="absolute bottom-4 right-4 border border-amber-500/30 bg-amber-500/5 rounded-2xl p-3 w-[45%] h-[45%] flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-300 uppercase">Cafeteria & Lounge</span>
              <span className="text-[10px] text-slate-500">Breakout & Meeting Hub</span>
            </div>

            {isLoading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            )}
            {/* Interactive Employee Desk Pins */}
            {zones.map((zone) =>
              zone.employees.map((emp) => (
                <div
                  key={emp.id}
                  onMouseEnter={() => setHoveredEmployee(emp)}
                  onMouseLeave={() => setHoveredEmployee(null)}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-10"
                  style={{ left: `${emp.x}%`, top: `${emp.y}%` }}
                >
                  <div className="relative">
                    {emp.avatar ? (
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className={`w-9 h-9 rounded-full object-cover ring-2 transition-all duration-300 group-hover:scale-125 ${
                          emp.status === 'present'
                            ? 'ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                            : 'ring-amber-400'
                        }`}
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-bold text-xs ring-2 transition-all duration-300 group-hover:scale-125 ${
                          emp.status === 'present'
                            ? 'ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]'
                            : 'ring-amber-400'
                        }`}>
                        {(emp.name || '?')[0]}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                        emp.status === 'present' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Hovered Employee Info Card Footer */}
          {hoveredEmployee ? (
            <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/40 text-xs flex items-center justify-between text-slate-200 animate-in fade-in">
              <div className="flex items-center gap-3">
                {hoveredEmployee.avatar ? (
                  <img
                    src={hoveredEmployee.avatar}
                    alt={hoveredEmployee.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-bold text-xs">
                    {(hoveredEmployee.name || '?')[0]}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-blue-300">{hoveredEmployee.name}</span>
                  <span className="text-[10px] text-slate-400">Desk: {hoveredEmployee.deskNo}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 uppercase">
                {hoveredEmployee.status}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-500 text-center">
              Hover over any employee avatar on the floor plan to view desk number and status.
            </div>
          )}
        </div>

        {/* Sidebar Zone Breakdown Cards */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Zone Occupancy Summary</h3>
          {zones.map((zone) => (
            <div
              key={zone.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{zone.name}</span>
                <span className="text-emerald-400 font-bold">
                  {zone.presentCount} / {zone.capacity} Present
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full"
                  style={{ width: `${(zone.presentCount / zone.capacity) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                <span>Occupancy Rate</span>
                <span className="font-mono text-slate-300">
                  {Math.round((zone.presentCount / zone.capacity) * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
