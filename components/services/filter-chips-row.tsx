/**
 * Filter Chips Row (Layer 2)
 *
 * Structured filters only - chips, builder, match mode, and clear.
 * Never contains free text search.
 *
 * Layout (left to right):
 * 1. "Filter" button (opens builder)
 * 2. Active filter chips (editable segments)
 * 3. Match mode toggle ("Match all filters" / "Match any filter")
 * 4. Clear button (removes all filters)
 *
 * Responsibilities:
 * - Render filter chips from URL state
 * - Handle chip segment clicks (open builder)
 * - Handle operator toggles (single vs multi-select)
 * - Handle chip removals
 * - Handle match mode toggle
 * - Handle clear all filters
 *
 * Visual spec (dark mode, token-based):
 * - Row exists even with zero filters (shows Filter button)
 * - Chips height 32px, full rounded, editable segments
 * - Match mode and Clear disabled when no filters active
 * - Chips ordered consistently: env, runtime, owner
 */

"use client";

import { SlidersHorizontal } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Environment } from "@/hooks/use-services-query-state";
import {
  generateChipValueDisplay,
  getFilterFieldMetadata,
  getOperatorForValueCount,
} from "@/lib/filter-utils";
import { cn } from "@/lib/utils";
import type { FilterFieldType, FilterMatchMode } from "@/types/filters";
import { FilterBuilder } from "./filter-builder";
import { FilterChip } from "./filter-chip";

/**
 * Height of the filter row in pixels.
 */
const FILTER_ROW_HEIGHT_PX = 32;

interface FilterChipsRowProps {
  readonly env: readonly Environment[];
  readonly owner: readonly string[];
  readonly runtime: readonly string[];
  readonly match: FilterMatchMode;
  readonly availableOwners: readonly string[];
  readonly availableRuntimes: readonly string[];
  readonly onEnvChange: (environments: readonly Environment[]) => void;
  readonly onOwnerChange: (owners: readonly string[]) => void;
  readonly onRuntimeChange: (runtimes: readonly string[]) => void;
  readonly onMatchChange: (mode: FilterMatchMode) => void;
  readonly onClearFilters: () => void;
  readonly className?: string;
}

/**
 * Computes whether any filters are active.
 *
 * @param env - Environment filters
 * @param owner - Owner filters
 * @param runtime - Runtime filters
 * @returns True if at least one filter is active
 */
function hasActiveFilters(
  env: readonly Environment[],
  owner: readonly string[],
  runtime: readonly string[]
): boolean {
  return env.length > 0 || owner.length > 0 || runtime.length > 0;
}

/**
 * Filter chips row component with builder integration.
 *
 * Manages filter state, chip interactions, and builder visibility.
 */
