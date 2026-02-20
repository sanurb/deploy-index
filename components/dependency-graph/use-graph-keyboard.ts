"use client";

import { useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { GraphNode, NodePosition } from "@/types/graph";
import type { CameraControllerHandle } from "./camera-controller";
import type { GraphSearchHandle } from "./graph-search";

interface UseGraphKeyboardOptions {
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly focusNodeId: string;
  readonly selectedNodeId: string;
  readonly view: "3d" | "2d";
  readonly hops: number;
  readonly setSelected: (nodeId: string) => void;
  readonly clearSelected: () => void;
  readonly setView: (view: "3d" | "2d") => void;
  readonly setHops: (hops: number) => void;
  readonly searchRef: React.RefObject<GraphSearchHandle | null>;
  readonly cameraRef: React.RefObject<CameraControllerHandle | null>;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export function useGraphKeyboard(options: UseGraphKeyboardOptions) {
  const {
    nodes,
    positions,
    focusNodeId,
    selectedNodeId,
    view,
    hops,
    setSelected,
    clearSelected,
    setView,
    setHops,
    searchRef,
    cameraRef,
  } = options;

  // Sort nodes by impact for tab cycling
  const sortedByImpact = [...nodes].sort(
    (a, b) => b.impactScore - a.impactScore
  );

  // `/` — focus search
  useHotkeys(
    "/",
    (e) => {
      e.preventDefault();
      searchRef.current?.focus();
    },
    { enableOnFormTags: false }
  );

  // Escape — blur search or clear selection
  useHotkeys(
    "escape",
    () => {
      if (isInputFocused()) {
        searchRef.current?.blur();
      } else if (selectedNodeId) {
        clearSelected();
      }
    },
    { enableOnFormTags: true }
  );

  // Tab / Shift+Tab — cycle nodes by impactScore
  useHotkeys(
    "tab",
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      if (sortedByImpact.length === 0) return;

      const currentIdx = sortedByImpact.findIndex(
        (n) => n.nodeId === selectedNodeId
      );
      const nextIdx =
        currentIdx === -1 ? 0 : (currentIdx + 1) % sortedByImpact.length;
      const nextNode = sortedByImpact[nextIdx];

      setSelected(nextNode.nodeId);

      const pos = positions.find((p) => p.nodeId === nextNode.nodeId);
      if (pos) cameraRef.current?.focusOnPosition(pos);
    },
    { enableOnFormTags: false, preventDefault: false }
  );

  useHotkeys(
    "shift+tab",
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();

      if (sortedByImpact.length === 0) return;

      const currentIdx = sortedByImpact.findIndex(
        (n) => n.nodeId === selectedNodeId
      );
      const prevIdx =
        currentIdx <= 0 ? sortedByImpact.length - 1 : currentIdx - 1;
      const prevNode = sortedByImpact[prevIdx];

      setSelected(prevNode.nodeId);

      const pos = positions.find((p) => p.nodeId === prevNode.nodeId);
      if (pos) cameraRef.current?.focusOnPosition(pos);
    },
    { enableOnFormTags: false, preventDefault: false }
  );

  // `f` — focus camera on selected/focus node
  useHotkeys(
    "f",
    () => {
      if (isInputFocused()) return;
      const targetId = selectedNodeId || focusNodeId;
      const pos = positions.find((p) => p.nodeId === targetId);
      if (pos) {
        cameraRef.current?.focusOnPosition(pos);
      } else {
        cameraRef.current?.resetView();
      }
    },
    { enableOnFormTags: false }
  );

  // `v` — toggle 2D/3D
  useHotkeys(
    "v",
    () => {
      if (isInputFocused()) return;
      setView(view === "3d" ? "2d" : "3d");
    },
    { enableOnFormTags: false },
    [view]
  );

  // `1`-`5` — change hop depth
  for (const n of [1, 2, 3, 4, 5]) {
    useHotkeys(
      String(n),
      () => {
        if (isInputFocused()) return;
        setHops(n);
      },
      { enableOnFormTags: false }
    );
  }
}
