"use client";

import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/dashboard-shell";

export type DashboardHeaderConfig = {
  readonly title?: ReactNode;
  readonly tabs?: ReactNode;
  readonly side?: ReactNode;
  readonly subheader?: ReactNode;
};

export function DashboardLayout({
  children,
  header,
}: {
  readonly children: ReactNode;
  readonly header?: DashboardHeaderConfig;
}) {
  return <DashboardShell header={header}>{children}</DashboardShell>;
}
