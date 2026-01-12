/**
 * Services Query Bar - Unified Command Surface (Tokenized Model)
 *
 * Single source of truth: tokens[] (structured filters) + freeText (string).
 * Chips are rendered from tokens[]. Input displays only freeText.
 * Selecting a suggestion updates tokens[], clears the typed fragment from freeText.
 *
 * Panel behavior:
 * - Opens ONE panel on focus/click
 * - Shows "Filter suggestions" header with dynamic sections
 * - Esc closes, Enter confirms, Backspace at start removes chip, Tab autocompletes
 */

"use client";

import { Search, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENV_LABELS } from "@/components/service-table/constants";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  Environment,
  ServicesQueryState,
} from "@/hooks/use-services-query-state";
import { QUERY_BAR_DEBOUNCE_MS } from "@/hooks/use-services-query-state";
import { cn } from "@/lib/utils";
import { parseSearchQuery } from "./search-input-with-suggestions";

const QUERY_BAR_HEIGHT_PX = 38;
const FILTER_PATTERN = /\b(env|owner|runtime):(\S*)$/;

interface FilterToken {
  readonly type: "env" | "owner" | "runtime";
  readonly value: string; // Raw value: "production", "payments", "k8s"
}

interface FilterChip {
  readonly type: "env" | "owner" | "runtime";
  readonly label: string;
  readonly displayValue: string;
  readonly rawValue: string;
  readonly onRemove: () => void;
}

interface FilterSuggestion {
  readonly type: "env" | "owner" | "runtime";
  readonly label: string;
  readonly value: string;
  readonly display: string;
}

interface QueryBarProps {
  readonly queryState: ServicesQueryState;
  readonly onQChange: (query: string) => void;
  readonly availableRuntimes: readonly string[];
  readonly availableOwners: readonly string[];
  readonly className?: string;
}

/**
 * Serializes tokens + freeText into a single query string
 */
function serializeQuery(
  tokens: readonly FilterToken[],
  freeText: string
): string {
  const filterStrings: string[] = [];

  for (const token of tokens) {
    if (token.type === "env") {
      const env = token.value as Environment;
      const envShort =
        env === "production" ? "prod" : env === "staging" ? "stage" : "dev";
      filterStrings.push(`env:${envShort}`);
    } else if (token.type === "owner") {
      filterStrings.push(`owner:${token.value}`);
    } else if (token.type === "runtime") {
      filterStrings.push(`runtime:${token.value}`);
    }
  }

  return [freeText.trim(), ...filterStrings].filter(Boolean).join(" ").trim();
}

/**
 * Parses query string into tokens[] + freeText
 */
function deserializeQuery(query: string): {
  readonly tokens: readonly FilterToken[];
  readonly freeText: string;
} {
  const parsed = parseSearchQuery(query);
  const tokens: FilterToken[] = [];

  for (const env of parsed.filters.env) {
    tokens.push({ type: "env", value: env });
  }
  for (const owner of parsed.filters.owner) {
    tokens.push({ type: "owner", value: owner });
  }
  for (const runtime of parsed.filters.runtime) {
    tokens.push({ type: "runtime", value: runtime });
  }

  return { tokens, freeText: parsed.freeText.trim() };
}

/**
 * Generates environment filter suggestions
 */
function generateEnvSuggestions(
  filterValue: string
): readonly FilterSuggestion[] {
  const environments: Environment[] = ["production", "staging", "development"];
  const suggestions: FilterSuggestion[] = [];

  for (const env of environments) {
    const envLabel = ENV_LABELS[env].toLowerCase();
    let envShort: string;
    if (env === "production") {
      envShort = "prod";
    } else if (env === "staging") {
      envShort = "stage";
    } else {
      envShort = "dev";
    }
    const matches =
      envLabel.startsWith(filterValue.toLowerCase()) ||
      envShort.startsWith(filterValue.toLowerCase()) ||
      filterValue.length === 0;

    if (matches) {
      suggestions.push({
        type: "env",
        label: "env",
        value: env,
        display: `${ENV_LABELS[env]} (${envShort})`,
      });
    }
  }

  return suggestions;
}

/**
 * Generates owner filter suggestions
 */
