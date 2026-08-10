import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/types";

export function StatusDot({ status, className }: { status: DeviceStatus; className?: string }) {
  const tone =
    status === "online" ? "bg-success" : status === "syncing" ? "bg-warning" : "bg-destructive";
  return (
    <span className={cn("relative flex size-2.5", className)}>
      <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", tone)} />
      <span className={cn("relative size-2.5 rounded-full", tone)} />
    </span>
  );
}
