import { MeterBar } from "@/components/app/meter-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { crmFunnel } from "@/lib/data"

const colors = [
  "oklch(0.68 0.02 265)",
  "oklch(0.7 0.14 233)",
  "oklch(0.62 0.2 274)",
  "oklch(0.78 0.15 75)",
  "oklch(0.72 0.17 150)",
]

export function CrmFunnel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Conversion across the pipeline this quarter
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {crmFunnel.map((step, i) => (
          <div key={step.stage} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.stage}</span>
              <span className="text-muted-foreground">
                {step.count} · {step.value}%
              </span>
            </div>
            <MeterBar
              value={step.value}
              color={colors[i]}
              className="h-2.5"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
