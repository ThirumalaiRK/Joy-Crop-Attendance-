// ---------------------------------------------------------------------------
// AgencyOS mock data
// Realistic in-memory sample data powering the UI-first build.
// ---------------------------------------------------------------------------

export type Trend = "up" | "down"

export interface Metric {
  id: string
  label: string
  value: string
  sublabel: string
  delta: number
  trend: Trend
  spark: number[]
}

export const metrics: Metric[] = [
  {
    id: "mrr",
    label: "Monthly Recurring Revenue",
    value: "$248,900",
    sublabel: "vs. last month",
    delta: 12.4,
    trend: "up",
    spark: [30, 42, 38, 51, 49, 62, 74, 68, 81, 92, 88, 104],
  },
  {
    id: "arr",
    label: "Annual Run Rate",
    value: "$2.98M",
    sublabel: "projected",
    delta: 9.1,
    trend: "up",
    spark: [40, 44, 48, 52, 55, 61, 66, 70, 77, 82, 90, 98],
  },
  {
    id: "pending",
    label: "Pending Payments",
    value: "$64,200",
    sublabel: "across 14 invoices",
    delta: -4.2,
    trend: "down",
    spark: [80, 74, 78, 70, 66, 72, 60, 64, 58, 55, 62, 50],
  },
  {
    id: "utilization",
    label: "Team Utilization",
    value: "87%",
    sublabel: "48 of 55 billable",
    delta: 3.6,
    trend: "up",
    spark: [60, 63, 61, 68, 72, 70, 75, 78, 74, 80, 83, 87],
  },
]

export const revenueSeries = [
  { month: "Jan", revenue: 182, expenses: 118, profit: 64 },
  { month: "Feb", revenue: 196, expenses: 124, profit: 72 },
  { month: "Mar", revenue: 205, expenses: 131, profit: 74 },
  { month: "Apr", revenue: 224, expenses: 138, profit: 86 },
  { month: "May", revenue: 218, expenses: 142, profit: 76 },
  { month: "Jun", revenue: 241, expenses: 149, profit: 92 },
  { month: "Jul", revenue: 236, expenses: 151, profit: 85 },
  { month: "Aug", revenue: 258, expenses: 158, profit: 100 },
  { month: "Sep", revenue: 249, expenses: 154, profit: 95 },
  { month: "Oct", revenue: 271, expenses: 162, profit: 109 },
  { month: "Nov", revenue: 264, expenses: 165, profit: 99 },
  { month: "Dec", revenue: 289, expenses: 171, profit: 118 },
]

export const projectProgress = [
  { name: "Discovery", value: 100 },
  { name: "Design", value: 92 },
  { name: "Build", value: 68 },
  { name: "QA", value: 41 },
  { name: "Launch", value: 18 },
]

export const utilizationSeries = [
  { day: "Mon", billable: 82, internal: 18 },
  { day: "Tue", billable: 88, internal: 12 },
  { day: "Wed", billable: 79, internal: 21 },
  { day: "Thu", billable: 91, internal: 9 },
  { day: "Fri", billable: 74, internal: 26 },
  { day: "Sat", billable: 22, internal: 8 },
  { day: "Sun", billable: 12, internal: 4 },
]

export interface TeamMember {
  id: string
  name: string
  role: string
  initials: string
  avatarColor: string
  utilization: number
  status: "online" | "away" | "offline"
}

export const team: TeamMember[] = [
  { id: "u1", name: "Ava Mitchell", role: "Design Lead", initials: "AM", avatarColor: "oklch(0.62 0.2 274)", utilization: 92, status: "online" },
  { id: "u2", name: "Rajiv Menon", role: "Senior Engineer", initials: "RM", avatarColor: "oklch(0.62 0.22 300)", utilization: 88, status: "online" },
  { id: "u3", name: "Sofia Alvarez", role: "Project Manager", initials: "SA", avatarColor: "oklch(0.7 0.14 233)", utilization: 76, status: "away" },
  { id: "u4", name: "Daniel Cho", role: "Frontend Engineer", initials: "DC", avatarColor: "oklch(0.72 0.17 150)", utilization: 81, status: "online" },
  { id: "u5", name: "Priya Nair", role: "QA Engineer", initials: "PN", avatarColor: "oklch(0.78 0.15 75)", utilization: 69, status: "offline" },
  { id: "u6", name: "Marcus Webb", role: "Sales Director", initials: "MW", avatarColor: "oklch(0.68 0.2 25)", utilization: 64, status: "online" },
]

