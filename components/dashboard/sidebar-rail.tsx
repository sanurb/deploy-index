"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarRailProps {
  children: ReactNode;
  className?: string;
  isPanelExpanded?: boolean;
}

export function SidebarRail({
  children,
  className,
  isPanelExpanded = false,
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "relative z-40 flex w-[72px] flex-col border-border border-r bg-sidebar transition-opacity duration-200",
        // Linear principle: Rail de-emphasizes when panel is open
        isPanelExpanded && "opacity-60",
        className
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto py-3">
        {children}
      </div>
    </aside>
  );
}
