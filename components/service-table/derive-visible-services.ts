/**
 * Derived Services Selector
 *
 * Pure function that filters services based on query state.
 * No side effects, no internal state - purely functional filtering.
 *
 * Filtering strategy:
 * 1. Free text search (q parameter) - scored matching across all text fields
 * 2. Environment filter - match services with selected environments
 * 3. Runtime filter - match services with selected runtimes
 * 4. Owner filter - match services with selected owners
 * 5. Match mode - controls how multiple filters combine (all vs any)
 */

import type { ServicesQueryState } from "@/hooks/use-services-query-state";
import type { GroupedService } from "./types";
import { calculateSearchScore } from "./utils";

/**
 * Derives visible services from all services and query state.
 *
 * With the Linear-style architecture, q is pure free text (no filter tokens).
 * Structured filters (env, owner, runtime) are separate and explicit.
 *
 * @param services - All available services
 * @param queryState - Current query state from URL
 * @returns Filtered and sorted services
 */
export function deriveVisibleServices(
  services: readonly GroupedService[],
  queryState: ServicesQueryState
): readonly GroupedService[] {
  const { q, env, runtime, owner, match } = queryState;

  let filtered = services;

  // Apply free text search with scoring
  const searchQuery = q.trim();

  if (searchQuery.length > 0) {
    interface ScoredService {
      readonly service: GroupedService;
      readonly score: number;
    }

    const scored = filtered
      .map(
        (service: GroupedService): ScoredService => ({
          service,
          score: calculateSearchScore(service, searchQuery),
        })
      )
      .filter((item: ScoredService) => item.score > 0)
      .sort((a: ScoredService, b: ScoredService) => b.score - a.score)
      .map((item: ScoredService) => item.service);

    filtered = scored;
  }

  // Apply structured filters based on match mode
  const hasFilters = env.length > 0 || runtime.length > 0 || owner.length > 0;

  if (hasFilters) {
    if (match === "all") {
      // Match ALL filters (AND condition) - default
      // Service must satisfy all active filters

      if (env.length > 0) {
        const envSet = new Set(env);
        filtered = filtered.filter((service) =>
          service.environments.some((e) => envSet.has(e.env))
        );
      }

      if (runtime.length > 0) {
        const runtimeSet = new Set(runtime);
        filtered = filtered.filter((service) =>
          service.runtimeFootprint.some((rt) => runtimeSet.has(rt))
        );
      }

      if (owner.length > 0) {
        const ownerSet = new Set(owner.map((o) => o.toLowerCase()));
        filtered = filtered.filter((service) =>
          ownerSet.has(service.owner.toLowerCase())
        );
      }
    } else {
      // Match ANY filter (OR condition)
      // Service must satisfy at least one active filter

      filtered = filtered.filter((service) => {
        let matchesAny = false;

        if (env.length > 0) {
          const envSet = new Set(env);
          matchesAny =
            matchesAny || service.environments.some((e) => envSet.has(e.env));
        }

        if (runtime.length > 0) {
          const runtimeSet = new Set(runtime);
          matchesAny =
            matchesAny ||
            service.runtimeFootprint.some((rt) => runtimeSet.has(rt));
        }

        if (owner.length > 0) {
          const ownerSet = new Set(owner.map((o) => o.toLowerCase()));
          matchesAny = matchesAny || ownerSet.has(service.owner.toLowerCase());
        }

        return matchesAny;
      });
    }
  }

  return filtered;
}
