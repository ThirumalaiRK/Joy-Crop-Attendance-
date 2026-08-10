"use client"

import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { CommandPalette } from "@/components/app/command-palette"
import { SidebarContent } from "@/components/app/sidebar"
import { Topbar } from "@/components/app/topbar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/crm": "CRM Pipeline",
  "/projects": "Projects",
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const title = titles[pathname] ?? "AgencyOS"

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const openSidebar = useCallback(() => setMobileOpen(true), [])

  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-border/60 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div onClick={() => setMobileOpen(false)} className="h-full">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px]">
        <Topbar title={title} onOpenSearch={openSearch} onOpenSidebar={openSidebar} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
