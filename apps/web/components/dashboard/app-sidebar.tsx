"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  Building2,
  Clock,
  CalendarDays,
  Plane,
  Wallet,
  FileBarChart,
  UserPlus,
  ScrollText,
  Key,
  Coffee,
  BarChart3,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const groups = [
  {
    label: "WORKSPACE",
    items: [
      { title: "Dashboard", url: "/hr", icon: LayoutDashboard },
      { title: "Live Attendance", url: "/hr/attendance", icon: Fingerprint, badge: "live" },
      { title: "Attendance Corrections", url: "/hr/corrections", icon: CalendarDays },
      { title: "Team Status & On-Duty", url: "/hr/team-status", icon: Coffee },
    ],
  },
  {
    label: "EMPLOYEES",
    items: [
      { title: "Employee Directory", url: "/hr/employees", icon: Users },
      { title: "Biometric Enrollment", url: "/hr/biometric-enrollment", icon: Key },
      { title: "Visitors", url: "/hr/visitors", icon: UserPlus },
    ],
  },
  {
    label: "ORGANIZATION",
    items: [
      { title: "Departments & Roles", url: "/hr/departments", icon: Building2 },
      { title: "Shift Rules & Rosters", url: "/hr/shifts", icon: Clock },
      { title: "Holiday Calendar", url: "/hr/holidays", icon: CalendarDays },
    ],
  },
  {
    label: "LEAVE & PAYROLL",
    items: [
      { title: "Leave Requests", url: "/hr/leave", icon: Plane },
      { title: "Pay Codes & Rules", url: "/hr/payroll/pay-codes", icon: ScrollText },
      { title: "Payroll Processing", url: "/hr/payroll/processing", icon: Wallet },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { title: "Attendance Summaries", url: "/hr/reports/attendance", icon: FileBarChart },
      { title: "Payroll & Pay Code Reports", url: "/hr/reports/payroll", icon: BarChart3 },
      { title: "Audit Logs", url: "/hr/reports/audit", icon: ScrollText },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  const isActive = (url: string) => pathname === url;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
            <Fingerprint className="size-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">PulseHR</p>
              <p className="truncate text-[11px] text-muted-foreground">Workforce Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.title}</span>
                            {"badge" in item && item.badge ? (
                              <Badge
                                variant="secondary"
                                className="ml-auto h-5 px-1.5 text-[10px] uppercase"
                              >
                                {item.badge}
                              </Badge>
                            ) : null}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
