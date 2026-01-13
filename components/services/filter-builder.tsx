/**
 * Filter Builder (Two-Panel) - Fully Keyboard Accessible
 *
 * Floating panel for building structured filters with comprehensive keyboard navigation.
 *
 * Layout:
 * - Left column (45%): Field list ("Environment", "Owner", "Runtime")
 * - Right column (55%): Value list with search input and checkboxes
 *
 * Accessibility Features:
 * - Focus trap: Tab/Shift+Tab cycle within panel when open
 * - Roving tabindex: ArrowUp/Down navigate items, only focused item is tabbable
 * - Drill-down: ArrowRight/Enter move from field to values
 * - Go back: ArrowLeft returns to field list
 * - Selection: Space/Enter toggle checkboxes
 * - Close: Escape closes and restores focus to trigger button
 * - Typeahead: Type to jump to matching options
 * - Visual focus: Visible focus ring (not color-only)
 * - ARIA: Proper roles (menu, menuitem, listbox, option) and attributes
 * - Scoped listeners: Event handlers attached to panel, not document
 *
 * Visual spec (dark mode, token-based):
 * - Total width: 520-600px
 * - Background: bg-popover
 * - Border: border-border
 * - Radius: 12px
 * - Shadow: shadow-lg
 * - Row height: 36px
 * - Hover: bg-accent/40
 * - Focus: ring-2 ring-ring ring-offset-2
 */

"use client";

import { Check } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * Typeahead search timeout in milliseconds.
 */
