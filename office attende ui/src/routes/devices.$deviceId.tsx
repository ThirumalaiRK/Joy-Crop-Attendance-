import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  Cpu,
  Power,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Activity,
  Clock,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { devices, employees, punches } from "@/lib/mock-data";

export const Route = createFileRoute("/devices/$deviceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Device ${params.deviceId} — PulseHR` },
      {
        name: "description",
        content:
          "Device overview, enrolled users, attendance buffer, network configuration, logs, maintenance and diagnostics.",
      },
      { property: "og:title", content: `Device ${params.deviceId} — PulseHR` },
      {
        property: "og:description",
        content: "Full terminal control: configuration, users, logs, maintenance and diagnostics.",
      },
    ],
  }),
  component: DeviceDetail,
  notFoundComponent: () => (
    <AppShell title="Device not found" subtitle="This terminal is no longer registered">
      <div className="panel p-8 text-sm text-muted-foreground">
        Check the Device Center for currently registered terminals.
      </div>
    </AppShell>
  ),
  errorComponent: () => (
    <AppShell title="Device unavailable" subtitle="We couldn't read this terminal">
      <div className="panel p-8 text-sm text-muted-foreground">Try again in a moment.</div>
    </AppShell>
  ),
  loader: ({ params }) => {
    const device = devices.find((d) => d.id === params.deviceId);
    if (!device) throw notFound();
    return { device };
  },
});

const configMenus = [
  ["User Management", "412 users · 806 templates"],
  ["User Roles", "3 roles defined"],
  ["Communication", "Ethernet · TCP 4370"],
  ["Data Management", "Delete / backup attendance"],
  ["System", "Date, time, attendance rules"],
  ["Access Control", "Time zones, groups, locks"],
  ["USB Manager", "Download / upload data"],
  ["Work Code", "12 codes"],
  ["Attendance Search", "Query by user & date"],
  ["Personalization", "Voice, bell, wallpaper"],
  ["Messages", "Public & personal"],
  ["Autotest", "Screen, voice, sensor"],
];

