"use client";

import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { useCallback, useMemo } from "react";
import type { FocusKind } from "@/types/graph";

const graphQuerySchema = {
  focusKind: parseAsStringEnum<FocusKind>([
    "service",
    "domain",
    "dependency",
  ]).withDefault("" as FocusKind),
  focusId: parseAsString.withDefault(""),
  hops: parseAsInteger.withDefault(3),
  selected: parseAsString.withDefault(""),
  view: parseAsStringEnum<"3d" | "2d">(["3d", "2d"]).withDefault("3d"),
} as const;

export interface GraphQueryState {
  readonly focusKind: FocusKind | "";
  readonly focusId: string;
  readonly hops: number;
  readonly selected: string;
  readonly view: "3d" | "2d";
}

export interface GraphQueryStateHelpers {
  readonly setFocus: (kind: FocusKind, id: string) => void;
  readonly setHops: (hops: number) => void;
  readonly setSelected: (nodeId: string) => void;
  readonly clearSelected: () => void;
  readonly setView: (view: "3d" | "2d") => void;
  readonly clearFocus: () => void;
  readonly hasFocus: boolean;
}

export function useGraphQueryState(): GraphQueryState & GraphQueryStateHelpers {
  const [params, setParams] = useQueryStates(graphQuerySchema, {
    history: "push",
    shallow: false,
  });

  const state: GraphQueryState = useMemo(
    () => ({
      focusKind: params.focusKind || ("" as FocusKind | ""),
      focusId: params.focusId || "",
      hops: params.hops ?? 3,
      selected: params.selected || "",
      view: params.view || "3d",
    }),
    [params]
  );

  const setFocus = useCallback(
    (kind: FocusKind, id: string) => {
      setParams({ focusKind: kind, focusId: id, selected: null });
    },
    [setParams]
  );

  const setHops = useCallback(
    (hops: number) => {
      const clamped = Math.min(5, Math.max(1, hops));
      setParams({ hops: clamped });
    },
    [setParams]
  );

  const setSelected = useCallback(
    (nodeId: string) => {
      setParams({ selected: nodeId || null });
    },
    [setParams]
  );

  const clearSelected = useCallback(() => {
    setParams({ selected: null });
  }, [setParams]);

  const setView = useCallback(
    (view: "3d" | "2d") => {
      setParams({ view });
    },
    [setParams]
  );

  const clearFocus = useCallback(() => {
    setParams({
      focusKind: null,
      focusId: null,
      selected: null,
    });
  }, [setParams]);

  const hasFocus = Boolean(state.focusKind && state.focusId);

  return {
    ...state,
    setFocus,
    setHops,
    setSelected,
    clearSelected,
    setView,
    clearFocus,
    hasFocus,
  };
}
