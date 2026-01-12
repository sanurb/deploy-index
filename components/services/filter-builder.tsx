/**
 * Filter Builder (Two-Panel)
 *
 * Floating panel for building structured filters, matching Linear's design.
 *
 * Layout:
 * - Left column (45%): Field list ("Environment", "Owner", "Runtime")
 * - Right column (55%): Value list with search input and checkboxes
 *
 * Behavior:
 * - Opens anchored below Filter button or chip
 * - Selecting a value updates URL state immediately (no Apply button)
 * - Builder stays open while selecting multiple values
 * - Closes on Esc or click outside
 * - Keyboard navigation: Up/Down navigate, Enter toggles, Tab cycles within builder
 *
 * Visual spec (dark mode, token-based):
 * - Total width: 520-600px
 * - Background: bg-popover
 * - Border: border-border
 * - Radius: 12px
 * - Shadow: shadow-lg
 * - Row height: 36px
 * - Hover: bg-accent/40
 */

"use client";

import { Check } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Environment } from "@/hooks/use-services-query-state";
import {
  filterValueOptions,
  getAllFilterFieldMetadata,
  getEnvironmentOptions,
  getOwnerOptions,
  getRuntimeOptions,
} from "@/lib/filter-utils";
import { cn } from "@/lib/utils";
import type { FilterFieldType } from "@/types/filters";

/**
 * Builder panel width in pixels.
 */
const BUILDER_WIDTH_PX = 560;

/**
 * Builder panel border radius in pixels.
 */
const BUILDER_RADIUS_PX = 12;

/**
 * Row height for items in pixels.
 */
const ROW_HEIGHT_PX = 36;

interface FilterBuilderProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly selectedField: FilterFieldType | null;
  readonly selectedEnv: readonly Environment[];
  readonly selectedOwner: readonly string[];
  readonly selectedRuntime: readonly string[];
  readonly availableOwners: readonly string[];
  readonly availableRuntimes: readonly string[];
  readonly onEnvChange: (environments: readonly Environment[]) => void;
  readonly onOwnerChange: (owners: readonly string[]) => void;
  readonly onRuntimeChange: (runtimes: readonly string[]) => void;
  readonly trigger: React.ReactNode;
  readonly className?: string;
}

/**
 * Determines if a value is currently selected for a given field.
 *
 * @param field - Filter field type
 * @param value - Value to check
 * @param selectedEnv - Selected environments
 * @param selectedOwner - Selected owners
 * @param selectedRuntime - Selected runtimes
 * @returns True if value is selected
 */
function isValueSelected(
  field: FilterFieldType,
  value: string,
  selectedEnv: readonly Environment[],
  selectedOwner: readonly string[],
  selectedRuntime: readonly string[]
): boolean {
  if (field === "env") {
    return selectedEnv.includes(value as Environment);
  }
  if (field === "owner") {
    return selectedOwner.includes(value);
  }
  if (field === "runtime") {
    return selectedRuntime.includes(value);
  }
  return false;
}

/**
 * Two-panel filter builder component.
 *
 * Left panel shows available filter fields, right panel shows values
 * for the selected field with multi-select checkboxes.
 */
