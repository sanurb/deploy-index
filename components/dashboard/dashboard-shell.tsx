// components/dashboard/dashboard-shell.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar";
import type { DashboardHeaderConfig } from "@/components/dashboard/dashboard-layout";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import { ViewHeader } from "@/components/dashboard/view-header";

const SIDEBAR_OPEN_KEY = "sidebar:open";

function readSidebarDefaultOpen(): boolean {
  try {
    const stored = localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function PersistSidebarOpenState() {
  const { open } = useSidebar();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
    } catch {
      // ignore
    }
  }, [open]);

  return null;
}

export default function DashboardShell({
  children,
  header,
}: {
  readonly children: ReactNode;
  readonly header?: DashboardHeaderConfig;
}) {
  const [defaultOpen, setDefaultOpen] = useState(true);

  useEffect(() => {
    setDefaultOpen(readSidebarDefaultOpen());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SidebarProvider defaultOpen={defaultOpen}>
        <PersistSidebarOpenState />

        <div className="flex h-dvh w-full">
          <DashboardSidebar />

          <SidebarInset className="min-w-0 bg-background">
            {/* Single chrome separator lives inside ViewHeader */}
            <ViewHeader header={header} />

            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="w-full px-4 py-4 md:px-6 md:py-5">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