function generateOwnerSuggestions(
  filterValue: string,
  availableOwners: readonly string[]
): readonly FilterSuggestion[] {
  const suggestions: FilterSuggestion[] = [];

  for (const owner of availableOwners) {
    const matches =
      owner.toLowerCase().startsWith(filterValue.toLowerCase()) ||
      filterValue.length === 0;

    if (matches) {
      suggestions.push({
        type: "owner",
        label: "owner",
        value: owner,
        display: owner,
      });
    }
  }

  return suggestions;
}

/**
 * Generates runtime filter suggestions
 */
function generateRuntimeSuggestions(
  filterValue: string,
  availableRuntimes: readonly string[]
): readonly FilterSuggestion[] {
  const suggestions: FilterSuggestion[] = [];

  for (const runtime of availableRuntimes) {
    const matches =
      runtime.toLowerCase().startsWith(filterValue.toLowerCase()) ||
      filterValue.length === 0;

    if (matches) {
      suggestions.push({
        type: "runtime",
        label: "runtime",
        value: runtime,
        display: runtime,
      });
    }
  }

  return suggestions;
}

/**
 * Generates all filter suggestions based on current free text
 */
function generateFilterSuggestions(
  freeText: string,
  availableRuntimes: readonly string[],
  availableOwners: readonly string[]
): {
  readonly env: readonly FilterSuggestion[];
  readonly owner: readonly FilterSuggestion[];
  readonly runtime: readonly FilterSuggestion[];
} {
  const filterMatch = freeText.match(FILTER_PATTERN);
  if (!filterMatch) {
    // No active filter prefix, return all suggestions
    return {
      env: generateEnvSuggestions(""),
      owner: generateOwnerSuggestions("", availableOwners),
      runtime: generateRuntimeSuggestions("", availableRuntimes),
    };
  }

  const filterType = filterMatch[1] as "env" | "owner" | "runtime";
  const filterValue = filterMatch[2] ?? "";

  if (filterType === "env") {
    return {
      env: generateEnvSuggestions(filterValue),
      owner: [],
      runtime: [],
    };
  }
  if (filterType === "owner") {
    return {
      env: [],
      owner: generateOwnerSuggestions(filterValue, availableOwners),
      runtime: [],
    };
  }
  return {
    env: [],
    owner: [],
    runtime: generateRuntimeSuggestions(filterValue, availableRuntimes),
  };
}

/**
 * Main Query Bar component - Unified Command Surface
 */