export function FilterChipsRow({
  env,
  owner,
  runtime,
  match,
  availableOwners,
  availableRuntimes,
  onEnvChange,
  onOwnerChange,
  onRuntimeChange,
  onMatchChange,
  onClearFilters,
  className,
}: FilterChipsRowProps): React.ReactElement {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedBuilderField, setSelectedBuilderField] =
    useState<FilterFieldType | null>(null);

  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const hasFilters = hasActiveFilters(env, owner, runtime);

  /**
   * Opens filter builder with optional preselected field.
   */
  const openBuilder = useCallback((field: FilterFieldType | null = null) => {
    setSelectedBuilderField(field);
    setIsBuilderOpen(true);
  }, []);

  /**
   * Closes filter builder and resets selected field.
   */
  const closeBuilder = useCallback(() => {
    setIsBuilderOpen(false);
    setSelectedBuilderField(null);
  }, []);

  /**
   * Handles popover open/close changes from PopoverTrigger.
   * Ensures selected field is reset and focus is restored when closing.
   */
  const handleBuilderOpenChange = useCallback(
    (open: boolean) => {
      setIsBuilderOpen(open);
      if (open && selectedBuilderField === null) {
        // Opening from button (not from chip) - reset field selection
        setSelectedBuilderField(null);
      } else if (!open) {
        // Closing - reset field selection and restore focus
        setSelectedBuilderField(null);
        setTimeout(() => {
          filterButtonRef.current?.focus();
        }, 50);
      }
    },
    [selectedBuilderField]
  );

  /**
   * Handles filter button click to open builder.
   * This ensures the builder opens with no preselected field.
   */
  const handleFilterButtonClick = useCallback(() => {
    openBuilder(null);
  }, [openBuilder]);

  /**
   * Handles F key press to open/close filter builder.
   * Only triggers when not typing in an input/textarea.
   * Toggles builder: opens if closed, closes if open.
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputElement) {
        return;
      }

      // Trigger on F key (case-insensitive)
      if (event.key === "f" || event.key === "F") {
        // Don't trigger if modifier keys are pressed (e.g., Cmd+F for search)
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        // Toggle: close if open, open if closed
        if (isBuilderOpen) {
          setIsBuilderOpen(false);
          setSelectedBuilderField(null);
          // Restore focus to button
          setTimeout(() => {
            filterButtonRef.current?.focus();
          }, 50);
        } else {
          openBuilder(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isBuilderOpen, openBuilder]);

  /**
   * Handles chip segment click to open builder on specific field.
   */
  const handleChipSegmentClick = useCallback(
    (action: { type: string; field: FilterFieldType }) => {
      if (action.type === "field") {
        openBuilder(action.field);
      } else if (action.type === "value") {
        openBuilder(action.field);
      }
    },
    [openBuilder]
  );

  /**
   * Handles match mode toggle.
   */
  const handleMatchToggle = useCallback(() => {
    onMatchChange(match === "all" ? "any" : "all");
  }, [match, onMatchChange]);

  /**
   * Removes environment filter.
   */
  const handleRemoveEnv = useCallback(() => {
    onEnvChange([]);
  }, [onEnvChange]);

  /**
   * Removes owner filter.
   */
  const handleRemoveOwner = useCallback(() => {
    onOwnerChange([]);
  }, [onOwnerChange]);

  /**
   * Removes runtime filter.
   */
  const handleRemoveRuntime = useCallback(() => {
    onRuntimeChange([]);
  }, [onRuntimeChange]);

  /**
   * Toggles environment filter between single and multi-select.
   * Not currently supported - environment is always multi-select.
   */
  const handleToggleEnvOperator = useCallback(() => {
    // Environment always supports multi-select, no toggle needed
  }, []);

  /**
   * Toggles owner filter between single and multi-select.
   * Not currently supported - owner is always multi-select.
   */
  const handleToggleOwnerOperator = useCallback(() => {
    // Owner always supports multi-select, no toggle needed
  }, []);

  /**
   * Toggles runtime filter between single and multi-select.
   * Not currently supported - runtime is always multi-select.
   */
  const handleToggleRuntimeOperator = useCallback(() => {
    // Runtime always supports multi-select, no toggle needed
  }, []);

  // Generate chip display data
  const envChip = useMemo(() => {
    if (env.length === 0) {
      return null;
    }

    const metadata = getFilterFieldMetadata("env");
    const operator = getOperatorForValueCount(env.length);
    const valueDisplay = generateChipValueDisplay("env", env);

    return {
      field: "env" as FilterFieldType,
      fieldLabel: metadata.label,
      operator,
      operatorSupportsToggle: false,
      valueDisplay,
      onRemove: handleRemoveEnv,
      onOperatorToggle: handleToggleEnvOperator,
    };
  }, [env, handleRemoveEnv, handleToggleEnvOperator]);

  const runtimeChip = useMemo(() => {
    if (runtime.length === 0) {
      return null;
    }

    const metadata = getFilterFieldMetadata("runtime");
    const operator = getOperatorForValueCount(runtime.length);
    const valueDisplay = generateChipValueDisplay("runtime", runtime);

    return {
      field: "runtime" as FilterFieldType,
      fieldLabel: metadata.label,
      operator,
      operatorSupportsToggle: false,
      valueDisplay,
      onRemove: handleRemoveRuntime,
      onOperatorToggle: handleToggleRuntimeOperator,
    };
  }, [runtime, handleRemoveRuntime, handleToggleRuntimeOperator]);

  const ownerChip = useMemo(() => {
    if (owner.length === 0) {
      return null;
    }

    const metadata = getFilterFieldMetadata("owner");
    const operator = getOperatorForValueCount(owner.length);
    const valueDisplay = generateChipValueDisplay("owner", owner);

    return {
      field: "owner" as FilterFieldType,
      fieldLabel: metadata.label,
      operator,
      operatorSupportsToggle: false,
      valueDisplay,
      onRemove: handleRemoveOwner,
      onOperatorToggle: handleToggleOwnerOperator,
    };
  }, [owner, handleRemoveOwner, handleToggleOwnerOperator]);

  // Stable order: env, runtime, owner
  const chips = [envChip, runtimeChip, ownerChip].filter(
    (chip) => chip !== null
  );

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      style={{ minHeight: `${FILTER_ROW_HEIGHT_PX}px` }}
    >
      {/* Filter button (opens builder) with tooltip */}
      <FilterBuilder
        availableOwners={availableOwners}
        availableRuntimes={availableRuntimes}
        isOpen={isBuilderOpen}
        onEnvChange={onEnvChange}
        onOpenChange={handleBuilderOpenChange}
        onOwnerChange={onOwnerChange}
        onRuntimeChange={onRuntimeChange}
        selectedEnv={env}
        selectedField={selectedBuilderField}
        selectedOwner={owner}
        selectedRuntime={runtime}
        trigger={
          <Tooltip disableHoverableContent>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Add filter"
                  className="h-8 gap-1.5"
                  onClick={handleFilterButtonClick}
                  ref={filterButtonRef}
                  size="sm"
                  variant="outline"
                >
                  <SlidersHorizontal
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                  <span>Filter</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent
              className="flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-1.5 text-popover-foreground text-xs shadow-sm [&_svg]:hidden"
              side="bottom"
              sideOffset={6}
            >
              <span>Add filter</span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                F
              </kbd>
            </TooltipContent>
          </Tooltip>
        }
      />

      {/* Active filter chips */}
      {chips.map((chip) => (
        <FilterChip
          field={chip.field}
          fieldLabel={chip.fieldLabel}
          key={chip.field}
          onOperatorToggle={chip.onOperatorToggle}
          onRemove={chip.onRemove}
          onSegmentClick={handleChipSegmentClick}
          operator={chip.operator}
          operatorSupportsToggle={chip.operatorSupportsToggle}
          valueDisplay={chip.valueDisplay}
        />
      ))}

      {/* Spacer */}
      {hasFilters && <div className="flex-1" />}

      {/* Match mode toggle */}
      {hasFilters && (
        <Button
          aria-label={`Toggle match mode (currently ${match === "all" ? "match all" : "match any"})`}
          className="text-muted-foreground text-sm"
          onClick={handleMatchToggle}
          size="sm"
          variant="ghost"
        >
          {match === "all" ? "Match all filters" : "Match any filter"}
        </Button>
      )}

      {/* Clear button */}
      {hasFilters && (
        <Button
          aria-label="Clear all filters"
          className="text-muted-foreground text-sm"
          onClick={onClearFilters}
          size="sm"
          variant="ghost"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
