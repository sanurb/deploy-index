import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/dashboard-shell";

/**
 * Account-scoped layout.
 * Protected by parent (app)/layout.tsx.
 * No organization assumptions - this is user-scoped.
 */
export default function AccountLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
