'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRef } from 'react';
import {
  Radar, Plus, Cpu, HardDrive, Fingerprint, Users, Loader2,
  Wifi, WifiOff, RefreshCw, Clock, Zap, Shield, AlertTriangle, X,
  Download, RotateCcw, ChevronRight, MonitorSmartphone, Server, Network,
} from 'lucide-react';
import { toast } from 'sonner';
import { StatusDot } from '../../dashboard/status-dot';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Progress } from '../../ui/progress';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '../../ui/sheet';
import { fetchDevicesFromSupabase, supabase } from '../../../lib/supabase';
import { BiometricDevice } from '../../../types';

const CONNECTOR = 'http://localhost:4000/api/device';

function DeviceCard({ d, onAction }: { d: BiometricDevice; onAction: (action: string, ip: string) => void }) {
  const isOnline = d.status === 'online';
  const memParts = (d.memoryUsage || '0MB / 128MB').split('/');
  const memUsed = parseFloat(memParts[0]) || 0;
  const memTotal = parseFloat(memParts[1]) || 128;
  const memPct = Math.min(Math.round((memUsed / memTotal) * 100), 100);
  const userPct = d.maxUserCapacity ? Math.round((d.registeredUsers / d.maxUserCapacity) * 100) : 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-900/80 px-5 py-4">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${isOnline ? 'bg-indigo-600/20 shadow-indigo-500/20' : 'bg-slate-800'}`}>
          <MonitorSmartphone className={`size-6 ${isOnline ? 'text-indigo-400' : 'text-slate-500'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-100">{d.name}</h2>
            <StatusDot status={d.status as any} />
            <Badge variant="secondary" className={`text-[10px] uppercase border ${isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {d.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">{d.ipAddress}:{d.port || 4370} · {d.model || 'ZKTeco'}</p>
        </div>
        {isOnline && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">LIVE</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {[
          { icon: Users, label: 'Users', value: d.registeredUsers || 0, color: 'text-cyan-400' },
          { icon: Fingerprint, label: 'Templates', value: d.templateCount || 0, color: 'text-violet-400' },
          { icon: HardDrive, label: 'Att. Logs', value: (d.todayLogsCount || 0).toLocaleString(), color: 'text-amber-400' },
          { icon: Zap, label: 'Latency', value: d.latencyMs ? `${d.latencyMs}ms` : '—', color: d.latencyMs && d.latencyMs < 30 ? 'text-emerald-400' : 'text-rose-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-950/60 border border-slate-800/40 p-3">
            <s.icon className={`size-3.5 mb-1.5 ${s.color}`} />
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="tabular mt-0.5 text-sm font-bold text-slate-200">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Detail rows */}
      <div className="space-y-2 px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Firmware', value: d.firmwareVersion || '—' },
            { label: 'MAC Address', value: d.macAddress || '—' },
            { label: 'Serial No.', value: d.serialNumber || '—' },
            { label: 'Network', value: d.networkType || 'DHCP' },
          ].map((row) => (
            <div key={row.label} className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{row.label}</p>
              <p className="text-xs text-slate-300 font-mono truncate">{row.value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
          <div className="mb-1.5 flex justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Memory</span>
            <span className="text-[10px] text-slate-400">{d.memoryUsage || '—'}</span>
          </div>
          <Progress value={memPct} className="h-1.5 bg-slate-800" indicatorClassName={memPct > 80 ? 'bg-rose-500' : 'bg-indigo-500'} />
        </div>
        <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
          <div className="mb-1.5 flex justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">User Capacity</span>
            <span className="text-[10px] text-slate-400">{d.registeredUsers} / {d.maxUserCapacity}</span>
          </div>
          <Progress value={userPct} className="h-1.5 bg-slate-800" indicatorClassName="bg-cyan-500" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="size-3" />
          <span>Last sync: <span className="text-slate-400">{d.lastSync ? new Date(d.lastSync).toLocaleString() : '—'}</span></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 bg-slate-900/30 p-3">
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => onAction('enroll', d.ipAddress)} disabled={!isOnline}>
          <Fingerprint className="size-3.5 mr-1" /> Enroll
        </Button>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => onAction('sync-time', d.ipAddress)} disabled={!isOnline}>
          <Clock className="size-3.5 mr-1" /> Sync Time
        </Button>
        <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => onAction('download-logs', d.ipAddress)} disabled={!isOnline}>
          <Download className="size-3.5 mr-1" /> Logs
        </Button>
        <Button variant="outline" size="sm" className="border-slate-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30" onClick={() => onAction('restart', d.ipAddress)} disabled={!isOnline}>
          <RotateCcw className="size-3.5 mr-1" /> Restart
        </Button>
      </div>
    </div>
  );
}

export function DeviceCenterPanel() {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'data_management' | 'communication' | 'door_option' | 'wiegand' | 'duress'>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form states matching ZKTime.Net screen
  const [deviceName, setDeviceName] = useState('00:17:61:11:3b:ad');
  const [ipAddress, setIpAddress] = useState('192.168.1.56');
  const [port, setPort] = useState('4370');
  const [serialNumber, setSerialNumber] = useState('CGKK223862906');
  const [commPassword, setCommPassword] = useState('');
  const [deviceNumber, setDeviceNumber] = useState('1');
  const [terminalZone, setTerminalZone] = useState('zone1');
  const [recordSetting, setRecordSetting] = useState<'merge' | 'reset'>('merge');
  const [dateFormat, setDateFormat] = useState('YY-MM-DD');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResultLog, setActionResultLog] = useState<{ time: string; action: string; status: 'success' | 'error'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; icon?: string; danger?: boolean } | null>(null);
  const resolveConfirm = useRef<((v: boolean) => void) | null>(null);

  const showConfirm = (title: string, message: string, danger = false): Promise<boolean> =>
    new Promise((resolve) => {
      resolveConfirm.current = resolve;
      setConfirmDialog({ open: true, title, message, danger });
    });

  const handleConfirmClose = (result: boolean) => {
    setConfirmDialog(null);
    resolveConfirm.current?.(result);
    resolveConfirm.current = null;
  };

  // Terminal Info states read from device
  const [terminalInfo, setTerminalInfo] = useState({
    terminalType: 'x 2008 (Linux)',
    algorithmVersion: '10.0',
    coreboardType: 'ZLM60_TFT',
    admins: 1,
    users: 1,
    fpTemplates: 1,
    faceTemplates: 0,
    palm: 0,
    records: 9,
    dateFormat: 'YYYYMMDD',
  });

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const devs = await fetchDevicesFromSupabase();
      setDevices(devs);
      if (devs.length > 0 && !selectedDevice) {
        setSelectedDevice(devs[0]);
        setIpAddress(devs[0].ipAddress || '192.168.1.56');
        setPort(String(devs[0].port || 4370));
        if (devs[0].name) setDeviceName(devs[0].name);
      }
    } catch {
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const ch = supabase.channel('device-center-panel-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, loadDevices)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleTestConnection = async () => {
    const tid = toast.loading(`Testing TCP connection to ${ipAddress}:${port}...`);
    try {
      const res = await fetch(`${CONNECTOR}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipAddress, port: parseInt(port) || 4370, name: deviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      toast.success(`✅ Connected to Identix K90 Pro at ${ipAddress}:${port}`, { id: tid });

      // Fetch Terminal Info
      try {
        const infoRes = await fetch(`${CONNECTOR}/get-info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: ipAddress }),
        });
        const infoData = await infoRes.json();
        if (infoRes.ok) {
          setTerminalInfo({
            terminalType: infoData.terminalType || 'x 2008 (Linux)',
            algorithmVersion: infoData.algorithmVersion || '10.0',
            coreboardType: infoData.coreboardType || 'ZLM60_TFT',
            admins: infoData.adminsCount || 1,
            users: infoData.usersCount || 1,
            fpTemplates: infoData.fpTemplatesCount || 1,
            faceTemplates: 0,
            palm: 0,
            records: infoData.recordsCount || 9,
            dateFormat: infoData.dateFormat || 'YYYYMMDD',
          });
        }
      } catch (_) {}
    } catch (err: any) {
      toast.error(`❌ Connection failed: ${err.message}`, { id: tid });
    }
  };

  const handleSaveDevice = async () => {
    if (!ipAddress) {
      toast.error('Please enter a valid IP address');
      return;
    }

    const tid = toast.loading(`Saving device configuration for ${ipAddress}...`);
    const oldIp = selectedDevice?.ipAddress;

    try {
      if (selectedDevice?.id) {
        const { error } = await supabase.from('devices').update({
          ip_address: ipAddress,
          port: parseInt(port) || 4370,
          name: deviceName,
          serial_number: serialNumber,
          status: 'online',
          last_sync: new Date().toISOString(),
        }).eq('id', selectedDevice.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('devices').upsert({
          ip_address: ipAddress,
          port: parseInt(port) || 4370,
          name: deviceName,
          serial_number: serialNumber,
          status: 'online',
          last_sync: new Date().toISOString(),
        }, { onConflict: 'ip_address' });

        if (error) throw error;
      }

      // If IP was changed, disconnect old socket and clean up old status
      if (oldIp && oldIp !== ipAddress) {
        try {
          await fetch(`${CONNECTOR}/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: oldIp }),
          });
          await supabase.from('device_status').delete().eq('device_ip', oldIp);
        } catch (_) {}
      }

      // Initiate connection to new IP
      try {
        await fetch(`${CONNECTOR}/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip: ipAddress, port: parseInt(port) || 4370, name: deviceName }),
        });
      } catch (_) {}

      toast.success(`✅ Saved and mapped device at ${ipAddress}:${port}`, { id: tid });
      loadDevices();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`, { id: tid });
    }
  };

  const handleDeleteDevice = async () => {
    if (!window.confirm(`Delete device at ${ipAddress} from system inventory?`)) return;
    const tid = toast.loading(`Deleting device ${ipAddress}...`);
    try {
      const { error } = await supabase.from('devices').delete().eq('ip_address', ipAddress);
      if (error) throw error;
      toast.success(`Device ${ipAddress} deleted from system inventory`, { id: tid });
      loadDevices();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`, { id: tid });
    }
  };

  const handleTerminalAction = async (action: string, confirmMessage?: string, confirmTitle?: string) => {
    if (confirmMessage) {
      const ok = await showConfirm(confirmTitle || 'Confirm Hardware Action', confirmMessage, true);
      if (!ok) return;
    }

    setActionLoading(action);
    const label = action.toUpperCase().replace('-', ' ');
    const tid = toast.loading(`Executing ${label} on terminal hardware (${ipAddress})...`);

    try {
      const res = await fetch(`${CONNECTOR}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ipAddress }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Command failed');

      const successMsg = data.message || `Command ${label} executed successfully!`;
      toast.success(`✅ ${successMsg}`, { id: tid });

      setActionResultLog({
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: label,
        status: 'success',
        message: successMsg,
      });

      loadDevices();
    } catch (err: any) {
      const errorMsg = err.message || 'Error communicating with hardware TCP socket.';
      toast.error(`❌ ${errorMsg}`, { id: tid });
      setActionResultLog({
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: label,
        status: 'error',
        message: errorMsg,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const online = devices.filter(d => d.status === 'online').length;
  const offline = devices.filter(d => d.status === 'offline').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* ─── In-App Hardware Confirm Dialog Modal ─────────────────────── */}
      {confirmDialog?.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => handleConfirmClose(false)}
          />
          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/60 animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className={`flex items-center gap-3 px-6 pt-6 pb-4 border-b ${confirmDialog.danger ? 'border-rose-500/20' : 'border-slate-800'}`}>
              <div className={`flex size-10 items-center justify-center rounded-xl ${confirmDialog.danger ? 'bg-rose-500/10' : 'bg-amber-500/10'}`}>
                <AlertTriangle className={`size-5 ${confirmDialog.danger ? 'text-rose-400' : 'text-amber-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-mono">Hardware TCP Command • {ipAddress}:4370</p>
              </div>
              <button onClick={() => handleConfirmClose(false)} className="rounded-lg p-1.5 hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition">
                <X className="size-4" />
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-300 leading-relaxed">{confirmDialog.message}</p>
              <div className={`mt-4 rounded-lg px-3 py-2 text-[11px] font-mono border ${confirmDialog.danger ? 'bg-rose-950/30 border-rose-500/20 text-rose-300' : 'bg-amber-950/30 border-amber-500/20 text-amber-300'}`}>
                ⚠ This action executes immediately on the physical terminal over TCP socket.
              </div>
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-lg ${confirmDialog.danger ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`}
              >
                Yes, Execute Command
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <MonitorSmartphone className="w-5 h-5 text-indigo-400" />
            </div>
            Device Management & Control Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">Enterprise ZKTime.Net Terminal Controller • Identix K90 Pro (TCP 4370)</p>
        </div>
        <div className="flex items-center gap-2">
          {online > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
              <Wifi className="size-3 text-emerald-400" /><span className="text-xs text-emerald-400">{online} Online</span>
            </div>
          )}
          {offline > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1">
              <WifiOff className="size-3 text-rose-400" /><span className="text-xs text-rose-400">{offline} Offline</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={loadDevices} className="border-slate-700 text-slate-300">
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Main ZKTime.Net Style Control Deck */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden">
        {/* Top Control Action Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition">
              <Radar className="w-3.5 h-3.5" /> Search
            </button>
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20">
              <Plus className="w-3.5 h-3.5" /> + Add
            </button>
            <button onClick={handleSaveDevice} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20">
              <HardDrive className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={handleDeleteDevice} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition">
              <WifiOff className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={() => handleTerminalAction('download-logs')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 transition">
              <Download className="w-3.5 h-3.5" /> Download Records
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>TCP Socket: <strong className="text-slate-200">{ipAddress}:4370</strong></span>
          </div>
        </div>

        {/* Sub-Tabs Header */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          {[
            { id: 'general', label: 'General' },
            { id: 'data_management', label: 'Data Management' },
            { id: 'communication', label: 'Communication' },
            { id: 'door_option', label: 'Door Option' },
            { id: 'wiegand', label: 'Wiegand Option' },
            { id: 'duress', label: 'Duress Option' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Connection Details Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">Connection Details</h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-400">Status:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                      <input type="radio" name="status" defaultChecked className="accent-emerald-500" /> Enable
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
                      <input type="radio" name="status" className="accent-rose-500" /> Disable
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Connection Mode:</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-emerald-400 font-bold">
                        <input type="radio" name="mode" defaultChecked className="accent-emerald-500" /> TCP/IP
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-500">
                        <input type="radio" name="mode" className="accent-slate-500" /> USB
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Device Number:</label>
                    <Input value={deviceNumber} onChange={(e) => setDeviceNumber(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-slate-200 font-mono" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Name <span className="text-rose-400">*</span>:</label>
                    <Input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-slate-200 font-mono" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Port <span className="text-rose-400">*</span>:</label>
                    <Input value={port} onChange={(e) => setPort(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-slate-200 font-mono" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">IP Address <span className="text-rose-400">*</span>:</label>
                    <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-slate-200 font-mono font-bold text-emerald-400" />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Terminal Zone:</label>
                    <select value={terminalZone} onChange={(e) => setTerminalZone(e.target.value)} className="h-8 w-full rounded-md bg-slate-900 border border-slate-800 text-slate-200 px-3 text-xs">
                      <option value="zone1">zone1</option>
                      <option value="HQ Main Office">HQ Main Office</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="w-32 text-slate-400">Serial Number:</label>
                    <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className="h-8 bg-slate-900 border-slate-800 text-slate-300 font-mono" />
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={handleTestConnection}
                      className="w-full md:w-auto px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition border border-emerald-500/40"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              </div>

              {/* Terminal Info Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800/60 pb-3">Terminal Info (Live Query)</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Terminal Type</span>
                    <span className="text-slate-200 font-bold">{terminalInfo.terminalType}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Algorithm Version</span>
                    <span className="text-slate-200 font-bold">{terminalInfo.algorithmVersion}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Admins</span>
                    <span className="text-amber-400 font-bold">{terminalInfo.admins}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Users</span>
                    <span className="text-cyan-400 font-bold">{terminalInfo.users}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">FP Templates</span>
                    <span className="text-emerald-400 font-bold">{terminalInfo.fpTemplates}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Face Templates</span>
                    <span className="text-slate-400 font-bold">{terminalInfo.faceTemplates}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Records</span>
                    <span className="text-violet-400 font-bold">{terminalInfo.records}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 uppercase block">Coreboard Type</span>
                    <span className="text-slate-300 font-bold">{terminalInfo.coreboardType}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data_management' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider border-b border-slate-800/60 pb-3">Terminal Management Actions</h3>

                <div className="flex items-center gap-3">
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="h-9 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 px-3 text-xs font-mono">
                    <option value="YY-MM-DD">YY-MM-DD</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM-DD-YY">MM-DD-YY</option>
                  </select>
                  <button onClick={() => toast.success(`Date format set to ${dateFormat}`)} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition">
                    Set Date Format
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('sync-time')}
                    className="p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Sync Time</span>
                    {actionLoading === 'sync-time' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Clock className="w-4 h-4" />}
                  </button>

                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('clear-fps', 'Are you sure you want to CLEAR ALL FINGERPRINTS from terminal hardware memory?')}
                    className="p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Clear All Fingerprints</span>
                    {actionLoading === 'clear-fps' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Fingerprint className="w-4 h-4" />}
                  </button>

                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('clear-admin', 'Are you sure you want to CLEAR ADMINISTRATOR LOCK on physical hardware? All users will be set to Normal User.')}
                    className="p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Clear Administrator</span>
                    {actionLoading === 'clear-admin' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Shield className="w-4 h-4" />}
                  </button>

                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('clear-records', 'Are you sure you want to CLEAR ALL ATTENDANCE LOGS from terminal hardware memory?')}
                    className="p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Clear All Records</span>
                    {actionLoading === 'clear-records' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <HardDrive className="w-4 h-4" />}
                  </button>

                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('clear-users', 'Are you sure you want to CLEAR ALL USERS from terminal hardware memory?')}
                    className="p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Clear All Users</span>
                    {actionLoading === 'clear-users' ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Users className="w-4 h-4" />}
                  </button>

                  <button
                    disabled={!!actionLoading}
                    onClick={() => handleTerminalAction('restart', 'Are you sure you want to RESTART the terminal hardware over TCP socket?')}
                    className="p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs text-left transition flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Restart Terminal Hardware</span>
                    {actionLoading === 'restart' ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <RotateCcw className="w-4 h-4" />}
                  </button>
                </div>

                {/* Real-time TCP Hardware Execution Response Box */}
                {actionResultLog && (
                  <div className={`mt-4 rounded-xl p-4 border font-mono text-xs animate-in fade-in ${actionResultLog.status === 'success' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'}`}>
                    <div className="flex items-center justify-between mb-1 font-bold">
                      <span className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${actionResultLog.status === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        TCP Response Log: [{actionResultLog.action}]
                      </span>
                      <span className="text-[10px] text-slate-400">{actionResultLog.time}</span>
                    </div>
                    <p className="mt-1 text-slate-200">{actionResultLog.message}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-800/60 pb-4">
                  <button className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition">Read Option</button>
                  <button className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition">Set Option</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">IP Address:</label>
                    <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} className="bg-slate-900 border-slate-800 text-slate-200" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Gateway:</label>
                    <Input defaultValue="192.168.1.1" className="bg-slate-900 border-slate-800 text-slate-200" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Subnet Mask:</label>
                    <Input defaultValue="255.255.255.0" className="bg-slate-900 border-slate-800 text-slate-200" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Device Number:</label>
                    <Input value={deviceNumber} onChange={(e) => setDeviceNumber(e.target.value)} className="bg-slate-900 border-slate-800 text-slate-200" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
