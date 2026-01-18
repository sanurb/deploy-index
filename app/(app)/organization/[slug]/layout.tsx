import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/dashboard-shell";

/**
 * Organization-scoped layout.
 * All routes under /organization/:slug/* share this layout (sidebar, chrome).
 * Protection is handled by parent (app)/layout.tsx via ProtectedRoute.
 * No need for ProtectedRoute here - parent already guards.
 */
export default function OrganizationLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
