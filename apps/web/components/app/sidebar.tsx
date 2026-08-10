"use client"

import { ChevronsUpDown, Command, LogOut, Settings, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { navSections } from "@/lib/nav"
import { cn } from "@/lib/utils"

function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5 text-left transition-colors hover:bg-card/80",
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Command className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">AgencyOS</p>
          <p className="truncate text-xs text-muted-foreground">Meridian Studio · Pro</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
            M
          </div>
          Meridian Studio
          <Badge variant="secondary" className="ml-auto">
            Pro
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-chart-2 text-[10px] font-bold text-primary-foreground">
            N
          </div>
          Northwind Inc.
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-muted-foreground">
          <Settings className="size-4" />
          Workspace settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  soon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: string
  soon?: boolean
}) {
  return (
    <Link
      href={soon ? "#" : href}
      aria-disabled={soon}
      onClick={(e) => soon && e.preventDefault()}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        soon && "cursor-default opacity-55 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
      {badge && !soon && (
        <Badge className="ml-auto h-5 min-w-5 justify-center px-1.5">{badge}</Badge>
      )}
      {soon && (
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Soon
        </span>
      )}
    </Link>
  )
}

export function SidebarContent() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col gap-4 bg-sidebar p-4">
      <WorkspaceSwitcher />

      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="flex flex-col gap-6 pb-4">
          {navSections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  soon={item.soon}
                  active={pathname === item.href}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-primary/10 p-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">AI Assistant</p>
            <p className="truncate text-xs text-muted-foreground">Draft, summarize & plan</p>
          </div>
        </div>
      </div>

      <ProfileMenu />
    </div>
  )
}

function ProfileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-2.5 py-2 text-left transition-colors hover:bg-card/80">
        <Avatar className="size-8">
          <AvatarFallback style={{ background: "oklch(0.62 0.2 274)" }} className="text-xs font-semibold text-white">
            EC
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">Evan Carter</p>
          <p className="truncate text-xs text-muted-foreground">Agency Owner</p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">Evan Carter</p>
          <p className="text-xs font-normal text-muted-foreground">evan@meridian.studio</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="size-4" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Sparkles className="size-4" />
          Upgrade plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