export interface Activity {
  id: string
  actor: string
  initials: string
  color: string
  action: string
  target: string
  time: string
  type: "project" | "invoice" | "crm" | "support" | "design"
}

export const activities: Activity[] = [
  { id: "a1", actor: "Sofia Alvarez", initials: "SA", color: "oklch(0.7 0.14 233)", action: "moved", target: "Northwind Redesign to QA", time: "6m ago", type: "project" },
  { id: "a2", actor: "Marcus Webb", initials: "MW", color: "oklch(0.68 0.2 25)", action: "closed a deal with", target: "Lumen Health — $84,000", time: "41m ago", type: "crm" },
  { id: "a3", actor: "Ava Mitchell", initials: "AM", color: "oklch(0.62 0.2 274)", action: "requested approval on", target: "Orbit Mobile — Home v4", time: "1h ago", type: "design" },
  { id: "a4", actor: "Finance Bot", initials: "FB", color: "oklch(0.72 0.17 150)", action: "generated invoice", target: "#INV-2043 for Vertex Labs", time: "2h ago", type: "invoice" },
  { id: "a5", actor: "Priya Nair", initials: "PN", color: "oklch(0.78 0.15 75)", action: "resolved ticket", target: "#SUP-318 — SSL renewal", time: "3h ago", type: "support" },
  { id: "a6", actor: "Rajiv Menon", initials: "RM", color: "oklch(0.62 0.22 300)", action: "deployed", target: "Aria Commerce to production", time: "5h ago", type: "project" },
]

export interface Meeting {
  id: string
  title: string
  client: string
  time: string
  attendees: string[]
  color: string
}

export const meetings: Meeting[] = [
  { id: "m1", title: "Sprint Review", client: "Northwind", time: "10:00 AM", attendees: ["SA", "RM", "DC"], color: "oklch(0.62 0.2 274)" },
  { id: "m2", title: "Discovery Call", client: "Lumen Health", time: "12:30 PM", attendees: ["MW", "AM"], color: "oklch(0.72 0.17 150)" },
  { id: "m3", title: "Design Handoff", client: "Orbit", time: "2:00 PM", attendees: ["AM", "DC", "PN"], color: "oklch(0.62 0.22 300)" },
  { id: "m4", title: "QBR — Vertex Labs", client: "Vertex Labs", time: "4:15 PM", attendees: ["SA", "MW"], color: "oklch(0.7 0.14 233)" },
]

// --------------------------------------------------------------------------
// CRM
// --------------------------------------------------------------------------

export type LeadStage = "new" | "qualified" | "proposal" | "negotiation" | "won"

export const leadStages: { id: LeadStage; label: string; accent: string }[] = [
  { id: "new", label: "New Leads", accent: "oklch(0.68 0.02 265)" },
  { id: "qualified", label: "Qualified", accent: "oklch(0.7 0.14 233)" },
  { id: "proposal", label: "Proposal Sent", accent: "oklch(0.62 0.2 274)" },
  { id: "negotiation", label: "Negotiation", accent: "oklch(0.78 0.15 75)" },
  { id: "won", label: "Won", accent: "oklch(0.72 0.17 150)" },
]

export interface Lead {
  id: string
  company: string
  contact: string
  initials: string
  color: string
  value: number
  stage: LeadStage
  score: number
  source: string
  owner: string
  updated: string
  tags: string[]
}

