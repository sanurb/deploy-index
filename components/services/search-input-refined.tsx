/**
 * Refined Search Input with Command Panel
 *
 * Search-first input with strict visual hierarchy:
 * - Capped width (560-640px), height 40-44px
 * - Neutral surface, 1px low-contrast border, no shadow
 * - Subtle focus ring only on focus
 * - Command panel opens on focus/typing, keyboard-first
 * - Never auto-opens on page load
 */

"use client";

import { Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENV_LABELS } from "@/components/service-table/constants";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Environment } from "@/hooks/use-services-query-state";
import { QUERY_BAR_DEBOUNCE_MS } from "@/hooks/use-services-query-state";
import { cn } from "@/lib/utils";

const SEARCH_INPUT_WIDTH_MIN = 560;
const SEARCH_INPUT_WIDTH_MAX = 640;

const FILTER_PATTERN = /\b(env|owner|runtime):(\S*)$/;

interface FilterCommand {
  readonly type: "env" | "owner" | "runtime";
  readonly label: string;
  readonly value: string;
  readonly display: string;
}

interface SearchInputRefinedProps {
  readonly value: string;
  readonly onChange: (query: string) => void;
  readonly availableRuntimes: readonly string[];
  readonly availableOwners: readonly string[];
  readonly inputRef?: React.RefObject<HTMLInputElement>;
  readonly className?: string;
}

/**
 * Generates environment filter commands
 */
function generateEnvCommands(filterValue: string): readonly FilterCommand[] {
  const environments: Environment[] = ["production", "staging", "development"];
  const commands: FilterCommand[] = [];

  for (const env of environments) {
    const envLabel = ENV_LABELS[env].toLowerCase();
    const envFull = env.toLowerCase();
    const matches =
      envLabel.startsWith(filterValue) ||
      envFull.startsWith(filterValue) ||
      filterValue.length === 0;

    if (matches) {
      commands.push({
        type: "env",
        label: "env",
        value: env,
        display: `${ENV_LABELS[env]} (${env})`,
      });
    }
  }

  return commands;
}

/**
 * Generates owner filter commands
 */
function generateOwnerCommands(
  filterValue: string,
  availableOwners: readonly string[]
): readonly FilterCommand[] {
  const commands: FilterCommand[] = [];

  for (const owner of availableOwners) {
    const matches =
      owner.toLowerCase().startsWith(filterValue) || filterValue.length === 0;

    if (matches) {
      commands.push({
        type: "owner",
        label: "owner",
        value: owner,
        display: owner,
      });
    }
  }

  return commands;
}

/**
 * Generates runtime filter commands
 */
function generateRuntimeCommands(
  filterValue: string,
  availableRuntimes: readonly string[]
): readonly FilterCommand[] {
  const commands: FilterCommand[] = [];

  for (const runtime of availableRuntimes) {
    const matches =
      runtime.toLowerCase().startsWith(filterValue) || filterValue.length === 0;

    if (matches) {
      commands.push({
        type: "runtime",
        label: "runtime",
        value: runtime,
        display: runtime,
      });
    }
  }

  return commands;
}

/**
 * Generates filter commands based on current query
 * Only shows commands when user is typing a filter prefix or on focus
 */
function generateFilterCommands(
  query: string,
  availableRuntimes: readonly string[],
  availableOwners: readonly string[]
): readonly FilterCommand[] {
  const lowerQuery = query.toLowerCase().trim();
  const commands: FilterCommand[] = [];

  // Check if user is typing a filter prefix
  const filterMatch = lowerQuery.match(FILTER_PATTERN);

  if (filterMatch) {
    const filterType = filterMatch[1] as "env" | "owner" | "runtime";
    const filterValue = filterMatch[2];

    if (filterType === "env") {
      return generateEnvCommands(filterValue);
    }
    if (filterType === "owner") {
      return generateOwnerCommands(filterValue, availableOwners);
    }
    if (filterType === "runtime") {
      return generateRuntimeCommands(filterValue, availableRuntimes);
    }
  }

  // Show filter command options when no filter prefix is typed
  commands.push(
    {
      type: "env",
      label: "env",
      value: "",
      display: "Filter by environment (env:prod, env:stage, env:dev)",
    },
    {
      type: "owner",
      label: "owner",
      value: "",
      display: "Filter by owner (owner:name)",
    },
    {
      type: "runtime",
      label: "runtime",
      value: "",
      display: "Filter by runtime (runtime:name)",
    }
  );

  return commands.slice(0, 10);
}

