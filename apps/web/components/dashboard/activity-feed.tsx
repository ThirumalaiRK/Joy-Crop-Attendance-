import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { activities } from "@/lib/data"

const typeStyles: Record<string, string> = {
  project: "bg-chart-1/15 text-chart-1",
  crm: "bg-success/15 text-success",
  design: "bg-chart-2/15 text-chart-2",
  invoice: "bg-chart-4/15 text-chart-4",
  support: "bg-info/15 text-info",
}

export function ActivityFeed() {
  return (
    <Card className="animate-fade-up">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="relative flex flex-col">
          <span className="absolute bottom-3 left-[15px] top-3 w-px bg-border" />
          {activities.map((a) => (
            <li key={a.id} className="relative flex gap-3 py-2.5">
              <Avatar className="z-10 size-8 shrink-0 ring-4 ring-card">
                <AvatarFallback
                  style={{ background: a.color }}
                  className="text-[10px] font-semibold text-white"
                >
                  {a.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm leading-snug">
                  <span className="font-medium text-foreground">{a.actor}</span>{" "}
                  <span className="text-muted-foreground">{a.action}</span>{" "}
                  <span className="font-medium text-foreground">{a.target}</span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${typeStyles[a.type]}`}
                  >
                    {a.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.time}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