export const leads: Lead[] = [
  { id: "l1", company: "Lumen Health", contact: "Dr. Elena Ross", initials: "LH", color: "oklch(0.72 0.17 150)", value: 84000, stage: "negotiation", score: 92, source: "Referral", owner: "MW", updated: "2h ago", tags: ["Healthcare", "Retainer"] },
  { id: "l2", company: "Vertex Labs", contact: "Tom Bradley", initials: "VL", color: "oklch(0.7 0.14 233)", value: 128000, stage: "proposal", score: 87, source: "Inbound", owner: "MW", updated: "5h ago", tags: ["SaaS", "Enterprise"] },
  { id: "l3", company: "Aria Commerce", contact: "Nina Patel", initials: "AC", color: "oklch(0.62 0.2 274)", value: 46000, stage: "qualified", score: 74, source: "LinkedIn", owner: "SA", updated: "1d ago", tags: ["E-commerce"] },
  { id: "l4", company: "Northstar Capital", contact: "Greg Munoz", initials: "NC", color: "oklch(0.78 0.15 75)", value: 210000, stage: "negotiation", score: 95, source: "Event", owner: "MW", updated: "3h ago", tags: ["Fintech", "Enterprise"] },
  { id: "l5", company: "Pixel Forge", contact: "Amelia Cruz", initials: "PF", color: "oklch(0.62 0.22 300)", value: 32000, stage: "new", score: 58, source: "Website", owner: "SA", updated: "20m ago", tags: ["Startup"] },
  { id: "l6", company: "GreenLeaf", contact: "Owen Park", initials: "GL", color: "oklch(0.72 0.17 150)", value: 54000, stage: "new", score: 61, source: "Referral", owner: "MW", updated: "1h ago", tags: ["Sustainability"] },
  { id: "l7", company: "Cobalt AI", contact: "Yuki Tanaka", initials: "CA", color: "oklch(0.62 0.2 274)", value: 176000, stage: "qualified", score: 83, source: "Inbound", owner: "MW", updated: "8h ago", tags: ["AI", "Enterprise"] },
  { id: "l8", company: "Harbor Point", contact: "Lena Fischer", initials: "HP", color: "oklch(0.7 0.14 233)", value: 68000, stage: "proposal", score: 79, source: "Referral", owner: "SA", updated: "1d ago", tags: ["Hospitality"] },
  { id: "l9", company: "Meridian Group", contact: "Carl Estevez", initials: "MG", color: "oklch(0.78 0.15 75)", value: 92000, stage: "won", score: 100, source: "Referral", owner: "MW", updated: "2d ago", tags: ["Retail", "Retainer"] },
  { id: "l10", company: "Solace Media", contact: "Ruby Adeyemi", initials: "SM", color: "oklch(0.62 0.22 300)", value: 38000, stage: "won", score: 100, source: "Inbound", owner: "SA", updated: "3d ago", tags: ["Media"] },
  { id: "l11", company: "Bluewave", contact: "Ian McGregor", initials: "BW", color: "oklch(0.72 0.17 150)", value: 71000, stage: "qualified", score: 70, source: "Event", owner: "MW", updated: "6h ago", tags: ["Logistics"] },
  { id: "l12", company: "Zenith Studios", contact: "Farah Khan", initials: "ZS", color: "oklch(0.62 0.2 274)", value: 44000, stage: "proposal", score: 66, source: "LinkedIn", owner: "SA", updated: "12h ago", tags: ["Creative"] },
]

export const crmFunnel = [
  { stage: "Leads", value: 100, count: 340 },
  { stage: "Qualified", value: 62, count: 211 },
  { stage: "Proposal", value: 38, count: 129 },
  { stage: "Negotiation", value: 21, count: 71 },
  { stage: "Won", value: 12, count: 41 },
]

// --------------------------------------------------------------------------
// Projects
// --------------------------------------------------------------------------

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done"
export type Priority = "low" | "medium" | "high" | "urgent"

export const taskColumns: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "In Review" },
  { id: "done", label: "Done" },
]

export interface Task {
  id: string
  key: string
  title: string
  status: TaskStatus
  priority: Priority
  assignee: TeamMember
  project: string
  labels: string[]
  points: number
  comments: number
  subtasks: { done: number; total: number }
  due: string
}

const m = (i: number) => team[i]

