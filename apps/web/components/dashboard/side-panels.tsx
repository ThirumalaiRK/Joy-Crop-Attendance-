"use client"

import {
  ArrowUpRight,
  FileText,
  Receipt,
  Sparkles,
  UserPlus,
  Video,
} from "lucide-react"
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts"
import { MeterBar } from "@/components/app/meter-bar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { meetings, projects } from "@/lib/data"
import { cn } from "@/lib/utils"

const statusMeta: Record<string, { label: string; className: string }> = {
  on_track: { label: "On track", className: "bg-success/15 text-success" },
  at_risk: { label: "At risk", className: "bg-warning/15 text-warning" },
  delayed: { label: "Delayed", className: "bg-destructive/15 text-destructive" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground" },
}

export function UpcomingMeetings() {
  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Today&apos;s Meetings</CardTitle>
        <Button variant="ghost" size="xs" className="text-muted-foreground">
          View calendar
          <ArrowUpRight className="size-3" />
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {meetings.map((mt) => (
          <div
            key={mt.id}
            className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40"
          >
            <div
              className="flex h-10 w-1 shrink-0 rounded-full"
              style={{ background: mt.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{mt.title}</p>
              <p className="truncate text-xs text-muted-foreground">{mt.client}</p>
            </div>
            <div className="flex -space-x-2">
              {mt.attendees.map((a) => (
                <Avatar key={a} className="size-6 ring-2 ring-card">
                  <AvatarFallback className="bg-muted text-[9px] font-semibold">
                    {a}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-medium text-muted-foreground">
              {mt.time}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ProjectHealth() {
  const active = projects.filter((p) => p.status !== "completed")
  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle>Project Health</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {active.map((p) => {
          const meta = statusMeta[p.status]
          return (
            <div key={p.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ background: p.clientColor }}
                />
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium",
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MeterBar value={p.progress} color={p.clientColor} />
                <span className="w-9 shrink-0 text-right text-xs font-medium text-muted-foreground">
                  {p.progress}%
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

const quickActions = [
  { label: "New Proposal", icon: FileText },
  { label: "Add Lead", icon: UserPlus },
  { label: "Create Invoice", icon: Receipt },
  { label: "Schedule Meeting", icon: Video },
]

export function QuickActions() {
  return (
    <Card className="animate-fade-up overflow-hidden">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {quickActions.map((a) => (
          <button
            key={a.label}
            className="flex flex-col items-start gap-2 rounded-xl border border-border/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <a.icon className="size-4" />
            </span>
            <span className="text-sm font-medium">{a.label}</span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

export function AiInsight() {
  return (
    <Card className="animate-fade-up relative overflow-hidden border-primary/25 bg-primary/5">
      <CardContent className="flex flex-col gap-3 py-1">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <p className="text-sm font-semibold">AI Insight</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Aria Commerce</span> is
          trending 12 days behind schedule with 34% completion. Consider
          reallocating one engineer from Vertex Platform to de-risk the launch.
        </p>
        <div className="flex gap-2">
          <Button size="sm">Review plan</Button>
          <Button size="sm" variant="ghost">
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Utilization donut
export function UtilizationGauge() {
  const data = [{ name: "util", value: 87, fill: "var(--chart-1)" }]
  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle>Team Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="72%"
              outerRadius="100%"
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar background dataKey="value" cornerRadius={12} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight">87%</span>
            <span className="text-xs text-muted-foreground">48 of 55 billable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
