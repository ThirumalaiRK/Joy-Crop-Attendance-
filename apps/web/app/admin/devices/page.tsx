"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Radar, Plus, Cpu, HardDrive, Fingerprint, Users, Loader2,
  Wifi, WifiOff, RefreshCw, Clock, Activity, Zap, Shield,
  Download, RotateCcw, AlertTriangle, Server, Network,
  MonitorSmartphone, ChevronRight, Signal,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/dashboard/app-shell";
import { StatusDot } from "@/components/dashboard/status-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { fetchDevicesFromSupabase, supabase } from "@/lib/supabase";
import { BiometricDevice } from "@/types";

const CONNECTOR_BASE = process.env.NEXT_PUBLIC_CONNECTOR_URL || "http://localhost:4000";
const CONNECTOR = `${CONNECTOR_BASE}/api/device`;

function LatencyBar({ ms }: { ms: number }) {
  const color = ms === 0 ? "bg-slate-600" : ms < 30 ? "bg-emerald-500" : ms < 100 ? "bg-amber-500" : "bg-rose-500";
  const label = ms === 0 ? "—" : `${ms} ms`;
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(ms / 2, 60)}px`, minWidth: 6 }} />
      <span className="text-xs tabular text-slate-300">{label}</span>
    </div>
  );
}

function DeviceCard({ d, onAction }: { d: BiometricDevice; onAction: (action: string, ip: string) => void }) {
  const isOnline = d.status === "online";
  const memParts = (d.memoryUsage || "0MB / 128MB").split("/");
  const memUsed = parseFloat(memParts[0]) || 0;
  const memTotal = parseFloat(memParts[1]) || 128;
  const memPct = Math.min(Math.round((memUsed / memTotal) * 100), 100);
  const userPct = d.maxUserCapacity ? Math.round((d.registeredUsers / d.maxUserCapacity) * 100) : 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800/60 bg-slate-900/80 px-5 py-4">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-lg ${isOnline ? "bg-indigo-600/20 shadow-indigo-500/20" : "bg-slate-800"}`}>
          <MonitorSmartphone className={`size-6 ${isOnline ? "text-indigo-400" : "text-slate-500"}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-100">{d.name}</h2>
            <StatusDot status={d.status as any} />
            <Badge
              variant="secondary"
              className={`text-[10px] uppercase border ${isOnline ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}
            >
              {d.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">{d.ipAddress}:{d.port || 4370} · {d.model || "ZKTeco"}</p>
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
          { icon: Users, label: "Users", value: d.registeredUsers || 0, color: "text-cyan-400" },
          { icon: Fingerprint, label: "Templates", value: d.templateCount || 0, color: "text-violet-400" },
          { icon: HardDrive, label: "Att. Logs", value: d.todayLogsCount?.toLocaleString() || "0", color: "text-amber-400" },
          { icon: Zap, label: "Latency", value: d.latencyMs ? `${d.latencyMs}ms` : "—", color: d.latencyMs && d.latencyMs < 30 ? "text-emerald-400" : "text-rose-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-slate-950/60 border border-slate-800/40 p-3">
            <s.icon className={`size-3.5 mb-1.5 ${s.color}`} />
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
            <p className="tabular mt-0.5 text-sm font-bold text-slate-200">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Detail Rows */}
      <div className="space-y-2 px-4 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Firmware</p>
            <p className="text-xs text-slate-300 font-mono truncate">{d.firmwareVersion || "—"}</p>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">MAC Address</p>
            <p className="text-xs text-slate-300 font-mono truncate">{d.macAddress || "—"}</p>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Serial Number</p>
            <p className="text-xs text-slate-300 font-mono truncate">{d.serialNumber || "—"}</p>
          </div>
          <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Network</p>
            <p className="text-xs text-slate-300 truncate">{d.networkType || "DHCP"}</p>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">Memory Usage</span>
            <span className="tabular text-[10px] text-slate-400">{d.memoryUsage || "—"}</span>
          </div>
          <Progress value={memPct} className="h-1.5 bg-slate-800" indicatorClassName={`${memPct > 80 ? "bg-rose-500" : "bg-indigo-500"}`} />
        </div>

        {/* User Capacity */}
        <div className="rounded-lg bg-slate-950/40 border border-slate-800/30 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide">User Capacity</span>
            <span className="tabular text-[10px] text-slate-400">{d.registeredUsers} / {d.maxUserCapacity}</span>
          </div>
          <Progress value={userPct} className="h-1.5 bg-slate-800" indicatorClassName="bg-cyan-500" />
        </div>

        {/* Last Heartbeat / Sync */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <Clock className="size-3 shrink-0" />
          <span>Last sync: <span className="text-slate-400">{d.lastSync ? new Date(d.lastSync).toLocaleString() : "—"}</span></span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 bg-slate-900/30 p-3">
        <Button
          render={<Link href={`/admin/devices/${d.id}`} />}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          <ChevronRight className="size-3.5 mr-1" /> Open
        </Button>
        <Button
          variant="outline" size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => onAction("enroll", d.ipAddress)}
          disabled={!isOnline}
        >
          <Fingerprint className="size-3.5 mr-1" /> Enroll
        </Button>
        <Button
          variant="outline" size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => onAction("sync-time", d.ipAddress)}
          disabled={!isOnline}
        >
          <Clock className="size-3.5 mr-1" /> Sync Time
        </Button>
        <Button
          variant="outline" size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => onAction("download-logs", d.ipAddress)}
          disabled={!isOnline}
        >
          <Download className="size-3.5 mr-1" /> Logs
        </Button>
        <Button
          variant="outline" size="sm"
          className="border-slate-700 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
          onClick={() => onAction("restart", d.ipAddress)}
          disabled={!isOnline}
        >
          <RotateCcw className="size-3.5 mr-1" /> Restart
        </Button>
      </div>
    </div>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [deviceName, setDeviceName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("4370");

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDevicesFromSupabase();
      setDevices(data);
    } catch {
      toast.error("Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();

    // Realtime subscription: refresh when devices table changes
    const ch = supabase
      .channel("device-center-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "devices" }, () => {
        loadDevices();
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipAddress || !deviceName) {
      toast.error("Please provide both Device Name and IP Address");
      return;
    }
    setIsAdding(true);
    const toastId = toast.loading("Testing TCP connection to device...");
    try {
      const res = await fetch(`${CONNECTOR}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ipAddress, port: parseInt(port) || 4370, name: deviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection failed");
      toast.success("Device connected and added successfully!", { id: toastId });
      setSheetOpen(false);
      setDeviceName(""); setIpAddress(""); setPort("4370");
      loadDevices();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect. Saving as offline...", { id: toastId });
      await supabase.from("devices").upsert({
        ip_address: ipAddress,
        port: parseInt(port) || 4370,
        name: deviceName,
        status: "offline",
        model: "ZKTeco",
        branch: "Headquarters",
        last_sync: new Date().toISOString(),
      }, { onConflict: "ip_address" });
      toast.success("Device saved as offline.");
      setSheetOpen(false);
      setDeviceName(""); setIpAddress(""); setPort("4370");
      loadDevices();
    } finally {
      setIsAdding(false);
    }
  };

  const handleAction = async (action: string, ip: string) => {
    if (action === "enroll") {
      const userId = window.prompt("Enter the User ID to enroll on this device:");
      if (!userId) return;
      const tid = toast.loading(`Triggering remote enrollment for User ${userId}...`);
      try {
        const res = await fetch(`${CONNECTOR}/enroll`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip, port: 4370, userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        toast.success(`Enrollment started! Place finger on the ${ip} terminal.`, { id: tid });
      } catch (err: any) { toast.error(err.message, { id: tid }); }
    }

    if (action === "sync-time") {
      const tid = toast.loading("Syncing device time...");
      try {
        const res = await fetch(`${CONNECTOR}/sync-time`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip }),
        });
        if (!res.ok) throw new Error("Sync failed");
        toast.success("Device time synchronized!", { id: tid });
      } catch (err: any) { toast.error(err.message, { id: tid }); }
    }

    if (action === "restart") {
      if (!window.confirm(`Restart device at ${ip}? This will disconnect all active sessions.`)) return;
      const tid = toast.loading("Sending restart command...");
      try {
        const res = await fetch(`${CONNECTOR}/restart`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip }),
        });
        if (!res.ok) throw new Error("Restart failed");
        toast.success("Restart command sent!", { id: tid });
      } catch (err: any) { toast.error(err.message, { id: tid }); }
    }

    if (action === "download-logs") {
      const tid = toast.loading("Downloading attendance logs...");
      try {
        const res = await fetch(`${CONNECTOR}/download-logs`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        toast.success(`Downloaded ${data.logs?.length || 0} attendance logs!`, { id: tid });
      } catch (err: any) { toast.error(err.message, { id: tid }); }
    }
  };

  const connectedCount = devices.filter(d => d.status === "online").length;
  const offlineCount = devices.filter(d => d.status === "offline").length;

  return (
    <AppShell
      title="Device Center"
      subtitle="ZKTeco / Identix terminals managed via the local Node.js connector on TCP 4370"
      actions={
        <>
          {/* Status Bar */}
          <div className="flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
              <Wifi className="size-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">{connectedCount} Online</span>
            </div>
            {offlineCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1">
                <WifiOff className="size-3 text-rose-400" />
                <span className="text-xs text-rose-400 font-medium">{offlineCount} Offline</span>
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={loadDevices} className="border-slate-700 text-slate-300">
            <RefreshCw className="size-4" /> Refresh
          </Button>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger render={
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="size-4" /> Add Device
              </Button>
            } />
            <SheetContent className="sm:max-w-md bg-slate-950 border-slate-800">
              <SheetHeader>
                <SheetTitle className="text-slate-100">Add Biometric Device</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Connect a ZKTeco/Identix device via TCP/IP. The connector will test the link before saving.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleAddDevice} className="space-y-5 py-6">
                <div className="space-y-2">
                  <Label htmlFor="deviceName" className="text-slate-200">Device Name</Label>
                  <Input id="deviceName" placeholder="e.g. Main Entrance Terminal"
                    value={deviceName} onChange={(e) => setDeviceName(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
                    disabled={isAdding} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipAddress" className="text-slate-200">IP Address</Label>
                  <Input id="ipAddress" placeholder="192.168.1.56"
                    value={ipAddress} onChange={(e) => setIpAddress(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono"
                    disabled={isAdding} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port" className="text-slate-200">TCP Port</Label>
                  <Input id="port" placeholder="4370"
                    value={port} onChange={(e) => setPort(e.target.value)}
                    className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500 font-mono"
                    disabled={isAdding} />
                  <p className="text-xs text-slate-500">Default ZKTeco port is 4370</p>
                </div>
                <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/20 p-3 text-xs text-slate-400 space-y-1">
                  <div className="flex items-center gap-2 text-indigo-400 font-medium">
                    <Shield className="size-3.5" />
                    Architecture Note
                  </div>
                  <p>The browser never opens a TCP socket directly. All communication is routed through your local Node.js Connector Service on port 4000.</p>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isAdding}>
                  {isAdding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testing Connection...</> : "Test & Add Device"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-800/60 rounded-2xl bg-slate-900/20">
          <Radar className="h-10 w-10 text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-200">No Devices Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-4">Add a ZKTeco terminal to get started.</p>
          <Button onClick={() => setSheetOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add your first device
          </Button>
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Devices", value: devices.length, icon: Server, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
              { label: "Online", value: connectedCount, icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Offline", value: offlineCount, icon: WifiOff, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
              { label: "Total Users", value: devices.reduce((s, d) => s + (d.registeredUsers || 0), 0), icon: Users, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${s.bg}`}>
                <s.icon className={`size-5 shrink-0 ${s.color}`} />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{s.label}</p>
                  <p className={`text-xl font-bold tabular ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Device Cards */}
          <div className="grid gap-5 lg:grid-cols-2">
            {devices.map((d) => (
              <DeviceCard key={d.id} d={d} onAction={handleAction} />
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
