/**
 * Services Query State Hook
 *
 * Manages all query state for the Services page with URL synchronization via nuqs.
 * Implements Linear-style two-layer architecture:
 * - Layer 1: Free text search (q parameter)
 * - Layer 2: Structured filters (env, owner, runtime, match)
 *
 * State is normalized to Sets internally for efficient lookups while serializing
 * as arrays in the URL for shareability.
 *
 * Invariants:
 * - q is always a string (free text, never contains filter tokens)
 * - Filter arrays are deduplicated
 * - Empty arrays serialize as null in URL
 * - match defaults to "all"
 */

"use client";

import {
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";
import type { FilterMatchMode } from "@/types/filters";

/**
 * Debounce delay for search input changes (milliseconds).
 * Prevents excessive URL updates while typing.
 */
const QUERY_BAR_DEBOUNCE_MS = 200;

/**
 * Valid environment values for services.
 */
export type Environment = "production" | "staging" | "development";

/**
 * Complete query state for the services table.
 * All fields are readonly to enforce immutability.
 */
export interface ServicesQueryState {
  readonly q: string;
  readonly env: readonly Environment[];
  readonly owner: readonly string[];
  readonly runtime: readonly string[];
  readonly match: FilterMatchMode;
}

/**
 * Helper functions for manipulating query state.
 * All mutations happen through these controlled interfaces.
 */
interface ServicesQueryStateHelpers {
  readonly setQ: (query: string) => void;
  readonly setEnv: (environments: readonly Environment[]) => void;
  readonly toggleEnv: (env: Environment) => void;
  readonly setOwner: (owners: readonly string[]) => void;
  readonly setRuntime: (runtimes: readonly string[]) => void;
  readonly setMatch: (mode: FilterMatchMode) => void;
  readonly clearFilters: () => void;
  readonly activeFilterCount: number;
}

/**
 * URL query parameter schema with type-safe parsers.
 * Defines how state is serialized to/from URL.
 */
const servicesQuerySchema = {
  q: parseAsString.withDefault(""),
  env: parseAsArrayOf(parseAsString).withDefault([]),
  owner: parseAsArrayOf(parseAsString).withDefault([]),
  runtime: parseAsArrayOf(parseAsString).withDefault([]),
  match: parseAsStringEnum<FilterMatchMode>(["all", "any"]).withDefault("all"),
} as const;

/**
 * Type guard: checks if a string is a valid Environment.
 *
 * @param value - String to validate
 * @returns True if value is a valid Environment
 */
function isValidEnvironment(value: string): value is Environment {
  return (
    value === "production" || value === "staging" || value === "development"
  );
}

/**
 * Normalizes environment array by filtering out invalid values.
 *
 * @param rawEnv - Raw array from URL parameters
 * @returns Array of valid Environment values only
 */
function normalizeEnvironments(
  rawEnv: readonly string[]
): readonly Environment[] {
  return rawEnv.filter(isValidEnvironment);
}

/**
 * Hook for managing Services page query state with URL synchronization.
 *
 * Provides a clean API for reading and updating search and filter state.
 * All changes are synced to URL query parameters for shareability and
 * browser back/forward navigation.
 *
 * @returns Current state and helper functions for mutations
 */
export function useServicesQueryState(): ServicesQueryState &
  ServicesQueryStateHelpers {
  const [params, setParams] = useQueryStates(servicesQuerySchema, {
    history: "push",
    shallow: false,
  });

  // Normalize state from URL parameters
  const normalizedState: ServicesQueryState = useMemo(
    () => ({
      q: params.q?.trim() ?? "",
      env: normalizeEnvironments(params.env ?? []),
      owner: Array.from(new Set(params.owner ?? [])),
      runtime: Array.from(new Set(params.runtime ?? [])),
      match: params.match ?? "all",
    }),
    [params]
  );

  // Helper: Set free text search query
  const setQ = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim();
      setParams({ q: trimmedQuery.length > 0 ? trimmedQuery : null });
    },
    [setParams]
  );

  // Helper: Set environment filters (replace all)
  const setEnv = useCallback(
    (environments: readonly Environment[]) => {
      const uniqueEnv = Array.from(new Set(environments));
      setParams({ env: uniqueEnv.length > 0 ? uniqueEnv : null });
    },
    [setParams]
  );

  // Helper: Toggle single environment filter
  const toggleEnv = useCallback(
    (env: Environment) => {
      const currentSet = new Set(normalizedState.env);

      if (currentSet.has(env)) {
        currentSet.delete(env);
      } else {
        currentSet.add(env);
      }

      const newEnv = Array.from(currentSet);
      setParams({ env: newEnv.length > 0 ? newEnv : null });
    },
    [normalizedState.env, setParams]
  );

  // Helper: Set owner filters (replace all)
  const setOwner = useCallback(
    (owners: readonly string[]) => {
      const uniqueOwners = Array.from(new Set(owners));
      setParams({ owner: uniqueOwners.length > 0 ? uniqueOwners : null });
    },
    [setParams]
  );

  // Helper: Set runtime filters (replace all)
  const setRuntime = useCallback(
    (runtimes: readonly string[]) => {
      const uniqueRuntimes = Array.from(new Set(runtimes));
      setParams({ runtime: uniqueRuntimes.length > 0 ? uniqueRuntimes : null });
    },
    [setParams]
  );

  // Helper: Set filter match mode
  const setMatch = useCallback(
    (mode: FilterMatchMode) => {
      setParams({ match: mode });
    },
    [setParams]
  );

  // Helper: Clear all structured filters (preserves free text search)
  const clearFilters = useCallback(() => {
    setParams({
      env: null,
      owner: null,
      runtime: null,
      match: "all",
    });
  }, [setParams]);

  // Compute active filter count (excludes free text search)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (normalizedState.env.length > 0) {
      count += 1;
    }
    if (normalizedState.owner.length > 0) {
      count += 1;
    }
    if (normalizedState.runtime.length > 0) {
      count += 1;
    }
    return count;
  }, [normalizedState]);

  return {
    ...normalizedState,
    setQ,
    setEnv,
    toggleEnv,
    setOwner,
    setRuntime,
    setMatch,
    clearFilters,
    activeFilterCount,
  };
}

export { QUERY_BAR_DEBOUNCE_MS };
