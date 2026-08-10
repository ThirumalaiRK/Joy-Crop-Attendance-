"use client"

import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { LeadCard } from "@/components/crm/lead-card"
import {
  currency,
  leads as initialLeads,
  type Lead,
  type LeadStage,
  leadStages,
} from "@/lib/data"
import { cn } from "@/lib/utils"

export function CrmBoard() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<LeadStage | null>(null)

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {
      new: [],
      qualified: [],
      proposal: [],
      negotiation: [],
      won: [],
    }
    for (const l of leads) map[l.stage].push(l)
    return map
  }, [leads])

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDrop(stage: LeadStage) {
    if (!dragId) return
    setLeads((prev) =>
      prev.map((l) => (l.id === dragId ? { ...l, stage } : l)),
    )
    setDragId(null)
    setOverStage(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {leadStages.map((stage) => {
        const stageLeads = byStage[stage.id]
        const total = stageLeads.reduce((s, l) => s + l.value, 0)
        return (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverStage(stage.id)
            }}
            onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
            onDrop={() => handleDrop(stage.id)}
            className={cn(
              "flex w-[300px] shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/30 transition-colors",
              overStage === stage.id && "border-primary/50 bg-primary/5",
            )}
          >
            <header className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
              <span
                className="size-2.5 rounded-full"
                style={{ background: stage.accent }}
              />
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {stageLeads.length}
              </span>
              <span className="ml-auto text-xs font-medium text-muted-foreground">
                {currency(total)}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2.5 px-3 pb-3">
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  dragging={dragId === lead.id}
                  onDragStart={handleDragStart}
                />
              ))}
              <button className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                <Plus className="size-3.5" />
                Add lead
              </button>
            </div>
          </section>
        )
      })}
    </div>
  )
}
