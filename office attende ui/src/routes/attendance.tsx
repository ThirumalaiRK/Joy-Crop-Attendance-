import { createFileRoute } from "@tanstack/react-router";
import { Download, Filter, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { employees, punches } from "@/lib/mock-data";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Live Attendance — PulseHR" },
      {
        name: "description",
        content:
          "Realtime biometric punch feed with timeline, calendar and table views, manual corrections and approval workflow.",
      },
      { property: "og:title", content: "Live Attendance — PulseHR" },
      {
        property: "og:description",
        content: "Realtime punch feed, timeline and corrections across all ZKTeco terminals.",
      },
    ],
  }),
  component: Attendance,
});

function Attendance() {
  return (
    <AppShell
      title="Attendance"
      subtitle="Live feed · 1,284 punches captured today across 4 terminals"
      actions={
        <>
          <Button variant="outline" size="sm">
            <Filter className="size-4" /> Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Export
          </Button>
        </>
      }
    >
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="employee">By employee</TabsTrigger>
          <TabsTrigger value="corrections">Corrections</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <div className="panel p-5">
            <ol className="relative space-y-5 border-l border-border pl-5">
              {punches.map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[26px] top-1 flex size-3 items-center justify-center rounded-full bg-primary/15">
                    <span className="size-1.5 rounded-full bg-primary" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tabular text-xs text-muted-foreground">{p.time}</span>
                    <span className="text-sm font-medium">{p.employee}</span>
                    <Badge variant={p.type === "IN" ? "default" : "secondary"} className="text-[10px]">
                      {p.type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {p.device} · {p.method} · {p.branch}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <div className="panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {punches.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="tabular text-xs">{p.time}</TableCell>
                    <TableCell className="text-sm font-medium">{p.employee}</TableCell>
                    <TableCell className="tabular text-xs">{p.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{p.device}</TableCell>
                    <TableCell className="text-xs">{p.method}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.branch}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="employee" className="mt-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {employees.slice(0, 12).map((e) => (
              <div key={e.id} className="panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="tabular text-[11px] text-muted-foreground">
                      {e.code} · {e.department}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {e.state}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["In", e.todayIn ?? "—"],
                    ["Out", e.todayOut ?? "—"],
                    ["Hours", e.todayIn && e.todayOut ? "9.2" : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-secondary/70 py-2">
                      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                      <p className="tabular text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="corrections" className="mt-4">
          <div className="panel divide-y divide-border">
            {employees.slice(0, 5).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Missed OUT punch · requested 18:15 · {e.device}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Reject
                </Button>
                <Button size="sm">
                  <CheckCircle2 className="size-4" /> Approve
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
