import { createFileRoute, Link } from "@tanstack/react-router";
import { Radar, Plus, Cpu, HardDrive, Fingerprint, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { devices } from "@/lib/mock-data";

export const Route = createFileRoute("/devices/")({
  head: () => ({
    meta: [
      { title: "Device Center — PulseHR" },
      {
        name: "description",
        content:
          "Enterprise device center for ZKTeco and Identix terminals: discover, connect, monitor health and sync users over the office LAN.",
      },
      { property: "og:title", content: "Device Center — PulseHR" },
      {
        property: "og:description",
        content: "Discover, connect and monitor every biometric terminal from the browser.",
      },
    ],
  }),
  component: Devices,
});

function Devices() {
  return (
    <AppShell
      title="Device Center"
      subtitle="ZKTeco / Identix terminals reachable through the local connector on TCP 4370"
      actions={
        <>
          <Button variant="outline" size="sm">
            <Radar className="size-4" /> Discover devices
          </Button>
          <Button size="sm">
            <Plus className="size-4" /> Add manually
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {devices.map((d) => (
          <div key={d.id} className="panel overflow-hidden">
            <div className="flex items-start gap-4 p-5">
              <div className="brand-gradient flex size-16 shrink-0 items-center justify-center rounded-2xl text-primary-foreground">
                <Cpu className="size-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold">{d.name}</h2>
                  <StatusDot status={d.status} />
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {d.status}
                  </Badge>
                </div>
                <p className="tabular mt-0.5 text-xs text-muted-foreground">
                  {d.model} · SN {d.serial} · {d.firmware}
                </p>
                <p className="tabular mt-1 text-xs text-muted-foreground">
                  {d.ip}:{d.port} · MAC {d.mac} · {d.dhcp ? "DHCP" : "Static"} · {d.branch}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-5 sm:grid-cols-4">
              {[
                { icon: Users, label: "Users", value: d.users },
                { icon: Fingerprint, label: "Templates", value: d.fingerprints },
                { icon: HardDrive, label: "Logs", value: d.attendanceLogs.toLocaleString() },
                { icon: Cpu, label: "Latency", value: d.status === "offline" ? "—" : `${d.latencyMs} ms` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-secondary/70 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="tabular mt-0.5 text-sm font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="px-5 pt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Storage used</span>
                <span className="tabular">{d.storagePct}%</span>
              </div>
              <Progress value={d.storagePct} className="h-1.5" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-secondary/30 p-4">
              <Button asChild size="sm">
                <Link to="/devices/$deviceId" params={{ deviceId: d.id }}>
                  Open device
                </Link>
              </Button>
              <Button variant="outline" size="sm">
                Sync time
              </Button>
              <Button variant="outline" size="sm">
                Restart
              </Button>
              <Button variant="outline" size="sm">
                Backup
              </Button>
              <span className="tabular ml-auto text-[11px] text-muted-foreground">
                Last sync {d.lastSync}
                {d.pendingSync > 0 ? ` · ${d.pendingSync} queued` : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
