import { cn } from "@/lib/utils"

export function MeterBar({
  value,
  className,
  indicatorClassName,
  color,
}: {
  value: number
  className?: string
  indicatorClassName?: string
  color?: string
}) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500",
          indicatorClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  )
}
