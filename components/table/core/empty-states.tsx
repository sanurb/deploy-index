"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  /** Title to display */
  title: string;
  /** Description text (can include line breaks with <br />) */
  description: ReactNode;
  /** Label for the action button */
  actionLabel: string;
  /** Callback when action button is clicked */
  onAction: () => void;
}

/**
 * Generic empty state component for tables
 * Used when there is no data to display
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="font-medium text-lg">{title}</h2>
          <p className="text-[#606060] text-sm">{description}</p>
        </div>

        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

interface NoResultsProps {
  /** Callback to clear filters */
  onClear: () => void;
}

/**
 * No results state for filtered tables
 * Used when filters return no matches
 */
export function NoResults({ onClear }: NoResultsProps) {
  return (
    <EmptyState
      actionLabel="Clear filters"
      description="Try another search, or adjusting the filters"
      onAction={onClear}
      title="No results"
    />
  );
}
