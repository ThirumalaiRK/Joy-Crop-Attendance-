"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Search, Bell, Command as CommandIcon } from "lucide-react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const commands = [
  { label: "Go to Dashboard", href: "/hr" },
  { label: "Live Attendance Feed", href: "/hr/attendance" },
  { label: "Employee Directory", href: "/hr/employees" },
  { label: "Device Center", href: "/admin/devices" },
  { label: "Shifts & Schedules", href: "/hr/shifts" },
  { label: "Leave Requests", href: "/hr/leave" },
  { label: "Payroll Preparation", href: "/hr/payroll" },
  { label: "Reports & Exports", href: "/hr/reports" },
  { label: "Settings", href: "/admin/settings" },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-t-0 border-x-0 px-4">
            <SidebarTrigger />
            <button
              onClick={() => setOpen(true)}
              className="hidden h-9 flex-1 max-w-md items-center gap-2 rounded-lg border border-input bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary sm:flex"
            >
              <Search className="size-4" />
              <span>Search employees, devices, reports…</span>
              <kbd className="tabular ml-auto flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px]">
                <CommandIcon className="size-3" />K
              </kbd>
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => setDark((v) => !v)} aria-label="Toggle theme">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-4" />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
              </Button>
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">AV</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1400px]">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
                  {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to a module or run an action…" />
        <CommandList>
          <CommandEmpty>No matches found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {commands.map((c) => (
              <CommandItem
                key={c.href}
                value={c.label}
                onSelect={() => {
                  setOpen(false);
                  router.push(c.href);
                }}
              >
                {c.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SidebarProvider>
  );
}
