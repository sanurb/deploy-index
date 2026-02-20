"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedLayout, setCachedLayout } from "@/lib/graph/layout-cache";
import { computeLayout } from "@/lib/graph/layout-engine";
import type { FocusKind, GraphLayout, GraphResponse } from "@/types/graph";

interface UseGraphDataOptions {
  readonly organizationId: string;
  readonly focusKind: FocusKind | "";
  readonly focusId: string;
  readonly hops: number;
}

interface UseGraphDataResult {
  readonly data: GraphResponse | null;
  readonly layout: GraphLayout | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isTruncated: boolean;
  readonly refetch: () => void;
}

const DEBOUNCE_MS = 300;

export function useGraphData(options: UseGraphDataOptions): UseGraphDataResult {
  const { organizationId, focusKind, focusId, hops } = options;

  const [data, setData] = useState<GraphResponse | null>(null);
  const [layout, setLayout] = useState<GraphLayout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchGraph = useCallback(() => {
    if (!organizationId || !focusKind || !focusId) {
      setData(null);
      setLayout(null);
      setError(null);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      organizationId,
      focusKind,
      focusId,
      hops: String(hops),
    });

    fetch(`/api/graph?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? "Focus not found. Try a different search."
              : `Request failed (${res.status})`
          );
        }
        return res.json() as Promise<GraphResponse>;
      })
      .then((response) => {
        if (controller.signal.aborted) return;

        setData(response);

        // Compute or retrieve cached layout
        const cached = getCachedLayout(response.queryHash);
        if (cached) {
          setLayout(cached);
        } else {
          const computed = computeLayout(response.nodes, response.queryHash);
          setCachedLayout(response.queryHash, computed);
          setLayout(computed);
        }

        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setIsLoading(false);
      });
  }, [organizationId, focusKind, focusId, hops]);

  // Debounced fetch
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(fetchGraph, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fetchGraph]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    data,
    layout,
    isLoading,
    error,
    isTruncated: data?.truncated ?? false,
    refetch: fetchGraph,
  };
}
