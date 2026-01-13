/**
 * Filter Chip Component
 *
 * Single pill containing 3 editable segments + remove button, matching Linear's design.
 *
 * Structure:
 * - Segment 1 (Field): e.g., "Environment", "Owner", "Runtime"
 * - Segment 2 (Operator): "is" or "is any of"
 * - Segment 3 (Value): single value or summary (e.g., "3 environments")
 * - Remove: × button (always visible)
 *
 * Interaction model:
 * - Click Field → opens builder on field selection panel
 * - Click Operator → toggles between "is" and "is any of" (if multi-select supported)
 * - Click Value → opens builder on value selection panel
 * - Click × → removes filter
 *
 * Visual spec (dark mode, token-based):
 * - Height: 32px
 * - Radius: 9999px (full rounded)
 * - Background: bg-muted/40 or bg-secondary/40
 * - Border: border-border
 * - Segments separated by 1px vertical line (border-border low opacity)
 * - Text: Field/operator in text-muted-foreground, value in text-foreground
 * - Hover: background increases slightly
 * - Focus: ring-1 ring-ring when keyboard-focused
 */

"use client";

import { X } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { FilterFieldType, FilterOperator } from "@/types/filters";

/**
 * Height of filter chips in pixels.
 */
const CHIP_HEIGHT_PX = 32;

/**
 * Action type for chip segment interactions.
 */
type ChipSegmentAction =
  | { type: "field"; field: FilterFieldType }
  | { type: "operator"; field: FilterFieldType }
  | { type: "value"; field: FilterFieldType };

interface FilterChipProps {
  readonly field: FilterFieldType;
  readonly fieldLabel: string;
  readonly operator: FilterOperator;
  readonly operatorSupportsToggle: boolean;
  readonly valueDisplay: string;
  readonly onSegmentClick: (action: ChipSegmentAction) => void;
  readonly onOperatorToggle?: () => void;
  readonly onRemove: () => void;
  readonly className?: string;
}

/**
 * Formats operator for display in the chip.
 *
 * @param operator - Filter operator
 * @returns Human-readable operator text
 */
function formatOperator(operator: FilterOperator): string {
  return operator === "is" ? "is" : "is any of";
}

/**
 * Filter chip component with editable segments.
 *
 * Each segment is independently clickable and triggers specific actions
 * to edit the filter or toggle operator mode.
 */
export function FilterChip({
  field,
  fieldLabel,
  operator,
  operatorSupportsToggle,
  valueDisplay,
  onSegmentClick,
  onOperatorToggle,
  onRemove,
  className,
}: FilterChipProps): React.ReactElement {
  const operatorText = formatOperator(operator);

  const handleFieldClick = useCallback(() => {
    onSegmentClick({ type: "field", field });
  }, [onSegmentClick, field]);

  const handleOperatorClick = useCallback(() => {
    if (operatorSupportsToggle && onOperatorToggle) {
      onOperatorToggle();
    }
  }, [operatorSupportsToggle, onOperatorToggle]);

  const handleValueClick = useCallback(() => {
    onSegmentClick({ type: "value", field });
  }, [onSegmentClick, field]);

  const handleRemoveClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onRemove();
    },
    [onRemove]
  );

  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full",
        "border border-border bg-muted/40",
        "transition-colors hover:bg-muted/60",
        "focus-within:ring-1 focus-within:ring-ring",
        className
      )}
      style={{ height: `${CHIP_HEIGHT_PX}px` }}
    >
      {/* Segment 1: Field */}
      <button
        aria-label={`Change filter field from ${fieldLabel}`}
        className={cn(
          "px-2.5 text-muted-foreground text-sm font-medium transition-colors",
          "hover:text-foreground",
          "focus-visible:outline-none focus-visible:text-foreground"
        )}
        onClick={handleFieldClick}
        type="button"
      >
        {fieldLabel}
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-border/30" />

      {/* Segment 2: Operator */}
      <button
        aria-label={
          operatorSupportsToggle
            ? `Toggle operator (currently ${operatorText})`
            : operatorText
        }
        className={cn(
          "px-2 text-muted-foreground text-sm transition-colors",
          operatorSupportsToggle && "hover:text-foreground cursor-pointer",
          !operatorSupportsToggle && "cursor-default",
          "focus-visible:outline-none focus-visible:text-foreground"
        )}
        disabled={!operatorSupportsToggle}
        onClick={handleOperatorClick}
        type="button"
      >
        {operatorText}
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-border/30" />

      {/* Segment 3: Value */}
      <button
        aria-label={`Change filter value for ${fieldLabel}`}
        className={cn(
          "px-2.5 text-foreground text-sm font-medium transition-colors",
          "hover:text-foreground/80",
          "focus-visible:outline-none focus-visible:text-foreground/80"
        )}
        onClick={handleValueClick}
        type="button"
      >
        {valueDisplay}
      </button>

      {/* Divider */}
      <div className="h-4 w-px bg-border/30" />

      {/* Remove button */}
      <button
        aria-label={`Remove ${fieldLabel} filter`}
        className={cn(
          "flex h-full items-center justify-center px-2 transition-colors",
          "text-muted-foreground hover:text-foreground",
          "focus-visible:outline-none focus-visible:text-foreground"
        )}
        onClick={handleRemoveClick}
        type="button"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
