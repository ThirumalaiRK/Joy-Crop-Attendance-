import {
  LayoutDashboard,
  Users,
  Contact,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Receipt,
  Wallet,
  LifeBuoy,
  UsersRound,
  IdCard,
  BarChart3,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  soon?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "CRM", href: "/crm", icon: Users, badge: "12" },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, soon: true },
      { label: "Calendar", href: "/calendar", icon: Calendar, soon: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Clients", href: "/clients", icon: Contact, soon: true },
      { label: "Documents", href: "/documents", icon: FileText, soon: true },
      { label: "Invoices", href: "/invoices", icon: Receipt, soon: true },
      { label: "Finance", href: "/finance", icon: Wallet, soon: true },
      { label: "Support", href: "/support", icon: LifeBuoy, badge: "3", soon: true },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Team", href: "/team", icon: UsersRound, soon: true },
      { label: "HR", href: "/hr", icon: IdCard, soon: true },
      { label: "Reports", href: "/reports", icon: BarChart3, soon: true },
      { label: "Settings", href: "/settings", icon: Settings, soon: true },
    ],
  },
]

export const aiNavItem: NavItem = {
  label: "AI Assistant",
  href: "/assistant",
  icon: Sparkles,
  soon: true,
}
