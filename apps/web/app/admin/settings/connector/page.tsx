"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/dashboard/app-shell";
import {
  Server, Cpu, MemoryStick, Wifi, Activity, RefreshCw,
  Download, RotateCcw, CheckCircle, XCircle, Clock,
  MonitorSmartphone, Zap, Globe, AlertTriangle, Terminal,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const CONNECTOR_URL = "http://localhost:4000";

interface ConnectorStatus {
  running: boolean;
  version: string;
  build: string;
  machineName: string;
  nodeVersion: string;
  localIp: string;
  listeningPort: number;
  tcpConnections: number;
  connectedDevices: number;
  reconnectAttempts: number;
  memoryMB: number;
  memoryTotalMB: number;
  cpuPercent: number;
  uptime: number;
  lastHeartbeat: string;
}

function MetricRow({ icon: Icon, label, value, sub, color = "text-slate-300" }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-slate-800/60">
          <Icon className="size-4 text-slate-400" />
        </div>
        <div>
          <p className="text-sm text-slate-300">{label}</p>
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      <span className={`tabular text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ConnectorStatusPage() {
  const [status, setStatus] = useState<ConnectorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState("");

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${CONNECTOR_URL}/api/status`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error("Connector returned an error");
      const data = await res.json();
      setStatus(data);
      setLastFetched(new Date().toLocaleTimeString());
    } catch {
      setStatus(null);
      setLastFetched(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRestart = async () => {
    if (!window.confirm("Restart the connector service? Active device sessions will reconnect automatically.")) return;
    const tid = toast.loading("Sending restart signal...");
    try {
      await fetch(`${CONNECTOR_URL}/api/restart`, { method: "POST" });
      toast.success("Restart signal sent. Reconnecting in ~5s...", { id: tid });
      setTimeout(fetchStatus, 6000);
    } catch (err: any) {
      toast.error("Could not reach connector: " + err.message, { id: tid });
    }
  };

  const handleDownloadLogs = async () => {
    const tid = toast.loading("Preparing log download...");
    try {
      const res = await fetch(`${CONNECTOR_URL}/api/logs`);
      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `connector-logs-${Date.now()}.txt`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Logs downloaded!", { id: tid });
    } catch (err: any) {
      toast.error("Could not download logs: " + err.message, { id: tid });
    }
  };

  return (
    <AppShell
      title="Device Connector Status"
      subtitle="Local Node.js service bridging your network to the ZKTeco TCP protocol on port 4370"
      actions={
        <div className="flex items-center gap-2">
          {status ? (
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Connector Running
            </Badge>
          ) : (
            <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="mr-1.5 size-1.5 rounded-full bg-rose-400 inline-block" />
              Connector Offline
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchStatus} className="border-slate-700 text-slate-300">
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
        </div>
      }
    >
      {/* Architecture Diagram */}
      <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <Globe className="size-4 text-blue-400" />
            <span>Browser</span>
          </div>
          <span className="text-slate-600">──HTTPS──▶</span>
          <div className="flex items-center gap-2 rounded-lg bg-indigo-900/40 border border-indigo-500/40 px-3 py-2">
            <Server className="size-4 text-indigo-400" />
            <span className="text-indigo-300 font-medium">This Connector :4000</span>
          </div>
          <span className="text-slate-600">──TCP 4370──▶</span>
          <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
            <MonitorSmartphone className="size-4 text-cyan-400" />
            <span>ZKTeco Device</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Service Info */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
            <Server className="size-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">Service Information</h3>
          </div>
          <div className="px-5 py-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <RefreshCw className="size-6 animate-spin text-indigo-500" />
              </div>
            ) : status ? (
              <>
                <MetricRow icon={CheckCircle} label="Status" value="Running" color="text-emerald-400" />
                <MetricRow icon={Terminal} label="Service Version" value={status.version || "1.0.0"} />
                <MetricRow icon={Zap} label="Build" value={status.build || new Date().toLocaleDateString()} />
                <MetricRow icon={Server} label="Machine Name" value={status.machineName || "HRMS-SERVER"} />
                <MetricRow icon={Activity} label="Node.js Version" value={status.nodeVersion || "v20.x"} />
                <MetricRow icon={Clock} label="Uptime" value={formatUptime(status.uptime || 0)} color="text-cyan-400" />
              </>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-3">
                <XCircle className="size-10 text-rose-500" />
                <p className="text-sm text-slate-400">Connector is not running</p>
                <p className="text-xs text-slate-500">Start it with: <code className="font-mono text-indigo-400">npm run dev</code> in <code className="font-mono text-indigo-400">apps/connector</code></p>
              </div>
            )}
          </div>
        </div>

        {/* Network Info */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
            <Network className="size-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Network & Connections</h3>
          </div>
          <div className="px-5 py-2">
            {status ? (
              <>
                <MetricRow icon={Globe} label="Local IP" value={status.localIp || "127.0.0.1"} color="text-cyan-400" />
                <MetricRow icon={Wifi} label="Listening Port" value={`:${status.listeningPort || 4000}`} />
                <MetricRow icon={Activity} label="Active TCP Connections" value={status.tcpConnections ?? 0} />
                <MetricRow icon={MonitorSmartphone} label="Connected Devices" value={status.connectedDevices ?? 0} color="text-emerald-400" />
                <MetricRow icon={AlertTriangle} label="Reconnect Attempts" value={status.reconnectAttempts ?? 0} color={status.reconnectAttempts > 0 ? "text-amber-400" : "text-slate-300"} />
                <MetricRow icon={Clock} label="Last Heartbeat" value={status.lastHeartbeat || lastFetched} />
              </>
            ) : (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-slate-500">No data — connector offline</p>
              </div>
            )}
          </div>
        </div>

        {/* Resource Usage */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
            <Cpu className="size-5 text-violet-400" />
            <h3 className="text-sm font-semibold text-slate-200">Resource Usage</h3>
          </div>
          <div className="px-5 py-4 space-y-4">
            {status ? (
              <>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><Cpu className="size-3" /> CPU Usage</span>
                    <span className="tabular font-semibold text-violet-400">{status.cpuPercent ?? 0}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-violet-500 transition-all" style={{ width: `${status.cpuPercent ?? 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><MemoryStick className="size-3" /> Memory Usage</span>
                    <span className="tabular font-semibold text-blue-400">{status.memoryMB ?? 0} MB / {status.memoryTotalMB ?? 512} MB</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round(((status.memoryMB ?? 0) / (status.memoryTotalMB ?? 512)) * 100)}%` }} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">Last fetched: {lastFetched}</p>
              </>
            ) : (
              <div className="flex h-24 items-center justify-center">
                <p className="text-sm text-slate-500">No data — connector offline</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-4">
            <Zap className="size-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Connector Controls</h3>
          </div>
          <div className="p-5 space-y-3">
            <Button
              className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              onClick={fetchStatus}
            >
              <RefreshCw className="size-4 mr-3 text-indigo-400" /> Reconnect All Devices
            </Button>
            <Button
              className="w-full justify-start bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              onClick={handleDownloadLogs}
            >
              <Download className="size-4 mr-3 text-cyan-400" /> Download Connector Logs
            </Button>
            <Button
              className="w-full justify-start bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
              onClick={handleRestart}
              disabled={!status}
            >
              <RotateCcw className="size-4 mr-3" /> Restart Connector Service
            </Button>

            <div className="mt-4 rounded-xl bg-slate-950/50 border border-slate-800/40 p-4 text-xs text-slate-500 space-y-1 font-mono">
              <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wide mb-2">Quick Start</p>
              <p><span className="text-emerald-400">cd</span> apps/connector</p>
              <p><span className="text-amber-400">npm</span> run dev</p>
              <p className="text-slate-600 pt-1"># Or as a Windows Service:</p>
              <p><span className="text-amber-400">npm</span> run install-service</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