export function SearchInputRefined({
  value,
  onChange,
  availableRuntimes,
  availableOwners,
  inputRef,
  className,
}: SearchInputRefinedProps): React.ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const isPointerInteractionRef = useRef(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const commands = useMemo(
    () =>
      generateFilterCommands(localValue, availableRuntimes, availableOwners),
    [localValue, availableRuntimes, availableOwners]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);

      // Open command panel on typing (but never auto-open on page load)
      // Only open if user has interacted and there are commands available
      if (hasOpenedOnce && newValue.length > 0 && commands.length > 0) {
        setIsOpen(true);
      } else if (hasOpenedOnce && newValue.length === 0) {
        // Close when input is cleared
        setIsOpen(false);
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, QUERY_BAR_DEBOUNCE_MS);
    },
    [onChange, commands.length, hasOpenedOnce]
  );

  const handlePointerDown = useCallback(() => {
    // Track that this is a pointer (mouse/touch) interaction, not keyboard
    // This helps prevent double-opening: PopoverTrigger handles click, we skip focus-based open
    isPointerInteractionRef.current = true;
  }, []);

  const handleFocus = useCallback(() => {
    // Mark that user has interacted (for preventing auto-open on page load)
    const wasFirstInteraction = !hasOpenedOnce;
    setHasOpenedOnce(true);

    // Only open on focus if it was NOT a pointer interaction (i.e., keyboard Tab)
    // Pointer interactions (clicks) are handled by PopoverTrigger's click handler via onOpenChange
    // This prevents double-opening: click → PopoverTrigger opens → focus fires → we skip opening again
    if (
      !(isPointerInteractionRef.current || wasFirstInteraction) &&
      commands.length > 0
    ) {
      setIsOpen(true);
    }

    // Reset pointer flag after focus event completes
    // Use requestAnimationFrame to ensure this happens after all event handlers
    requestAnimationFrame(() => {
      isPointerInteractionRef.current = false;
    });
  }, [commands.length, hasOpenedOnce]);

  /**
   * Converts environment value to short form for query
   */
  const getEnvShort = useCallback((env: string): string => {
    if (env === "production") {
      return "prod";
    }
    if (env === "staging") {
      return "stage";
    }
    return "dev";
  }, []);

  /**
   * Gets filter value for command
   */
  const getFilterValue = useCallback(
    (command: FilterCommand): string => {
      if (
        command.value === "production" ||
        command.value === "staging" ||
        command.value === "development"
      ) {
        return getEnvShort(command.value);
      }
      return command.value;
    },
    [getEnvShort]
  );

  const handleCommandSelect = useCallback(
    (command: FilterCommand) => {
      const currentQuery = localValue.trim();
      const filterMatch = currentQuery.match(FILTER_PATTERN);

      let newQuery: string;
      if (filterMatch && command.value) {
        // Replace the incomplete filter with the selected value
        const prefix = currentQuery.slice(0, filterMatch.index ?? 0);
        const filterValue = getFilterValue(command);
        newQuery = `${prefix}${command.label}:${filterValue}`.trim();
      } else if (command.value) {
        // Append new filter
        const filterValue = getFilterValue(command);
        newQuery = currentQuery
          ? `${currentQuery} ${command.label}:${filterValue}`
          : `${command.label}:${filterValue}`;
      } else {
        // Just add the prefix
        newQuery = currentQuery
          ? `${currentQuery} ${command.label}:`
          : `${command.label}:`;
      }

      setLocalValue(newQuery);
      setIsOpen(false);
      onChange(newQuery);
      // Refocus input after selection
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 0);
    },
    [localValue, onChange, inputRef, getFilterValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef?.current?.blur();
      }
    },
    [inputRef]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Only open if user has interacted before (prevents auto-open on page load)
      if (open && !hasOpenedOnce) {
        // Prevent opening on initial page load
        setIsOpen(false);
        return;
      }
      // Single source of truth for open state - prevents double-opening
      setIsOpen(open);
    },
    [hasOpenedOnce]
  );

  return (
    <Popover onOpenChange={handleOpenChange} open={isOpen}>
      <div
        className="relative"
        ref={inputContainerRef}
        style={{
          width: `${SEARCH_INPUT_WIDTH_MIN}px`,
          maxWidth: `${SEARCH_INPUT_WIDTH_MAX}px`,
        }}
      >
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <PopoverTrigger asChild>
          <Input
            aria-autocomplete="list"
            aria-controls={isOpen ? "filter-commands" : undefined}
            aria-expanded={isOpen}
            aria-label="Search services"
            className={cn(
              "h-[42px] border-border/60 bg-background pr-3 pl-9 text-sm",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
              "shadow-none",
              className
            )}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            placeholder="Search services…"
            ref={inputRef}
            role="combobox"
            type="text"
            value={localValue}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] border-border/60 p-0 shadow-lg"
          id="filter-commands"
          onOpenAutoFocus={(e) => {
            // Prevent auto-focus to popover content - keep focus on input
            e.preventDefault();
          }}
          role="listbox"
          side="bottom"
          sideOffset={4}
        >
          <Command>
            <CommandList>
              {commands.length === 0 ? (
                <CommandEmpty>No filter options</CommandEmpty>
              ) : (
                <CommandGroup>
                  {commands.map((command, index) => {
                    return (
                      <CommandItem
                        key={`${command.type}-${command.value}-${index}`}
                        onSelect={() => {
                          handleCommandSelect(command);
                        }}
                        value={command.display}
                      >
                        {command.display}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}
