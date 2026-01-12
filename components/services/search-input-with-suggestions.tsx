/**
 * Search Input with Filter Suggestions
 *
 * Primary search input with inline filter token support and search suggestions.
 * Parses filter syntax (env:prod, owner:payments, runtime:k8s) from search query
 * and provides suggestions as user types.
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

const ENVIRONMENTS: readonly Environment[] = [
  "production",
  "staging",
  "development",
] as const;

interface SearchSuggestion {
  readonly type: "env" | "owner" | "runtime";
  readonly label: string;
  readonly value: string;
  readonly display: string;
}

interface SearchInputWithSuggestionsProps {
  readonly value: string;
  readonly onChange: (query: string) => void;
  readonly availableRuntimes: readonly string[];
  readonly availableOwners: readonly string[];
  readonly inputRef?: React.RefObject<HTMLInputElement>;
  readonly className?: string;
}

/**
 * Parses filter syntax from search query
 * Returns { freeText: string, filters: { env, owner, runtime } }
 */
function parseSearchQuery(query: string): {
  readonly freeText: string;
  readonly filters: {
    readonly env: readonly Environment[];
    readonly owner: readonly string[];
    readonly runtime: readonly string[];
  };
} {
  const envFilters: Environment[] = [];
  const ownerFilters: string[] = [];
  const runtimeFilters: string[] = [];
  const freeTextParts: string[] = [];

  // Match filter patterns: env:prod, owner:payments, runtime:k8s
  const filterPattern = /\b(env|owner|runtime):(\S+)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = filterPattern.exec(query)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = query.slice(lastIndex, match.index).trim();
      if (textBefore) {
        freeTextParts.push(textBefore);
      }
    }

    const filterType = match[1].toLowerCase();
    const filterValue = match[2].toLowerCase();

    if (filterType === "env") {
      // Normalize environment values
      if (filterValue === "prod" || filterValue === "production") {
        envFilters.push("production");
      } else if (filterValue === "stage" || filterValue === "staging") {
        envFilters.push("staging");
      } else if (filterValue === "dev" || filterValue === "development") {
        envFilters.push("development");
      }
    } else if (filterType === "owner") {
      ownerFilters.push(filterValue);
    } else if (filterType === "runtime") {
      runtimeFilters.push(filterValue);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < query.length) {
    const remainingText = query.slice(lastIndex).trim();
    if (remainingText) {
      freeTextParts.push(remainingText);
    }
  }

  return {
    freeText: freeTextParts.join(" "),
    filters: {
      env: Array.from(new Set(envFilters)),
      owner: Array.from(new Set(ownerFilters)),
      runtime: Array.from(new Set(runtimeFilters)),
    },
  };
}

/**
 * Generates search suggestions based on current query
 */
function generateSuggestions(
  query: string,
  availableRuntimes: readonly string[],
  availableOwners: readonly string[]
): readonly SearchSuggestion[] {
  const lowerQuery = query.toLowerCase().trim();
  const suggestions: SearchSuggestion[] = [];

  // Check if user is typing a filter prefix
  const filterMatch = lowerQuery.match(/\b(env|owner|runtime):(\S*)$/);
  if (filterMatch) {
    const filterType = filterMatch[1] as "env" | "owner" | "runtime";
    const filterValue = filterMatch[2];

    if (filterType === "env") {
      for (const env of ENVIRONMENTS) {
        const envLabel = ENV_LABELS[env].toLowerCase();
        if (envLabel.startsWith(filterValue) || env.startsWith(filterValue)) {
          suggestions.push({
            type: "env",
            label: "env",
            value: env,
            display: `${ENV_LABELS[env]} (${env})`,
          });
        }
      }
    } else if (filterType === "owner") {
      for (const owner of availableOwners) {
        if (owner.toLowerCase().startsWith(filterValue)) {
          suggestions.push({
            type: "owner",
            label: "owner",
            value: owner,
            display: owner,
          });
        }
      }
    } else if (filterType === "runtime") {
      for (const runtime of availableRuntimes) {
        if (runtime.toLowerCase().startsWith(filterValue)) {
          suggestions.push({
            type: "runtime",
            label: "runtime",
            value: runtime,
            display: runtime,
          });
        }
      }
    }
  } else {
    // Suggest filter prefixes if query doesn't start with one
    if (lowerQuery.length === 0 || !lowerQuery.includes(":")) {
      suggestions.push(
        {
          type: "env",
          label: "env",
          value: "",
          display: "env: Filter by environment",
        },
        {
          type: "owner",
          label: "owner",
          value: "",
          display: "owner: Filter by owner",
        },
        {
          type: "runtime",
          label: "runtime",
          value: "",
          display: "runtime: Filter by runtime",
        }
      );
    }
  }

  return suggestions.slice(0, 8);
}

export function SearchInputWithSuggestions({
  value,
  onChange,
  availableRuntimes,
  availableOwners,
  inputRef,
  className,
}: SearchInputWithSuggestionsProps): React.ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const suggestions = useMemo(
    () => generateSuggestions(localValue, availableRuntimes, availableOwners),
    [localValue, availableRuntimes, availableOwners]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      setIsOpen(newValue.length > 0 && suggestions.length > 0);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, QUERY_BAR_DEBOUNCE_MS);
    },
    [onChange, suggestions.length]
  );

  const handleSuggestionSelect = useCallback(
    (suggestion: SearchSuggestion) => {
      const currentQuery = localValue.trim();
      const filterMatch = currentQuery.match(/\b(env|owner|runtime):(\S*)$/);

      let newQuery: string;
      if (filterMatch && suggestion.value) {
        // Replace the incomplete filter with the selected value
        const prefix = currentQuery.slice(0, filterMatch.index);
        newQuery = `${prefix}${suggestion.label}:${suggestion.value}`.trim();
      } else if (suggestion.value) {
        // Append new filter
        newQuery = currentQuery
          ? `${currentQuery} ${suggestion.label}:${suggestion.value}`
          : `${suggestion.label}:${suggestion.value}`;
      } else {
        // Just add the prefix
        newQuery = currentQuery
          ? `${currentQuery} ${suggestion.label}:`
          : `${suggestion.label}:`;
      }

      setLocalValue(newQuery);
      setIsOpen(false);
      onChange(newQuery);
    },
    [localValue, onChange]
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <div className="relative flex-1" ref={inputContainerRef}>
        <Search
          aria-hidden="true"
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <PopoverTrigger asChild>
          <Input
            aria-label="Search services"
            className={cn("h-9 pr-3 pl-9", className)}
            onChange={handleChange}
            onFocus={() => {
              if (localValue.length > 0 && suggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            placeholder="Search services…"
            ref={inputRef}
            value={localValue}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty>No suggestions</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => {
                    return (
                      <CommandItem
                        key={`${suggestion.type}-${suggestion.value}-${index}`}
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
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
}

export { parseSearchQuery };
