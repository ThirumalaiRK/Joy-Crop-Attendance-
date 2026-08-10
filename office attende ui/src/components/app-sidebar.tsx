import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Fingerprint,
  Cpu,
  Building2,
  Clock,
  CalendarDays,
  Plane,
  Wallet,
  FileBarChart,
  Settings,
  ShieldCheck,
  UserPlus,
  ScrollText,
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
    label: "Workspace",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Attendance", url: "/attendance", icon: Fingerprint, badge: "live" },
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Devices", url: "/devices", icon: Cpu, badge: "1" },
    ],
  },
  {
    label: "Organization",
    items: [
      { title: "Departments", url: "/departments", icon: Building2 },
      { title: "Shifts & Schedules", url: "/shifts", icon: Clock },
      { title: "Holiday Calendar", url: "/holidays", icon: CalendarDays },
      { title: "Leave", url: "/leave", icon: Plane },
    ],
  },
  {
    label: "Finance & Insight",
    items: [
      { title: "Payroll", url: "/payroll", icon: Wallet },
      { title: "Reports", url: "/reports", icon: FileBarChart },
      { title: "Audit Logs", url: "/audit", icon: ScrollText },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Visitors", url: "/visitors", icon: UserPlus },
      { title: "Access Control", url: "/access-control", icon: ShieldCheck },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

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
                      <Link to={item.url} className="flex items-center gap-2">
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