export function QueryBar({
  queryState,
  onQChange,
  availableRuntimes,
  availableOwners,
  className,
}: QueryBarProps): React.ReactElement {
  // Single source of truth: tokens + freeText
  const [tokens, setTokens] = useState<readonly FilterToken[]>([]);
  const [freeText, setFreeText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isPointerInteractionRef = useRef(false);

  // Sync with prop on mount and external changes
  useEffect(() => {
    const { tokens: parsedTokens, freeText: parsedFreeText } = deserializeQuery(
      queryState.q
    );
    setTokens(parsedTokens);
    setFreeText(parsedFreeText);
  }, [queryState.q]);

  // Convert tokens to chips for rendering
  const chips = useMemo((): readonly FilterChip[] => {
    return tokens.map((token) => {
      return {
        type: token.type,
        label: token.type,
        displayValue:
          token.type === "env"
            ? ENV_LABELS[token.value as Environment]
            : token.value,
        rawValue: token.value,
        onRemove: () => {
          const newTokens = tokens.filter(
            (t) => !(t.type === token.type && t.value === token.value)
          );
          setTokens(newTokens);
          const newQuery = serializeQuery(newTokens, freeText);
          onQChange(newQuery);
        },
      };
    });
  }, [tokens, freeText, onQChange]);

  // Generate suggestions based on freeText (not full query)
  const suggestions = useMemo(
    () =>
      generateFilterSuggestions(freeText, availableRuntimes, availableOwners),
    [freeText, availableRuntimes, availableOwners]
  );

  const hasSuggestions =
    suggestions.env.length > 0 ||
    suggestions.owner.length > 0 ||
    suggestions.runtime.length > 0;

  // Debounced update to parent
  const updateQuery = useCallback(
    (newTokens: readonly FilterToken[], newFreeText: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const newQuery = serializeQuery(newTokens, newFreeText);
        onQChange(newQuery);
      }, QUERY_BAR_DEBOUNCE_MS);
    },
    [onQChange]
  );

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setFreeText(newValue);

      // Open panel on typing if there are suggestions
      if (hasOpenedOnce && newValue.length > 0 && hasSuggestions) {
        setIsOpen(true);
      } else if (hasOpenedOnce && newValue.length === 0) {
        setIsOpen(false);
      }

      // Debounce query update
      updateQuery(tokens, newValue);
    },
    [hasOpenedOnce, hasSuggestions, tokens, updateQuery]
  );

  // Handle pointer interaction
  const handlePointerDown = useCallback(() => {
    isPointerInteractionRef.current = true;
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    const wasFirstInteraction = !hasOpenedOnce;
    setHasOpenedOnce(true);

    // Only open on keyboard focus (Tab), not click
    if (
      !(isPointerInteractionRef.current || wasFirstInteraction) &&
      hasSuggestions
    ) {
      setIsOpen(true);
    }

    requestAnimationFrame(() => {
      isPointerInteractionRef.current = false;
    });
  }, [hasOpenedOnce, hasSuggestions]);

  // Handle backspace at start to remove last chip
  const handleBackspaceAtStart = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (freeText.length === 0 && chips.length > 0) {
        e.preventDefault();
        const lastChip = chips.at(-1);
        if (lastChip) {
          lastChip.onRemove();
        }
      }
    },
    [freeText, chips]
  );

  // Handle tab to autocomplete filter prefix
  const handleTabAutocomplete = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const filterMatch = freeText.match(FILTER_PATTERN);
      if (filterMatch && filterMatch[2] === "") {
        e.preventDefault();
        // Tab through filter types: env -> owner -> runtime
        const currentType = filterMatch[1];
        let nextType: string;
        if (currentType === "env") {
          nextType = "owner";
        } else if (currentType === "owner") {
          nextType = "runtime";
        } else {
          nextType = "env";
        }
        const prefix = freeText.slice(0, filterMatch.index ?? 0);
        const newFreeText = prefix ? `${prefix} ${nextType}:` : `${nextType}:`;
        setFreeText(newFreeText);
        updateQuery(tokens, newFreeText);
      }
    },
    [freeText, tokens, updateQuery]
  );

  // Handle keydown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        // Preserve query on Esc
        return;
      }

      if (e.key === "Backspace") {
        handleBackspaceAtStart(e);
        return;
      }

      if (e.key === "Tab" && !e.shiftKey) {
        handleTabAutocomplete(e);
      }
    },
    [handleBackspaceAtStart, handleTabAutocomplete]
  );

  // Handle suggestion select
  const handleSuggestionSelect = useCallback(
    (suggestion: FilterSuggestion) => {
      // Remove the typed fragment that triggered the suggestion
      const filterMatch = freeText.match(FILTER_PATTERN);
      let newFreeText: string;

      if (filterMatch) {
        // User typed "env:" or "env:pr" → remove it
        newFreeText = freeText.slice(0, filterMatch.index ?? 0).trim();
      } else {
        // No active filter, keep freeText as-is
        newFreeText = freeText.trim();
      }

      if (!suggestion.value) {
        // User selected a prefix only (e.g., "env:")
        // Add it to freeText for continued typing
        setFreeText(
          newFreeText
            ? `${newFreeText} ${suggestion.label}:`
            : `${suggestion.label}:`
        );
        setIsOpen(true);
        return;
      }

      // Add or replace token
      let newTokens: FilterToken[];
      const existingIndex = tokens.findIndex((t) => t.type === suggestion.type);

      if (existingIndex >= 0) {
        // Replace existing token of same type
        newTokens = tokens.map((t, i) =>
          i === existingIndex
            ? { type: suggestion.type, value: suggestion.value }
            : t
        );
      } else {
        // Add new token
        newTokens = [
          ...tokens,
          { type: suggestion.type, value: suggestion.value },
        ];
      }

      setTokens(newTokens);
      setFreeText(newFreeText);
      setIsOpen(false);

      // Update parent immediately (no debounce for selection)
      const newQuery = serializeQuery(newTokens, newFreeText);
      onQChange(newQuery);

      // Refocus input after selection
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [freeText, tokens, onQChange]
  );

  // Handle popover open change
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasOpenedOnce) {
        setIsOpen(false);
        return;
      }
      setIsOpen(open);
    },
    [hasOpenedOnce]
  );

  // Keyboard shortcut for focus (/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const isEmpty = freeText.trim().length === 0 && chips.length === 0;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      data-slot="query-bar"
      style={{ height: `${QUERY_BAR_HEIGHT_PX}px` }}
    >
      <Popover onOpenChange={handleOpenChange} open={isOpen}>
        <div className="relative flex flex-1 items-center gap-1.5 rounded-md border border-border bg-background px-2">
          <Search
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-muted-foreground"
          />
          <PopoverTrigger asChild>
            <div className="flex flex-1 items-center gap-1.5">
              {/* Filter chips - rendered from tokens[] */}
              {chips.length > 0 && (
                <div className="flex items-center gap-1">
                  {chips.map((chip, index) => {
                    return (
                      <button
                        aria-label={`Remove filter ${chip.label}: ${chip.displayValue}`}
                        className="group inline-flex h-6 items-center gap-1 rounded border border-border/30 bg-muted/20 px-1.5 text-muted-foreground text-xs transition-colors hover:border-border/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                        key={`${chip.type}-${chip.rawValue}-${index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          chip.onRemove();
                        }}
                        type="button"
                      >
                        <span className="font-medium">{chip.label}:</span>
                        <span>{chip.displayValue}</span>
                        <X
                          aria-hidden="true"
                          className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Input - displays only freeText, not serialized tokens */}
              <Input
                aria-autocomplete="list"
                aria-controls={isOpen ? "filter-suggestions" : undefined}
                aria-expanded={isOpen}
                aria-label="Search services"
                className="h-8 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                onChange={handleChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                placeholder={
                  chips.length > 0
                    ? ""
                    : "Type to search by name, owner, repo, domain..."
                }
                ref={inputRef}
                role="combobox"
                type="text"
                value={freeText}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[--radix-popover-trigger-width] rounded-[10px] border border-border bg-popover p-0 shadow-md"
            id="filter-suggestions"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
            side="bottom"
            sideOffset={4}
          >
            <Command>
              <div className="border-border border-b px-3 py-2">
                <p className="font-medium text-muted-foreground text-xs">
                  Filter suggestions
                </p>
              </div>
              <CommandList>
                {isEmpty ? (
                  <div className="px-3 py-4">
                    <p className="text-muted-foreground text-xs">
                      Type to search by name, owner, repo, domain. Use{" "}
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                        env:
                      </kbd>{" "}
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                        owner:
                      </kbd>{" "}
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                        runtime:
                      </kbd>
                      . Press{" "}
                      <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                        /
                      </kbd>{" "}
                      to focus.
                    </p>
                  </div>
                ) : null}
                {!isEmpty && hasSuggestions ? (
                  <>
                    {suggestions.env.length > 0 && (
                      <>
                        <CommandGroup heading="Environment">
                          {suggestions.env.map((suggestion, index) => {
                            return (
                              <CommandItem
                                key={`env-${suggestion.value}-${index}`}
                                onSelect={() => {
                                  handleSuggestionSelect(suggestion);
                                }}
                                value={suggestion.display}
                              >
                                {suggestion.display}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                        {(suggestions.owner.length > 0 ||
                          suggestions.runtime.length > 0) && (
                          <CommandSeparator />
                        )}
                      </>
                    )}
                    {suggestions.owner.length > 0 && (
                      <>
                        <CommandGroup heading="Owner">
                          {suggestions.owner.map((suggestion, index) => {
                            return (
                              <CommandItem
                                key={`owner-${suggestion.value}-${index}`}
                                onSelect={() => {
                                  handleSuggestionSelect(suggestion);
                                }}
                                value={suggestion.display}
                              >
                                {suggestion.display}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                        {suggestions.runtime.length > 0 && <CommandSeparator />}
                      </>
                    )}
                    {suggestions.runtime.length > 0 && (
                      <CommandGroup heading="Runtime">
                        {suggestions.runtime.map((suggestion, index) => {
                          return (
                            <CommandItem
                              key={`runtime-${suggestion.value}-${index}`}
                              onSelect={() => {
                                handleSuggestionSelect(suggestion);
                              }}
                              value={suggestion.display}
                            >
                              {suggestion.display}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </>
                ) : null}
                {isEmpty || hasSuggestions ? null : (
                  <CommandEmpty>No suggestions</CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </div>
      </Popover>
    </div>
  );
}
