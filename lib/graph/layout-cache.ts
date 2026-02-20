import type { GraphLayout } from "@/types/graph";

const MAX_ENTRIES = 20;

const cache = new Map<string, GraphLayout>();
const accessOrder: string[] = [];

export function getCachedLayout(queryHash: string): GraphLayout | null {
  const layout = cache.get(queryHash);
  if (!layout) return null;

  // Move to end of access order
  const idx = accessOrder.indexOf(queryHash);
  if (idx !== -1) {
    accessOrder.splice(idx, 1);
  }
  accessOrder.push(queryHash);

  return layout;
}

export function setCachedLayout(queryHash: string, layout: GraphLayout) {
  if (cache.has(queryHash)) {
    cache.set(queryHash, layout);
    return;
  }

  // Evict LRU if at capacity
  while (cache.size >= MAX_ENTRIES && accessOrder.length > 0) {
    const evictKey = accessOrder.shift()!;
    cache.delete(evictKey);
  }

  cache.set(queryHash, layout);
  accessOrder.push(queryHash);
}
