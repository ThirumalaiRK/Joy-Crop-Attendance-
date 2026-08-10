"use client"

import { Bell, PanelLeft, Plus, Search } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { activities } from "@/lib/data"

export function Topbar({
  title,
  onOpenSearch,
  onOpenSidebar,
}: {
  title: string
  onOpenSearch: () => void
  onOpenSidebar: () => void
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <PanelLeft className="size-4" />
      </Button>

      <h1 className="text-base font-semibold lg:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden h-9 w-64 items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-card/80 md:flex xl:w-80"
        >
          <Search className="size-4" />
          <span>Search everything...</span>
          <kbd className="ml-auto flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Search"
          onClick={onOpenSearch}
        >
          <Search className="size-4" />
        </Button>

        <NotificationsMenu />
        <ThemeToggle />

        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  )
}

function NotificationsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        <span className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-background" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Badge variant="secondary">6 new</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activities.slice(0, 5).map((a) => (
          <DropdownMenuItem key={a.id} className="items-start gap-3 py-2">
            <Avatar className="mt-0.5 size-7">
              <AvatarFallback
                style={{ background: a.color }}
                className="text-[10px] font-semibold text-white"
              >
                {a.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs leading-snug">
                <span className="font-medium text-foreground">{a.actor}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>{" "}
                <span className="font-medium text-foreground">{a.target}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{a.time}</p>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-primary">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
