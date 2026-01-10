"use client";

import { cva } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const sidebarItemVariants = cva(
  "group relative flex h-11 items-center font-medium text-sm transition-colors duration-150 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      view: {
        rail: "justify-center rounded-lg",
        panel: "justify-start gap-3 rounded-lg px-3",
      },
      state: {
        default:
          "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        active: "",
      },
    },
    defaultVariants: {
      view: "panel",
      state: "default",
    },
  }
);

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  tooltip?: string;
  badge?: ReactNode;
  shortcut?: string;
  className?: string;
}

export function SidebarItem({
  icon: Icon,
  label,
  href,
  isActive = false,
  isCollapsed = false,
  tooltip,
  badge,
  shortcut,
  className,
}: SidebarItemProps) {
  const view = isCollapsed ? "rail" : "panel";
  const state = isActive ? "active" : "default";

  const itemContent = (
    <Button
      asChild
      className={cn(
        sidebarItemVariants({ view, state }),
        // Active state styling
        isActive &&
          view === "panel" &&
          "bg-primary text-primary-foreground hover:bg-primary/90",
        // Minimal active indicator for rail: thin left bar (only when collapsed and active)
        isActive &&
          view === "rail" &&
          "text-foreground before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r-full before:bg-primary",
        className
      )}
      variant="ghost"
    >
      <Link aria-current={isActive ? "page" : undefined} href={href}>
        <Icon className="relative size-5 shrink-0" />
        {view === "panel" && (
          <>
            <span className="truncate">{label}</span>
            {badge && <span className="ml-auto">{badge}</span>}
            {shortcut && (
              <span className="ml-auto text-muted-foreground text-xs">
                {shortcut}
              </span>
            )}
          </>
        )}
      </Link>
    </Button>
  );

  // Tooltip only shown in collapsed (rail) view
  if (view === "rail") {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {tooltip ?? label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return itemContent;
}
