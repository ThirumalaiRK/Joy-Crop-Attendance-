"use client"

import { Clock, GripVertical } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { currency, type Lead } from "@/lib/data"
import { cn } from "@/lib/utils"

function scoreColor(score: number) {
  if (score >= 85) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-muted-foreground"
}

export function LeadCard({
  lead,
  onDragStart,
  dragging,
}: {
  lead: Lead
  onDragStart: (e: React.DragEvent, id: string) => void
  dragging?: boolean
}) {
  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className={cn(
        "group cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback
            style={{ background: lead.color }}
            className="text-[10px] font-semibold text-white"
          >
            {lead.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{lead.company}</p>
          <p className="truncate text-xs text-muted-foreground">{lead.contact}</p>
        </div>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {lead.tags.map((t) => (
          <Badge key={t} variant="outline" className="h-5 text-[10px]">
            {t}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
        <span className="text-sm font-semibold tracking-tight">
          {currency(lead.value)}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Score</span>
          <span className={cn("text-sm font-semibold", scoreColor(lead.score))}>
            {lead.score}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {lead.updated}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="rounded bg-muted px-1.5 py-0.5">{lead.source}</span>
        </span>
      </div>
    </article>
  )
}
