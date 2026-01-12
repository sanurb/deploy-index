/**
 * Derived Services Selector
 *
 * Pure function that filters services based on query state.
 * No side effects, no internal state - purely functional filtering.
 */

import { parseSearchQuery } from "@/components/services/search-input-with-suggestions";
import type { ServicesQueryState } from "@/hooks/use-services-query-state";
import type { GroupedService } from "./types";
import { calculateSearchScore } from "./utils";

/**
 * Derives visible services from all services and query state.
 *
 * Applies filters in order:
 * 1. Search query (scored matching)
 * 2. Environment filter (any matching env)
 * 3. Runtime filter (any matching runtime)
 * 4. Owner filter (exact match)
 */
export function deriveVisibleServices(
  services: readonly GroupedService[],
  queryState: ServicesQueryState
): readonly GroupedService[] {
  const { q, env, runtime, owner } = queryState;

  let filtered = services;

  // Extract free text from query (excluding filter syntax)
  const parsed = parseSearchQuery(q);
  const freeText = parsed.freeText.trim();

  // Apply search query with scoring (only on free text, not filter syntax)
  if (freeText.length > 0) {
    interface ScoredService {
      readonly service: GroupedService;
      readonly score: number;
    }

    const scored = filtered
      .map(
        (service: GroupedService): ScoredService => ({
          service,
          score: calculateSearchScore(service, freeText),
        })
      )
      .filter((item: ScoredService) => item.score > 0)
      .sort((a: ScoredService, b: ScoredService) => b.score - a.score)
      .map((item: ScoredService) => item.service);

    filtered = scored;
  }

  // Apply environment filter
  if (env.length > 0) {
    const envSet = new Set(env);
    filtered = filtered.filter((service) => {
      return service.environments.some((e) => envSet.has(e.env));
    });
  }

  // Apply runtime filter
  if (runtime.length > 0) {
    const runtimeSet = new Set(runtime);
    filtered = filtered.filter((service) => {
      return service.runtimeFootprint.some((rt) => runtimeSet.has(rt));
    });
  }

  // Apply owner filter
  if (owner.length > 0) {
    const ownerSet = new Set(owner.map((o) => o.toLowerCase()));
    filtered = filtered.filter((service) => {
      return ownerSet.has(service.owner.toLowerCase());
    });
  }

  return filtered;
}