const TYPEAHEAD_TIMEOUT_MS = 500;

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
 * Two-panel filter builder component with full keyboard navigation.
 *
 * Left panel shows available filter fields, right panel shows values
 * for the selected field with multi-select checkboxes.
 *
 * Implements roving tabindex, focus trap, typeahead, and proper ARIA.
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
  const [focusedFieldIndex, setFocusedFieldIndex] = useState(0);
  const [focusedValueIndex, setFocusedValueIndex] = useState(0);
  const [typeaheadBuffer, setTypeaheadBuffer] = useState("");
  const [isPanelFocused, setIsPanelFocused] = useState<"fields" | "values">(
    "fields"
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const fieldListRef = useRef<HTMLDivElement>(null);
  const valueListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const typeaheadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerButtonRef = useRef<HTMLElement | null>(null);

  // Sync selected field when prop changes
  useEffect(() => {
    if (initialSelectedField !== null) {
      setSelectedField(initialSelectedField);
      setIsPanelFocused("values");
    }
  }, [initialSelectedField]);

  // Reset search query when field changes
  useEffect(() => {
    setSearchQuery("");
    setFocusedValueIndex(0);
  }, [selectedField]);

  // Get field metadata
  const fieldMetadata = getAllFilterFieldMetadata();

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

  // Capture trigger button reference for focus restoration
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Find the popover trigger button
      const popover = containerRef.current.closest(
        "[data-radix-popper-content-wrapper]"
      );
      if (popover) {
        const trigger = document.querySelector(
          "[aria-controls]"
        ) as HTMLElement;
        if (trigger) {
          triggerButtonRef.current = trigger;
        }
      }
    }
  }, [isOpen]);

  // Focus management on open
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (selectedField === null) {
        // Focus first field item in left panel
        setIsPanelFocused("fields");
        setFocusedFieldIndex(0);
        const firstFieldItem = fieldListRef.current?.querySelector(
          '[role="menuitem"]'
        ) as HTMLElement;
        firstFieldItem?.focus();
      } else {
        // Focus search input in right panel
        setIsPanelFocused("values");
        searchInputRef.current?.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, selectedField]);

  // Restore focus to trigger button on close
  useEffect(() => {
    if (!isOpen && triggerButtonRef.current) {
      triggerButtonRef.current.focus();
    }
  }, [isOpen]);

  /**
   * Handles field selection from left column.
   */
  const handleFieldSelect = useCallback(
    (field: FilterFieldType, moveFocus = true) => {
      setSelectedField(field);
      setSearchQuery("");
      if (moveFocus) {
        setIsPanelFocused("values");
        // Focus will move to search input via effect
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
    },
    []
  );

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
  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
      setFocusedValueIndex(0);
    },
    []
  );

  /**
   * Navigates to previous item in field list (ArrowUp).
   */
  const navigateFieldUp = useCallback(() => {
    setFocusedFieldIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : fieldMetadata.length - 1;
      setTimeout(() => {
        const item = fieldListRef.current?.querySelectorAll(
          '[role="menuitem"]'
        )[newIndex] as HTMLElement;
        item?.focus();
      }, 0);
      return newIndex;
    });
  }, [fieldMetadata.length]);

  /**
   * Navigates to next item in field list (ArrowDown).
   */
  const navigateFieldDown = useCallback(() => {
    setFocusedFieldIndex((prev) => {
      const newIndex = prev < fieldMetadata.length - 1 ? prev + 1 : 0;
      setTimeout(() => {
        const item = fieldListRef.current?.querySelectorAll(
          '[role="menuitem"]'
        )[newIndex] as HTMLElement;
        item?.focus();
      }, 0);
      return newIndex;
    });
  }, [fieldMetadata.length]);

  /**
   * Navigates to previous item in value list (ArrowUp).
   */
  const navigateValueUp = useCallback(() => {
    setFocusedValueIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : filteredValueOptions.length - 1;
      setTimeout(() => {
        const item = valueListRef.current?.querySelectorAll('[role="option"]')[
          newIndex
        ] as HTMLElement;
        item?.focus();
      }, 0);
      return newIndex;
    });
  }, [filteredValueOptions.length]);

  /**
   * Navigates to next item in value list (ArrowDown).
   */
  const navigateValueDown = useCallback(() => {
    setFocusedValueIndex((prev) => {
      const newIndex = prev < filteredValueOptions.length - 1 ? prev + 1 : 0;
      setTimeout(() => {
        const item = valueListRef.current?.querySelectorAll('[role="option"]')[
          newIndex
        ] as HTMLElement;
        item?.focus();
      }, 0);
      return newIndex;
    });
  }, [filteredValueOptions.length]);

  /**
   * Handles typeahead search in field list.
   */
  const handleFieldTypeahead = useCallback(
    (char: string) => {
      const newBuffer = typeaheadBuffer + char.toLowerCase();
      setTypeaheadBuffer(newBuffer);

      // Clear buffer after timeout
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
      typeaheadTimerRef.current = setTimeout(() => {
        setTypeaheadBuffer("");
      }, TYPEAHEAD_TIMEOUT_MS);

      // Find matching field
      const matchIndex = fieldMetadata.findIndex((field) =>
        field.label.toLowerCase().startsWith(newBuffer)
      );

      if (matchIndex !== -1) {
        setFocusedFieldIndex(matchIndex);
        setTimeout(() => {
          const item = fieldListRef.current?.querySelectorAll(
            '[role="menuitem"]'
          )[matchIndex] as HTMLElement;
          item?.focus();
        }, 0);
      }
    },
    [typeaheadBuffer, fieldMetadata]
  );

  /**
   * Handles typeahead search in value list.
   */
  const handleValueTypeahead = useCallback(
    (char: string) => {
      const newBuffer = typeaheadBuffer + char.toLowerCase();
      setTypeaheadBuffer(newBuffer);

      // Clear buffer after timeout
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
      typeaheadTimerRef.current = setTimeout(() => {
        setTypeaheadBuffer("");
      }, TYPEAHEAD_TIMEOUT_MS);

      // Find matching value
      const matchIndex = filteredValueOptions.findIndex((option) =>
        option.displayLabel.toLowerCase().startsWith(newBuffer)
      );

      if (matchIndex !== -1) {
        setFocusedValueIndex(matchIndex);
        setTimeout(() => {
          const item = valueListRef.current?.querySelectorAll(
            '[role="option"]'
          )[matchIndex] as HTMLElement;
          item?.focus();
        }, 0);
      }
    },
    [typeaheadBuffer, filteredValueOptions]
  );

  /**
   * Scoped keyboard event handler for the filter panel.
   * Handles navigation, selection, and focus trap.
   */
  const handlePanelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // Don't interfere with search input typing
      if (
        event.target instanceof HTMLInputElement &&
        isPanelFocused === "values"
      ) {
        // Allow normal typing in search input
        if (event.key === "Escape") {
          event.preventDefault();
          onOpenChange(false);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          // Move from search input to first value option
          setFocusedValueIndex(0);
          setTimeout(() => {
            const firstOption = valueListRef.current?.querySelector(
              '[role="option"]'
            ) as HTMLElement;
            firstOption?.focus();
          }, 0);
        }
        return;
      }

      // Field list navigation
      if (isPanelFocused === "fields") {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          navigateFieldDown();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          navigateFieldUp();
        } else if (event.key === "ArrowRight" || event.key === "Enter") {
          event.preventDefault();
          const field = fieldMetadata[focusedFieldIndex];
          if (field) {
            handleFieldSelect(field.field, true);
          }
        } else if (event.key === "Escape") {
          event.preventDefault();
          onOpenChange(false);
        } else if (event.key === "Tab") {
          event.preventDefault();
          // Trap focus: cycle within panel
          if (event.shiftKey) {
            // Shift+Tab: move to last value option if available
            if (selectedField !== null && filteredValueOptions.length > 0) {
              setIsPanelFocused("values");
              setFocusedValueIndex(filteredValueOptions.length - 1);
              setTimeout(() => {
                const lastOption = valueListRef.current?.querySelectorAll(
                  '[role="option"]'
                )[filteredValueOptions.length - 1] as HTMLElement;
                lastOption?.focus();
              }, 0);
            }
          } else {
            // Tab: move to search input if field selected
            if (selectedField !== null) {
              setIsPanelFocused("values");
              searchInputRef.current?.focus();
            }
          }
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          // Typeahead
          event.preventDefault();
          handleFieldTypeahead(event.key);
        }
      }

      // Value list navigation
      if (isPanelFocused === "values" && selectedField !== null) {
        const targetIsOption =
          (event.target as HTMLElement).getAttribute("role") === "option";

        if (targetIsOption) {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            navigateValueDown();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            navigateValueUp();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            // Go back to field list
            setIsPanelFocused("fields");
            setTimeout(() => {
              const fieldItem = fieldListRef.current?.querySelectorAll(
                '[role="menuitem"]'
              )[focusedFieldIndex] as HTMLElement;
              fieldItem?.focus();
            }, 0);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const option = filteredValueOptions[focusedValueIndex];
            if (option) {
              handleValueToggle(option.value);
            }
          } else if (event.key === "Escape") {
            event.preventDefault();
            onOpenChange(false);
          } else if (event.key === "Tab") {
            event.preventDefault();
            // Trap focus: cycle within panel
            if (event.shiftKey) {
              // Shift+Tab: move to search input or field list
              if (focusedValueIndex === 0) {
                searchInputRef.current?.focus();
              } else {
                navigateValueUp();
              }
            } else {
              // Tab: cycle to next option or back to field list
              if (focusedValueIndex === filteredValueOptions.length - 1) {
                setIsPanelFocused("fields");
                setFocusedFieldIndex(0);
                setTimeout(() => {
                  const firstField = fieldListRef.current?.querySelector(
                    '[role="menuitem"]'
                  ) as HTMLElement;
                  firstField?.focus();
                }, 0);
              } else {
                navigateValueDown();
              }
            }
          } else if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.metaKey
          ) {
            // Typeahead
            event.preventDefault();
            handleValueTypeahead(event.key);
          }
        }
      }
    },
    [
      isPanelFocused,
      focusedFieldIndex,
      focusedValueIndex,
      fieldMetadata,
      filteredValueOptions,
      selectedField,
      navigateFieldUp,
      navigateFieldDown,
      navigateValueUp,
      navigateValueDown,
      handleFieldSelect,
      handleValueToggle,
      handleFieldTypeahead,
      handleValueTypeahead,
      onOpenChange,
    ]
  );

  return (
    <Popover onOpenChange={onOpenChange} open={isOpen}>
      {trigger}
      <PopoverContent
        align="start"
        className={cn("p-0", className)}
        onOpenAutoFocus={(event) => {
          // Prevent Radix from auto-focusing first focusable element
          event.preventDefault();
        }}
        side="bottom"
        style={{
          width: `${BUILDER_WIDTH_PX}px`,
          borderRadius: `${BUILDER_RADIUS_PX}px`,
        }}
      >
        <div
          aria-label="Filter builder"
          className="grid grid-cols-[45%_55%]"
          onKeyDown={handlePanelKeyDown}
          ref={containerRef}
          role="dialog"
        >
          {/* Left column: Field list */}
          <div
            aria-label="Filter fields"
            className="border-border border-r"
            ref={fieldListRef}
            role="menu"
          >
            <div className="border-border border-b px-4 py-2.5">
              <h3
                className="text-muted-foreground text-xs font-semibold uppercase tracking-wide"
                id="field-list-label"
              >
                Add filter…
              </h3>
            </div>
            <div aria-labelledby="field-list-label" className="p-1">
              {fieldMetadata.map((field, index) => {
                const isSelected = selectedField === field.field;
                const isFocused = focusedFieldIndex === index;

                return (
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-3 text-left text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                      isSelected && "font-medium text-foreground",
                      !isSelected && "text-muted-foreground",
                      "hover:bg-accent/40"
                    )}
                    key={field.field}
                    onClick={() => {
                      handleFieldSelect(field.field, true);
                    }}
                    role="menuitem"
                    style={{ height: `${ROW_HEIGHT_PX}px` }}
                    tabIndex={isFocused ? 0 : -1}
                    type="button"
                  >
                    <span>{field.label}</span>
                    {isSelected && (
                      <div
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>
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
              <div className="flex h-full flex-col">
                {/* Search input */}
                <div className="border-border border-b px-3 py-2">
                  <input
                    aria-label={`Filter ${
                      fieldMetadata.find((f) => f.field === selectedField)
                        ?.pluralLabel ?? "values"
                    }`}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    onChange={handleSearchChange}
                    placeholder={`Filter ${
                      fieldMetadata.find((f) => f.field === selectedField)
                        ?.pluralLabel ?? "values"
                    }…`}
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                  />
                </div>

                {/* Value list */}
                <div
                  aria-label={`${
                    fieldMetadata.find((f) => f.field === selectedField)
                      ?.pluralLabel ?? "Values"
                  }`}
                  aria-multiselectable="true"
                  className="flex-1 overflow-y-auto p-1"
                  ref={valueListRef}
                  role="listbox"
                >
                  {filteredValueOptions.length === 0 ? (
                    <div className="px-3 py-2 text-center text-muted-foreground text-sm">
                      No values found
                    </div>
                  ) : (
                    filteredValueOptions.map((option, index) => {
                      const isSelected = isValueSelected(
                        selectedField,
                        option.value,
                        selectedEnv,
                        selectedOwner,
                        selectedRuntime
                      );
                      const isFocused = focusedValueIndex === index;

                      return (
                        <button
                          aria-selected={isSelected}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 text-left text-sm transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
                            "hover:bg-accent/40"
                          )}
                          key={option.value}
                          onClick={() => {
                            handleValueToggle(option.value);
                          }}
                          role="option"
                          style={{ height: `${ROW_HEIGHT_PX}px` }}
                          tabIndex={isFocused ? 0 : -1}
                          type="button"
                        >
                          <div
                            aria-hidden="true"
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
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
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