function DeviceDetail() {
  const { device: d } = Route.useLoaderData();

  return (
    <AppShell
      title={d.name}
      subtitle={`${d.model} · ${d.branch} · connector heartbeat every 5s`}
      actions={
        <>
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4" /> Sync now
          </Button>
          <Button variant="outline" size="sm">
            <Power className="size-4" /> Restart
          </Button>
          <Button size="sm">
            <Activity className="size-4" /> Realtime monitor
          </Button>
        </>
      }
    >
      <div className="panel relative overflow-hidden p-6">
        <div className="brand-gradient pointer-events-none absolute -right-24 -top-24 size-64 rounded-full opacity-15 blur-2xl" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div className="brand-gradient flex size-20 items-center justify-center rounded-3xl text-primary-foreground">
            <Cpu className="size-9" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{d.model}</h2>
              <StatusDot status={d.status} />
              <Badge variant="secondary" className="text-[10px] uppercase">
                {d.status}
              </Badge>
            </div>
            <div className="tabular mt-3 grid gap-x-8 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              <span>Serial · {d.serial}</span>
              <span>Firmware · {d.firmware}</span>
              <span>Algorithm · {d.algorithm}</span>
              <span>Platform · {d.platform}</span>
              <span>MAC · {d.mac}</span>
              <span>IP · {d.ip}:{d.port}</span>
              <span>Gateway · {d.gateway}</span>
              <span>DHCP · {d.dhcp ? "Enabled" : "Disabled"}</span>
              <span>Uptime · {d.uptime}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Latency", d.status === "offline" ? "—" : `${d.latencyMs} ms`],
              ["Packet loss", `${d.packetLossPct}%`],
              ["Pending sync", String(d.pendingSync)],
              ["Last sync", d.lastSync],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-secondary/70 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="tabular text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="panel p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold">Capacity</h3>
            <div className="mt-4 space-y-4">
              {[
                ["Users", d.users, 1000],
                ["Fingerprint templates", d.fingerprints, 3000],
                ["Face templates", d.faces, 500],
                ["Attendance buffer", d.attendanceLogs, 200000],
              ].map(([label, used, cap]) => {
                const pct = Math.round((Number(used) / Number(cap)) * 100);
                return (
                  <div key={String(label)}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span>{label}</span>
                      <span className="tabular text-muted-foreground">
                        {Number(used).toLocaleString()} / {Number(cap).toLocaleString()}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel p-5">
            <h3 className="text-sm font-semibold">Health timeline</h3>
            <ol className="mt-4 space-y-3 border-l border-border pl-4">
              {[
                ["14:02", "Heartbeat OK · 18 ms"],
                ["13:57", "Uploaded 42 attendance logs"],
                ["13:41", "Time synced with NTP"],
                ["12:58", "Reconnect after 1 dropped packet"],
                ["09:12", "Firmware check · up to date"],
              ].map(([time, text]) => (
                <li key={String(time)} className="relative">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-success" />
                  <p className="text-xs">{text}</p>
                  <p className="tabular text-[11px] text-muted-foreground">{time}</p>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device user ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Privilege</TableHead>
                  <TableHead>Templates</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.slice(0, 10).map((e, i) => (
                  <TableRow key={e.id}>
                    <TableCell className="tabular text-xs">{e.deviceUserId}</TableCell>
                    <TableCell className="text-sm font-medium">{e.name}</TableCell>
                    <TableCell className="tabular text-xs">{e.code}</TableCell>
                    <TableCell className="text-xs">{i === 0 ? "Super Admin" : "User"}</TableCell>
                    <TableCell className="text-xs">
                      {e.fingerprint ? "FP ×2" : "—"} {e.face ? "· Face" : ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <div className="panel divide-y divide-border">
            {punches.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3.5">
                <span className="tabular w-12 text-xs text-muted-foreground">{p.time}</span>
                <span className="flex-1 text-sm">{p.employee}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {p.type}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{p.method}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {configMenus.map(([title, hint]) => (
              <button
                key={String(title)}
                className="panel p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]"
              >
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="network" className="mt-4">
          <div className="panel space-y-3 p-5 text-sm">
            {[
              ["IP address", `${d.ip}`],
              ["Subnet mask", "255.255.255.0"],
              ["Gateway", d.gateway],
              ["TCP port", String(d.port)],
              ["DHCP", d.dhcp ? "Enabled" : "Disabled"],
              ["Comm key", "••••"],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="tabular font-medium">{v}</span>
                </div>
                <Separator className="mt-3" />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="panel p-5">
            <pre className="tabular overflow-x-auto text-[11px] leading-relaxed text-muted-foreground">
              {`[14:02:11] connector: heartbeat ok latency=18ms
[14:01:44] socket: recv realtime punch uid=118 mode=fp
[13:57:02] sync: uploaded 42 logs (batch 8f21)
[13:41:00] system: SetTime -> 2026-08-06T13:41:00+05:30
[12:58:16] socket: reconnect attempt 1 -> connected
[09:12:07] firmware: Ver 6.60 Aug 12 2024 (current)`}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <div className="panel grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Backup device data", icon: Download, variant: "outline" as const },
              { label: "Restore from backup", icon: Upload, variant: "outline" as const },
              { label: "Sync device time", icon: Clock, variant: "outline" as const },
              { label: "Restart terminal", icon: Power, variant: "outline" as const },
              { label: "Clear attendance logs", icon: Trash2, variant: "destructive" as const },
              { label: "Clear all users", icon: Trash2, variant: "destructive" as const },
            ].map((a) => (
              <Button key={a.label} variant={a.variant} className="justify-start">
                <a.icon className="size-4" /> {a.label}
              </Button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="diagnostics" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Signal quality", d.status === "offline" ? "No link" : "Excellent"],
              ["Round trip", d.status === "offline" ? "—" : `${d.latencyMs} ms`],
              ["Packet loss", `${d.packetLossPct}%`],
              ["Connection time", d.uptime],
            ].map(([label, value]) => (
              <div key={String(label)} className="panel p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="tabular mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