export const tasks: Task[] = [
  { id: "t1", key: "NW-142", title: "Refactor checkout to server actions", status: "in_progress", priority: "high", assignee: m(1), project: "Northwind Redesign", labels: ["Frontend"], points: 5, comments: 4, subtasks: { done: 2, total: 5 }, due: "Aug 6" },
  { id: "t2", key: "NW-118", title: "Design system audit & token cleanup", status: "review", priority: "medium", assignee: m(0), project: "Northwind Redesign", labels: ["Design"], points: 3, comments: 7, subtasks: { done: 4, total: 4 }, due: "Aug 4" },
  { id: "t3", key: "OR-231", title: "Mobile nav gesture interactions", status: "todo", priority: "high", assignee: m(3), project: "Orbit Mobile", labels: ["Frontend", "Mobile"], points: 8, comments: 2, subtasks: { done: 0, total: 6 }, due: "Aug 9" },
  { id: "t4", key: "VX-087", title: "Set up multi-tenant RBAC", status: "in_progress", priority: "urgent", assignee: m(1), project: "Vertex Platform", labels: ["Backend"], points: 13, comments: 9, subtasks: { done: 3, total: 8 }, due: "Aug 5" },
  { id: "t5", key: "AR-045", title: "Cart abandonment email flow", status: "backlog", priority: "low", assignee: m(3), project: "Aria Commerce", labels: ["Growth"], points: 3, comments: 1, subtasks: { done: 0, total: 3 }, due: "Aug 14" },
  { id: "t6", key: "NW-150", title: "QA regression pass — checkout", status: "todo", priority: "medium", assignee: m(4), project: "Northwind Redesign", labels: ["QA"], points: 5, comments: 0, subtasks: { done: 0, total: 4 }, due: "Aug 8" },
  { id: "t7", key: "OR-198", title: "Onboarding illustration set", status: "review", priority: "low", assignee: m(0), project: "Orbit Mobile", labels: ["Design"], points: 3, comments: 5, subtasks: { done: 3, total: 3 }, due: "Aug 3" },
  { id: "t8", key: "VX-091", title: "Usage-based billing metering", status: "backlog", priority: "high", assignee: m(1), project: "Vertex Platform", labels: ["Backend"], points: 8, comments: 3, subtasks: { done: 0, total: 5 }, due: "Aug 18" },
  { id: "t9", key: "AR-052", title: "Product page performance (LCP)", status: "done", priority: "medium", assignee: m(3), project: "Aria Commerce", labels: ["Frontend"], points: 5, comments: 6, subtasks: { done: 4, total: 4 }, due: "Aug 1" },
  { id: "t10", key: "NW-101", title: "Accessibility WCAG AA sweep", status: "in_progress", priority: "medium", assignee: m(4), project: "Northwind Redesign", labels: ["QA", "A11y"], points: 5, comments: 2, subtasks: { done: 6, total: 10 }, due: "Aug 7" },
  { id: "t11", key: "OR-210", title: "Push notification service", status: "todo", priority: "urgent", assignee: m(1), project: "Orbit Mobile", labels: ["Backend", "Mobile"], points: 8, comments: 4, subtasks: { done: 1, total: 6 }, due: "Aug 6" },
  { id: "t12", key: "VX-060", title: "Marketing site CMS migration", status: "done", priority: "low", assignee: m(0), project: "Vertex Platform", labels: ["Frontend"], points: 3, comments: 8, subtasks: { done: 5, total: 5 }, due: "Jul 30" },
  { id: "t13", key: "AR-061", title: "Wishlist & saved items", status: "review", priority: "medium", assignee: m(3), project: "Aria Commerce", labels: ["Frontend"], points: 5, comments: 3, subtasks: { done: 2, total: 3 }, due: "Aug 5" },
  { id: "t14", key: "NW-160", title: "Analytics event taxonomy", status: "backlog", priority: "low", assignee: m(2), project: "Northwind Redesign", labels: ["Data"], points: 2, comments: 1, subtasks: { done: 0, total: 2 }, due: "Aug 20" },
]

export interface Project {
  id: string
  name: string
  client: string
  clientColor: string
  status: "on_track" | "at_risk" | "delayed" | "completed"
  progress: number
  budget: number
  spent: number
  dueDate: string
  team: TeamMember[]
  tasksOpen: number
  tasksTotal: number
  health: number
}

export const projects: Project[] = [
  { id: "p1", name: "Northwind Redesign", client: "Northwind", clientColor: "oklch(0.62 0.2 274)", status: "at_risk", progress: 68, budget: 180000, spent: 142000, dueDate: "Aug 22, 2026", team: [team[0], team[1], team[3], team[4]], tasksOpen: 18, tasksTotal: 54, health: 72 },
  { id: "p2", name: "Orbit Mobile App", client: "Orbit", clientColor: "oklch(0.62 0.22 300)", status: "on_track", progress: 45, budget: 240000, spent: 96000, dueDate: "Oct 3, 2026", team: [team[0], team[3], team[1]], tasksOpen: 31, tasksTotal: 62, health: 88 },
  { id: "p3", name: "Vertex Platform", client: "Vertex Labs", clientColor: "oklch(0.7 0.14 233)", status: "on_track", progress: 82, budget: 320000, spent: 251000, dueDate: "Sep 12, 2026", team: [team[1], team[0], team[2]], tasksOpen: 12, tasksTotal: 88, health: 91 },
  { id: "p4", name: "Aria Commerce", client: "Aria", clientColor: "oklch(0.72 0.17 150)", status: "delayed", progress: 34, budget: 140000, spent: 88000, dueDate: "Aug 30, 2026", team: [team[3], team[4]], tasksOpen: 24, tasksTotal: 41, health: 58 },
  { id: "p5", name: "Meridian Rebrand", client: "Meridian", clientColor: "oklch(0.78 0.15 75)", status: "completed", progress: 100, budget: 96000, spent: 92000, dueDate: "Jul 18, 2026", team: [team[0], team[2]], tasksOpen: 0, tasksTotal: 37, health: 100 },
]

export function currency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}
