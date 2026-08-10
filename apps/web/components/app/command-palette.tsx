"use client"

import {
  ArrowUpRight,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Receipt,
  Sparkles,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { leads, projects } from "@/lib/data"

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()

  function go(href: string) {
    onOpenChange(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-xl">
      <CommandInput placeholder="Search projects, leads, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard />
            Go to Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/crm")}>
            <Users />
            Go to CRM Pipeline
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban />
            Go to Projects
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick actions">
          <CommandItem onSelect={() => go("/crm")}>
            <Plus />
            Create new lead
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/projects")}>
            <FolderKanban />
            Create new project
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard")}>
            <Receipt />
            Generate invoice
          </CommandItem>
          <CommandItem onSelect={() => go("/dashboard")}>
            <Sparkles />
            Ask the AI assistant
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {projects.slice(0, 4).map((p) => (
            <CommandItem key={p.id} onSelect={() => go("/projects")}>
              <FolderKanban />
              {p.name}
              <ArrowUpRight className="ml-auto opacity-40" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Leads">
          {leads.slice(0, 4).map((l) => (
            <CommandItem key={l.id} onSelect={() => go("/crm")}>
              <FileText />
              {l.company}
              <span className="ml-auto text-xs text-muted-foreground">
                {l.contact}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
