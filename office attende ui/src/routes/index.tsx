import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  UserCheck,
  Clock4,
  UserX,
  Plane,
  Timer,
  Cpu,
  CloudOff,
  RefreshCw,
  Download,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { StatusDot } from "@/components/status-dot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  activity,
  attendanceTrend,
  departmentAttendance,
  devices,
  hoursTrend,
  lateAnalysis,
  punches,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseHR — Workforce Command Center" },
      {
        name: "description",
        content:
          "Executive attendance dashboard for PulseHR: live biometric device status, presence, late arrivals, overtime and department analytics.",
      },
      { property: "og:title", content: "PulseHR — Workforce Command Center" },
      {
        property: "og:description",
        content:
          "Live biometric attendance, ZKTeco device health and workforce analytics in one enterprise dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel p-5 ${className ?? ""}`}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const online = devices.filter((d) => d.status !== "offline").length;
  const pending = devices.reduce((n, d) => n + d.pendingSync, 0);

  return (
    <AppShell
      title="Workforce Command Center"
      subtitle="Thursday, 6 August · Head Office, Plant & Warehouse · 481 employees in scope"
      actions={
        <>
          <Button variant="outline" size="sm">
            <RefreshCw className="size-4" /> Sync now
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Export day
          </Button>
          <Button size="sm">
            <Plus className="size-4" /> New employee
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Today's attendance" value="92.4%" hint="+1.8% vs last Thursday" icon={Users} />
        <StatCard label="Present" value="411" hint="of 481 scheduled" icon={UserCheck} tone="success" />
        <StatCard label="Late arrivals" value="22" hint="avg 9 min past grace" icon={Clock4} tone="warning" />
        <StatCard label="Absent" value="11" hint="4 unapproved" icon={UserX} tone="destructive" />
        <StatCard label="On leave" value="37" hint="12 casual · 25 planned" icon={Plane} tone="info" />
        <StatCard label="Overtime hours" value="148.5" hint="Production leads all" icon={Timer} />
        <StatCard label="Active devices" value={`${online}/${devices.length}`} hint="heartbeat < 60s" icon={Cpu} tone="success" />
        <StatCard label="Offline devices" value="1" hint="Warehouse Turnstile" icon={CloudOff} tone="destructive" />
        <StatCard label="Pending sync" value={String(pending)} hint="cached on connectors" icon={RefreshCw} tone="warning" />
        <StatCard label="Working hours today" value="3,284" hint="avg 7.9 h / employee" icon={Clock4} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Weekly attendance trend"
          subtitle="Present vs late vs absent"
          className="xl:col-span-2"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={attendanceTrend} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="day" {...axis} />
              <YAxis {...axis} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="present"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#gPresent)"
              />
              <Area
                type="monotone"
                dataKey="late"
                stroke="var(--chart-3)"
                strokeWidth={2}
                fillOpacity={0}
              />
              <Area
                type="monotone"
                dataKey="absent"
                stroke="var(--chart-5)"
                strokeWidth={2}
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Late arrival analysis" subtitle="Distribution past grace time">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lateAnalysis} margin={{ left: -22, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="window" {...axis} />
              <YAxis {...axis} />
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {lateAnalysis.map((_, i) => (
                  <Cell key={i} fill={i > 2 ? "var(--chart-5)" : "var(--chart-3)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Department attendance" subtitle="Present against capacity">
          <div className="space-y-3.5">
            {departmentAttendance.map((d) => {
              const pct = Math.round((d.present / d.capacity) * 100);
              return (
                <div key={d.department}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium">{d.department}</span>
                    <span className="tabular text-muted-foreground">
                      {d.present}/{d.capacity} · {pct}%
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Working hours curve" subtitle="Aggregate hours logged by clock hour">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hoursTrend} margin={{ left: -22, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="hour" {...axis} />
              <YAxis {...axis} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--chart-2)"
                strokeWidth={2}
                fill="url(#gHours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Realtime device status" subtitle="Connector heartbeat over LAN">
          <div className="space-y-2.5">
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-2.5"
              >
                <StatusDot status={d.status} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{d.name}</p>
                  <p className="tabular truncate text-[11px] text-muted-foreground">
                    {d.model} · {d.ip}:{d.port}
                  </p>
                </div>
                <Badge variant="secondary" className="tabular text-[10px]">
                  {d.status === "offline" ? "no link" : `${d.latencyMs} ms`}
                </Badge>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Recent check-ins"
          subtitle="Streaming from all connectors"
          className="xl:col-span-2"
        >
          <div className="divide-y divide-border">
            {punches.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="tabular w-12 text-xs text-muted-foreground">{p.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.employee}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {p.code} · {p.device} · {p.method}
                  </p>
                </div>
                <Badge
                  variant={p.type === "IN" ? "default" : "secondary"}
                  className="text-[10px] tracking-wide"
                >
                  {p.type}
                </Badge>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Activity timeline" subtitle="Audited events today">
          <ol className="relative space-y-4 border-l border-border pl-4">
            {activity.map((a, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-xs leading-relaxed">{a.text}</p>
                <p className="tabular mt-0.5 text-[11px] text-muted-foreground">{a.time}</p>
              </li>
            ))}
          </ol>
        </ChartCard>
      </div>
    </AppShell>
  );
}
