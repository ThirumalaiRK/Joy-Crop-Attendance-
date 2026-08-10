import React from 'react';
import { Wifi, Cpu, HardDrive, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function OverviewTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Wifi className="w-4 h-4 text-emerald-400" /> Connection
          </div>
          <div className="text-xl font-bold text-slate-100">Online</div>
          <div className="text-xs text-emerald-500">12ms Latency</div>
        </div>
        
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Cpu className="w-4 h-4 text-blue-400" /> Firmware
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">Ver 6.60</div>
          <div className="text-xs text-slate-500">Algorithm: ZKFace 7.0</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> IP Address
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">192.168.1.56</div>
          <div className="text-xs text-slate-500">MAC: 00:1A:2B:3C:4D:5E</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <HardDrive className="w-4 h-4 text-rose-400" /> Serial Number
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">CGKK223862</div>
          <div className="text-xs text-slate-500">Model: K90 Pro</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-200 mb-6 uppercase tracking-wider">Storage Usage</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Users (120 / 3000)</span>
                <span className="font-bold text-slate-200">4%</span>
              </div>
              <Progress value={4} className="h-2 [&>div]:bg-indigo-500" />
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Fingerprints (118 / 3000)</span>
                <span className="font-bold text-slate-200">3.9%</span>
              </div>
              <Progress value={3.9} className="h-2 [&>div]:bg-blue-500" />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Attendance Logs (45,210 / 100000)</span>
                <span className="font-bold text-slate-200">45.2%</span>
              </div>
              <Progress value={45.2} className="h-2 [&>div]:bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-200 mb-6 uppercase tracking-wider">Device Health & Sync</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
              <span className="text-sm text-slate-400">Last Successful Sync</span>
              <span className="text-sm font-medium text-slate-200">2 mins ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
              <span className="text-sm text-slate-400">Pending Sync Tasks</span>
              <span className="text-sm font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">0 items</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/60">
              <span className="text-sm text-slate-400">Device Uptime</span>
              <span className="text-sm font-medium text-slate-200">14 days, 6 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
