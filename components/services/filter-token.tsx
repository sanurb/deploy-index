/**
 * Filter Token Component
 *
 * Dismissible inline token representing active filter state.
 * Low-contrast, border-light, removable with single click.
 * Tokens represent state, not actions.
 */

"use client";

import { X } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";

export interface FilterTokenProps {
  readonly label: string;
  readonly value: string;
  readonly onRemove: () => void;
  readonly className?: string;
}

/**
 * Filter token component - low-contrast, border-light, dismissible
 */
export function FilterToken({
  label,
  value,
  onRemove,
  className,
}: FilterTokenProps): React.ReactElement {
  return (
    <button
      aria-label={`Remove filter ${label}: ${value}`}
      className={cn(
        "group inline-flex h-6 items-center gap-1.5 rounded border border-border/30 bg-muted/20 px-2 text-muted-foreground text-xs transition-colors hover:border-border/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
      onClick={onRemove}
      type="button"
    >
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <X
        aria-hidden="true"
        className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100"
      />
    </button>
  );
}
