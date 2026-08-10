"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { Card } from "@/components/ui/card"
import { metrics } from "@/lib/data"
import { cn } from "@/lib/utils"

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, i) => {
        const positive = metric.trend === "up"
        return (
          <Card
            key={metric.id}
            className="animate-fade-up gap-3 p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </p>
              <span
                className={cn(
                  "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  positive
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive",
                )}
              >
                {positive ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {Math.abs(metric.delta)}%
              </span>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight lg:text-3xl">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.sublabel}
                </p>
              </div>
              <div className="h-12 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={metric.spark.map((v, idx) => ({ i: idx, v }))}
                    margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
                  >
                    <defs>
                      <linearGradient id={`spark-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={positive ? "var(--success)" : "var(--destructive)"}
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor={positive ? "var(--success)" : "var(--destructive)"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={positive ? "var(--success)" : "var(--destructive)"}
                      strokeWidth={2}
                      fill={`url(#spark-${metric.id})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
