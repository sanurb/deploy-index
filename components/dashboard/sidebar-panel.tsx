"use client";

import { Pin, PinOff } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_PINNED_KEY = "sidebar:pinned";

interface SidebarPanelProps {
  children: ReactNode;
  isExpanded: boolean;
  isPinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
  className?: string;
}

export function SidebarPanel({
  children,
  isExpanded,
  isPinned,
  onPinnedChange,
  className,
}: SidebarPanelProps) {
  const handlePinToggle = () => {
    const newPinned = !isPinned;
    localStorage.setItem(SIDEBAR_PINNED_KEY, String(newPinned));
    onPinnedChange(newPinned);
  };

  return (
    <div
      className={cn(
        "absolute top-0 left-[72px] z-50 h-full w-[260px] border-border border-r bg-popover shadow-lg transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isExpanded
          ? "pointer-events-auto translate-x-0 opacity-100"
          : "pointer-events-none -translate-x-2 opacity-0",
        className
      )}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="flex items-center justify-end p-2">
          <Button
            className="size-7"
            onClick={handlePinToggle}
            size="icon"
            variant="ghost"
          >
            {isPinned ? (
              <PinOff className="size-4" />
            ) : (
              <Pin className="size-4" />
            )}
            <span className="sr-only">
              {isPinned ? "Unpin sidebar" : "Pin sidebar"}
            </span>
          </Button>
        </div>
        <div className="flex-1 px-3">{children}</div>
      </div>
    </div>
  );
}
