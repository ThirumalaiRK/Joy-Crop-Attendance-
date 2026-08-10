import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export function ModulePage({
  title,
  subtitle,
  blocks,
  children,
}: {
  title: string;
  subtitle: string;
  blocks: { heading: string; body: string }[];
  children?: ReactNode;
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      {children}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((b) => (
          <div key={b.heading} className="panel p-5">
            <h2 className="text-sm font-semibold">{b.heading}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{b.body}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
