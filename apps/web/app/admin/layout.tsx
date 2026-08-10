import type { ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  // AppShell already handles the layout structure
  return <>{children}</>;
}
