'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Fingerprint, 
  ShieldCheck, 
  Wifi, 
  CheckCircle2, 
  Activity, 
  Server, 
  Scan,
  RefreshCw,
  Loader2,
  XCircle,
  CreditCard
} from 'lucide-react';

type EnrollmentStatus = 'Idle' | 'Waiting' | 'Finger Detected' | 'Capture 1/3' | 'Capture 2/3' | 'Capture 3/3' | 'Saved' | 'Error';

export default function EnrollmentPage() {
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('Idle');
  const [deviceOnline, setDeviceOnline] = useState(true);

  // Mock employee data for the demo
  const employee = {
    id: 'EMP001',
    code: 'PH-1042',
    name: 'John Doe',
    department: 'Engineering',
    shift: 'General 09:00-18:00',
    assignedDevice: 'Reception K90 (192.168.1.56)'
  };

  const handleEnroll = async () => {
    setEnrollmentStatus('Waiting');
    try {
      const res = await fetch('/api/admin/device/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: parseInt(employee.code.replace(/\D/g, ''), 10) || 1,
          userId: employee.code,
          userName: employee.name,
          ip: '192.168.1.56',
          port: 4370,
        })
      });
      if (!res.ok) throw new Error('Failed to start enrollment');
      
      // Start polling status
      pollStatus();
    } catch (err) {
      console.error(err);
      setEnrollmentStatus('Error');
    }
  };

  const pollStatus = async () => {
    const connectorUrl = process.env.NEXT_PUBLIC_CONNECTOR_URL || 'http://localhost:4000';
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${connectorUrl}/api/device/enroll/status`);
        const data = await res.json();
        
        if (data.status) {
          setEnrollmentStatus(data.status);
          
          if (data.status === 'Saved' || data.status === 'Idle' || data.status === 'Error') {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error(err);
        clearInterval(interval);
      }
    }, 1000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Biometric Device Enrollment</h1>
        <p className="text-slate-400 text-sm">Securely register employee biometric templates directly to edge devices via TCP/IP.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Employee Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3" />
            
            <h2 className="text-sm font-bold text-slate-100 mb-6 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              Employee Profile
            </h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0 relative">
                <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
                  <User className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 border-2 border-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                  ACTIVE
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Name</span>
                  <strong className="text-slate-200">{employee.name}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Employee Code</span>
                  <strong className="text-blue-400 font-mono">{employee.code}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Department</span>
                  <strong className="text-slate-200">{employee.department}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Shift</span>
                  <strong className="text-slate-200">{employee.shift}</strong>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col gap-1 items-center justify-center text-center">
                <Fingerprint className="w-5 h-5 text-indigo-400 mb-1" />
                <span className="text-[10px] text-slate-400 uppercase">Fingerprint</span>
                {enrollmentStatus === 'Saved' ? (
                  <span className="text-emerald-400 font-bold text-xs">Enrolled</span>
                ) : (
                  <span className="text-rose-400 font-bold text-xs">Not Enrolled</span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col gap-1 items-center justify-center text-center">
                <Scan className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[10px] text-slate-400 uppercase">Face Status</span>
                <span className="text-slate-500 font-bold text-xs">N/A</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col gap-1 items-center justify-center text-center">
                <CreditCard className="w-5 h-5 text-slate-600 mb-1" />
                <span className="text-[10px] text-slate-400 uppercase">Card Status</span>
                <span className="text-slate-500 font-bold text-xs">N/A</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800 flex flex-col gap-1 items-center justify-center text-center">
                <ShieldCheck className="w-5 h-5 text-emerald-500 mb-1" />
                <span className="text-[10px] text-slate-400 uppercase">System</span>
                <span className="text-emerald-400 font-bold text-xs">Verified</span>
              </div>
            </div>
          </div>

          {/* Scanner Panel */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                 <Fingerprint className="w-4 h-4 text-indigo-400" />
                 Right Thumb Enrollment
               </h2>
               {enrollmentStatus !== 'Idle' && (
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 flex items-center gap-1.5 animate-pulse">
                    <Activity className="w-3 h-3" />
                    LIVE SCANNER FEED
                  </span>
               )}
             </div>

             <div className="flex flex-col items-center justify-center py-8">
               <div className="relative">
                 {/* Fingerprint Visual */}
                 <div className={`w-32 h-32 rounded-3xl border-2 flex items-center justify-center transition-all duration-500 ${
                    enrollmentStatus === 'Idle' ? 'border-slate-700 text-slate-600' :
                    enrollmentStatus === 'Saved' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]' :
                    enrollmentStatus === 'Error' ? 'border-rose-500 text-rose-400 bg-rose-500/10' :
                    'border-indigo-500 text-indigo-400 bg-indigo-500/10 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
                 }`}>
                   <Fingerprint className={`w-16 h-16 ${enrollmentStatus !== 'Idle' && enrollmentStatus !== 'Saved' && enrollmentStatus !== 'Error' ? 'animate-pulse' : ''}`} />
                   
                   {/* Scanning Line Animation */}
                   {enrollmentStatus !== 'Idle' && enrollmentStatus !== 'Saved' && enrollmentStatus !== 'Error' && (
                     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent h-1 w-full animate-[ping_2s_ease-in-out_infinite]" />
                   )}
                 </div>
               </div>

               {/* Status Display */}
               <div className="mt-6 flex flex-col items-center justify-center h-16">
                  {enrollmentStatus === 'Idle' ? (
                    <span className="text-sm font-bold text-slate-400">Ready to begin</span>
                  ) : enrollmentStatus === 'Waiting' ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Waiting for finger placement...
                      </span>
                    </div>
                  ) : enrollmentStatus === 'Finger Detected' ? (
                    <span className="text-sm font-bold text-indigo-400">Finger Detected. Keep steady...</span>
                  ) : enrollmentStatus.includes('Capture') ? (
                    <div className="flex flex-col items-center w-full">
                      <span className="text-sm font-bold text-indigo-400">{enrollmentStatus}</span>
                      <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{
                          width: enrollmentStatus === 'Capture 1/3' ? '33%' : enrollmentStatus === 'Capture 2/3' ? '66%' : '90%'
                        }} />
                      </div>
                    </div>
                  ) : enrollmentStatus === 'Saved' ? (
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> Template Verified & Saved
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-rose-400 flex items-center gap-2">
                      <XCircle className="w-5 h-5" /> Enrollment Failed
                    </span>
                  )}
               </div>

               <div className="mt-8 flex gap-4 w-full max-w-sm">
                 <button 
                   onClick={() => setEnrollmentStatus('Idle')}
                   disabled={enrollmentStatus !== 'Idle' && enrollmentStatus !== 'Saved' && enrollmentStatus !== 'Error'}
                   className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleEnroll}
                   disabled={enrollmentStatus !== 'Idle' && enrollmentStatus !== 'Error' && enrollmentStatus !== 'Saved'}
                   className="flex-1 px-4 py-2.5 rounded-xl border border-indigo-500 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {enrollmentStatus === 'Saved' ? 'Enroll Another' : 'Enroll Device'}
                 </button>
               </div>
             </div>
          </div>
        </div>

        {/* Right Column: Live Device Status */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-6">
              <Server className="w-4 h-4 text-emerald-400" />
              Live Device Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400 flex items-center gap-2">
                  <Wifi className={`w-4 h-4 ${deviceOnline ? 'text-emerald-400' : 'text-rose-400'}`} />
                  Status
                </span>
                {deviceOnline ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Device Online
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400">Offline</span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400">Target IP</span>
                <span className="text-xs font-mono font-bold text-slate-200">192.168.1.56</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400">Signal Quality</span>
                <span className="text-xs font-bold text-emerald-400">Excellent</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400">Firmware</span>
                <span className="text-xs font-mono font-bold text-slate-200">Ver 6.60</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400">Enrolled Users</span>
                <span className="text-xs font-bold text-blue-400">120 / 3000</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/60">
                <span className="text-xs text-slate-400">Templates</span>
                <span className="text-xs font-bold text-blue-400">118 / 3000</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-center">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-[spin_3s_linear_infinite]" />
                Ready To Scan
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
