import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Plus, Download, Fingerprint, ScanFace, CreditCard } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { employees } from "@/lib/mock-data";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employee Directory — PulseHR" },
      {
        name: "description",
        content:
          "Search, filter and manage employee records, biometric enrolment status, shifts and device mapping across every branch.",
      },
      { property: "og:title", content: "Employee Directory — PulseHR" },
      {
        property: "og:description",
        content: "Manage employees, biometric enrolment status and device mapping in PulseHR.",
      },
    ],
  }),
  component: Employees,
});

function stateTone(state: string) {
  if (state === "Present") return "bg-success/12 text-success";
  if (state === "Late") return "bg-warning/15 text-warning";
  if (state === "On Leave") return "bg-info/12 text-info";
  return "bg-destructive/12 text-destructive";
}

function Employees() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const rows = employees.filter((e) =>
    `${e.name} ${e.code} ${e.department} ${e.branch}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell
      title="Employees"
      subtitle={`${employees.length} records · biometric templates synced to 4 terminals`}
      actions={
        <>
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Export
          </Button>
          <Button size="sm">
            <Plus className="size-4" /> Add employee
          </Button>
        </>
      }
    >
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code, department…"
              className="pl-8"
            />
          </div>
          {selected.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selected.length} selected</span>
              <Button variant="outline" size="sm">
                Push to device
              </Button>
              <Button variant="outline" size="sm">
                Assign shift
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Biometrics</TableHead>
                <TableHead>Today</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id} className="hover:bg-secondary/50">
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(e.id)}
                      onCheckedChange={(v) =>
                        setSelected((s) => (v ? [...s, e.id] : s.filter((x) => x !== e.id)))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link to="/employees" className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-secondary text-[11px]">
                          {e.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{e.name}</p>
                        <p className="tabular text-[11px] text-muted-foreground">
                          {e.code} · {e.designation}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{e.department}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.branch}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.shift}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Fingerprint
                        className={`size-4 ${e.fingerprint ? "text-success" : "text-muted-foreground/40"}`}
                      />
                      <ScanFace
                        className={`size-4 ${e.face ? "text-success" : "text-muted-foreground/40"}`}
                      />
                      <CreditCard
                        className={`size-4 ${e.rfid ? "text-success" : "text-muted-foreground/40"}`}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="tabular text-xs">
                    {e.todayIn ? `${e.todayIn} → ${e.todayOut ?? "—"}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={stateTone(e.state)}>
                      {e.state}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
