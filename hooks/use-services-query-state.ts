/**
 * Services Query State Hook
 *
 * Manages all query state for the Services page with URL synchronization via nuqs.
 * Provides typed parsers, defaults, and imperative helpers for filter manipulation.
 *
 * State is normalized to Sets internally for efficient lookups while serializing
 * as arrays in the URL for shareability.
 */

"use client";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo } from "react";
import { parseSearchQuery } from "@/components/services/search-input-with-suggestions";

const QUERY_BAR_DEBOUNCE_MS = 200;

export type Environment = "production" | "staging" | "development";

export interface ServicesQueryState {
  readonly q: string;
  readonly env: readonly Environment[];
  readonly runtime: readonly string[];
  readonly owner: readonly string[];
}

interface ServicesQueryStateHelpers {
  readonly setQ: (query: string) => void;
  readonly toggleEnv: (env: Environment) => void;
  readonly setRuntime: (runtimes: readonly string[]) => void;
  readonly setOwner: (owners: readonly string[]) => void;
  readonly clearFilters: () => void;
  readonly activeCount: number;
}

const servicesQuerySchema = {
  q: parseAsString.withDefault(""),
  env: parseAsArrayOf(parseAsString).withDefault([]),
  runtime: parseAsArrayOf(parseAsString).withDefault([]),
  owner: parseAsArrayOf(parseAsString).withDefault([]),
} as const;

/**
 * Hook for managing Services page query state with URL synchronization.
 *
 * All state is synced to URL query parameters for shareability.
 * Arrays are normalized to Sets internally for efficient operations.
 */
export function useServicesQueryState(): ServicesQueryState &
  ServicesQueryStateHelpers {
  const [params, setParams] = useQueryStates(servicesQuerySchema);

  // Parse filters from query string and sync to separate filter arrays
  const parsedFilters = useMemo(() => {
    const query = params.q ?? "";
    if (query.trim().length === 0) {
      return {
        env: [] as readonly Environment[],
        runtime: [] as readonly string[],
        owner: [] as readonly string[],
      };
    }
    const parsed = parseSearchQuery(query);
    return {
      env: parsed.filters.env,
      runtime: parsed.filters.runtime,
      owner: parsed.filters.owner,
    };
  }, [params.q]);

  // Sync parsed filters to URL params if they differ
  useEffect(() => {
    const currentEnv = (params.env ?? []) as readonly Environment[];
    const currentRuntime = params.runtime ?? [];
    const currentOwner = params.owner ?? [];

    const envChanged =
      currentEnv.length !== parsedFilters.env.length ||
      !currentEnv.every((e) => parsedFilters.env.includes(e));
    const runtimeChanged =
      currentRuntime.length !== parsedFilters.runtime.length ||
      !currentRuntime.every((r) => parsedFilters.runtime.includes(r));
    const ownerChanged =
      currentOwner.length !== parsedFilters.owner.length ||
      !currentOwner.every((o) => parsedFilters.owner.includes(o));

    if (envChanged || runtimeChanged || ownerChanged) {
      setParams({
        env:
          parsedFilters.env.length > 0 ? Array.from(parsedFilters.env) : null,
        runtime:
          parsedFilters.runtime.length > 0
            ? Array.from(parsedFilters.runtime)
            : null,
        owner:
          parsedFilters.owner.length > 0
            ? Array.from(parsedFilters.owner)
            : null,
      });
    }
  }, [parsedFilters, params.env, params.runtime, params.owner, setParams]);

  const normalizedState: ServicesQueryState = useMemo(
    () => ({
      q: params.q ?? "",
      env: parsedFilters.env,
      runtime: parsedFilters.runtime,
      owner: parsedFilters.owner,
    }),
    [params.q, parsedFilters]
  );

  const envSet = useMemo(
    () => new Set(normalizedState.env),
    [normalizedState.env]
  );

  const setQ = useCallback(
    (query: string) => {
      setParams({ q: query || null });
    },
    [setParams]
  );

  const toggleEnv = useCallback(
    (env: Environment) => {
      const currentSet = new Set(envSet);
      if (currentSet.has(env)) {
        currentSet.delete(env);
      } else {
        currentSet.add(env);
      }
      setParams({
        env: currentSet.size > 0 ? Array.from(currentSet) : null,
      });
    },
    [envSet, setParams]
  );

  const setRuntime = useCallback(
    (runtimes: readonly string[]) => {
      setParams({
        runtime: runtimes.length > 0 ? Array.from(runtimes) : null,
      });
    },
    [setParams]
  );

  const setOwner = useCallback(
    (owners: readonly string[]) => {
      setParams({
        owner: owners.length > 0 ? Array.from(owners) : null,
      });
    },
    [setParams]
  );

  const clearFilters = useCallback(() => {
    setParams({
      q: null,
      env: null,
      runtime: null,
      owner: null,
    });
  }, [setParams]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (normalizedState.q.trim().length > 0) {
      count += 1;
    }
    if (normalizedState.env.length > 0) {
      count += 1;
    }
    if (normalizedState.runtime.length > 0) {
      count += 1;
    }
    if (normalizedState.owner.length > 0) {
      count += 1;
    }
    return count;
  }, [normalizedState]);

  return {
    ...normalizedState,
    setQ,
    toggleEnv,
    setRuntime,
    setOwner,
    clearFilters,
    activeCount,
  };
}

export { QUERY_BAR_DEBOUNCE_MS };
