/**
 * Global Search Bar (Layer 1)
 *
 * Free text search only - no filter parsing, no dropdown suggestions.
 * Treats all input as literal text for full-text search across service fields.
 *
 * Responsibilities:
 * - Render 40px height search input with icon
 * - Debounce input changes
 * - Sync to URL q parameter
 * - Handle Esc to clear/blur
 *
 * Critical constraints (matching Linear):
 * - Never open suggestions dropdown
 * - Never parse filter tokens (env:, owner:, etc.)
 * - No popover, no autocomplete, no special behavior
 * - Focus shows ring only, no other UI changes
 *
 * Visual spec (dark mode, token-based):
 * - Height: 40px
 * - Radius: 10-12px
 * - Padding: 12px horizontal
 * - Background: bg-background or bg-card
 * - Border: border-border
 * - Focus: ring-1 ring-ring
 * - Left icon: 16px search icon in text-muted-foreground
 */

"use client";

import { Search } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { QUERY_BAR_DEBOUNCE_MS } from "@/hooks/use-services-query-state";
import { cn } from "@/lib/utils";

/**
 * Height of the search bar in pixels.
 * Matches toolbar control height for consistent alignment.
 */
const SEARCH_BAR_HEIGHT_PX = 36;

/**
 * Border radius in pixels for the search input.
 */
const SEARCH_BAR_RADIUS_PX = 10;

interface GlobalSearchBarProps {
  readonly value: string;
  readonly onChange: (query: string) => void;
  readonly className?: string;
  readonly placeholder?: string;
}

/**
 * Global search bar component for free text search.
 *
 * Handles keyboard shortcuts, debouncing, and URL synchronization.
 * Never opens suggestions or parses filter syntax.
 */
export function GlobalSearchBar({
  value,
  onChange,
  className,
  placeholder = "Search services…",
}: GlobalSearchBarProps): React.ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  /**
   * Handles input changes with debounced propagation.
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setLocalValue(newValue);

      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, QUERY_BAR_DEBOUNCE_MS);
    },
    [onChange]
  );

  /**
   * Handles Escape key: clear input if non-empty, otherwise blur.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        if (localValue.trim().length > 0) {
          setLocalValue("");
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    },
    [localValue, onChange]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative w-full", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label="Search services"
        className={cn(
          "pr-3 pl-9 transition-colors",
          "bg-background border-border",
          "hover:border-border/80",
          "focus-visible:ring-1 focus-visible:ring-ring"
        )}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        style={{
          height: `${SEARCH_BAR_HEIGHT_PX}px`,
          borderRadius: `${SEARCH_BAR_RADIUS_PX}px`,
        }}
        type="text"
        value={localValue}
      />
    </div>
  );
}