export function FilterBuilder({
  isOpen,
  onOpenChange,
  selectedField: initialSelectedField,
  selectedEnv,
  selectedOwner,
  selectedRuntime,
  availableOwners,
  availableRuntimes,
  onEnvChange,
  onOwnerChange,
  onRuntimeChange,
  trigger,
  className,
}: FilterBuilderProps): React.ReactElement {
  const [selectedField, setSelectedField] = useState<FilterFieldType | null>(
    initialSelectedField
  );
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync selected field when prop changes
  useEffect(() => {
    if (initialSelectedField !== null) {
      setSelectedField(initialSelectedField);
    }
  }, [initialSelectedField]);

  // Reset search query when field changes
  useEffect(() => {
    setSearchQuery("");
  }, [selectedField]);

  // Get value options for selected field
  const valueOptions = useMemo(() => {
    if (selectedField === null) {
      return [];
    }

    if (selectedField === "env") {
      return getEnvironmentOptions();
    }
    if (selectedField === "owner") {
      return getOwnerOptions(availableOwners);
    }
    if (selectedField === "runtime") {
      return getRuntimeOptions(availableRuntimes);
    }

    return [];
  }, [selectedField, availableOwners, availableRuntimes]);

  // Filter value options by search query
  const filteredValueOptions = useMemo(
    () => filterValueOptions(valueOptions, searchQuery),
    [valueOptions, searchQuery]
  );

  // Get field metadata
  const fieldMetadata = getAllFilterFieldMetadata();

  /**
   * Handles field selection from left column.
   */
  const handleFieldSelect = useCallback((field: FilterFieldType) => {
    setSelectedField(field);
    setSearchQuery("");
  }, []);

  /**
   * Handles value toggle for the selected field.
   */
  const handleValueToggle = useCallback(
    (value: string) => {
      if (selectedField === null) {
        return;
      }

      if (selectedField === "env") {
        const envValue = value as Environment;
        const currentSet = new Set(selectedEnv);

        if (currentSet.has(envValue)) {
          currentSet.delete(envValue);
        } else {
          currentSet.add(envValue);
        }

        onEnvChange(Array.from(currentSet));
      } else if (selectedField === "owner") {
        const currentSet = new Set(selectedOwner);

        if (currentSet.has(value)) {
          currentSet.delete(value);
        } else {
          currentSet.add(value);
        }

        onOwnerChange(Array.from(currentSet));
      } else if (selectedField === "runtime") {
        const currentSet = new Set(selectedRuntime);

        if (currentSet.has(value)) {
          currentSet.delete(value);
        } else {
          currentSet.add(value);
        }

        onRuntimeChange(Array.from(currentSet));
      }
    },
    [
      selectedField,
      selectedEnv,
      selectedOwner,
      selectedRuntime,
      onEnvChange,
      onOwnerChange,
      onRuntimeChange,
    ]
  );

  /**
   * Handles search query changes in the value list.
   */
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return (
    <Popover onOpenChange={onOpenChange} open={isOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("p-0", className)}
        side="bottom"
        style={{
          width: `${BUILDER_WIDTH_PX}px`,
          borderRadius: `${BUILDER_RADIUS_PX}px`,
        }}
      >
        <div
          aria-label="Filter builder"
          className="grid grid-cols-[45%_55%]"
          ref={containerRef}
          role="dialog"
        >
          {/* Left column: Field list */}
          <div className="border-border border-r">
            <div className="border-border border-b px-4 py-2.5">
              <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Add filter…
              </h3>
            </div>
            <Command>
              <CommandList>
                <CommandGroup>
                  {fieldMetadata.map((field) => (
                    <CommandItem
                      key={field.field}
                      onSelect={() => {
                        handleFieldSelect(field.field);
                      }}
                      style={{ height: `${ROW_HEIGHT_PX}px` }}
                      value={field.field}
                    >
                      <div
                        className={cn(
                          "flex w-full items-center justify-between",
                          selectedField === field.field &&
                            "font-medium text-foreground"
                        )}
                      >
                        <span>{field.label}</span>
                        {selectedField === field.field && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          {/* Right column: Value list */}
          <div>
            {selectedField === null ? (
              <div className="flex h-full items-center justify-center p-4 text-center">
                <p className="text-muted-foreground text-sm">
                  Select a filter field to begin
                </p>
              </div>
            ) : (
              <Command>
                <CommandInput
                  onValueChange={handleSearchChange}
                  placeholder={`Filter ${
                    fieldMetadata.find((f) => f.field === selectedField)
                      ?.pluralLabel ?? "values"
                  }…`}
                  value={searchQuery}
                />
                <CommandSeparator />
                <CommandList>
                  {filteredValueOptions.length === 0 ? (
                    <CommandEmpty>No values found</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredValueOptions.map((option) => {
                        const isSelected = isValueSelected(
                          selectedField,
                          option.value,
                          selectedEnv,
                          selectedOwner,
                          selectedRuntime
                        );

                        return (
                          <CommandItem
                            key={option.value}
                            onSelect={() => {
                              handleValueToggle(option.value);
                            }}
                            style={{ height: `${ROW_HEIGHT_PX}px` }}
                            value={option.value}
                          >
                            <div className="flex w-full items-center gap-2">
                              <div
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded border",
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-border"
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                )}
                              </div>
                              <span>{option.displayLabel}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
