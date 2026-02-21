"use client";

import { Billboard, Text } from "@react-three/drei";
import { memo, useMemo } from "react";
import type { GraphNode, NodePosition } from "@/types/graph";

/**
 * Labels: crisp neutral text, NOT neon.  Zero bloom contribution.
 *
 * Text is off-white / light gray with a dark background outline.
 * The "neon" language belongs to geometry, not typography.
 *
 * Strategy — strict priority, max 8:
 *  1. Focus node
 *  2. Hovered node
 *  3. Selected node
 *  4. Top-N software by impactScore
 *
 * Confidence encoding:
 *  - High (≥0.7):  full brightness text (#C8CCD4)
 *  - Medium (0.4–0.7): dimmer text (#8891A0)
 *  - Low (<0.4):   dim text (#6B7280) + warning glyph
 *
 * Missing fields: prepend "⚠ " glyph
 */

interface LabelsProps {
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly focusNodeId: string;
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
}

const MAX_LABELS = 8;

// Neutral grays — no saturation, no bloom contribution
const TEXT_BRIGHT = "#D1D5DB"; // focus / selected
const TEXT_NORMAL = "#9CA3AF"; // top-N
const TEXT_DIM = "#6B7280"; // low confidence

function labelColor(
  isFocus: boolean,
  isSelected: boolean,
  confidence: number
): string {
  if (isFocus || isSelected) return TEXT_BRIGHT;
  if (confidence < 0.4) return TEXT_DIM;
  if (confidence < 0.7) return "#8891A0";
  return TEXT_NORMAL;
}

export const Labels = memo(function Labels({
  nodes,
  positions,
  focusNodeId,
  selectedNodeId,
  hoveredNodeId,
}: LabelsProps) {
  const posMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const pos of positions) {
      map.set(pos.nodeId, pos);
    }
    return map;
  }, [positions]);

  const labeledNodes = useMemo(() => {
    const shown = new Set<string>();
    const result: GraphNode[] = [];

    const tryAdd = (id: string) => {
      if (!id || shown.has(id)) return;
      const node = nodes.find((n) => n.nodeId === id);
      if (!node) return;
      shown.add(id);
      result.push(node);
    };

    tryAdd(focusNodeId);
    tryAdd(hoveredNodeId);
    tryAdd(selectedNodeId);

    const sorted = [...nodes]
      .filter((n) => n.kind === "software")
      .sort((a, b) => b.impactScore - a.impactScore);

    for (const node of sorted) {
      if (result.length >= MAX_LABELS) break;
      tryAdd(node.nodeId);
    }

    return result;
  }, [nodes, focusNodeId, selectedNodeId, hoveredNodeId]);

  return (
    <>
      {labeledNodes.map((node) => {
        const pos = posMap.get(node.nodeId);
        if (!pos) return null;

        const isFocus = node.nodeId === focusNodeId;
        const isSelected = node.nodeId === selectedNodeId;
        const scale = Math.log2(node.prodInterfaceCount + 1) * 0.3 + 0.45;
        const yOffset = isFocus ? scale * 1.4 + 0.6 : scale + 0.45;

        const hasMissingFields = node.missingFields.length > 0;
        const label =
          hasMissingFields && node.confidenceScore < 0.7
            ? `\u26A0 ${node.displayName}`
            : node.displayName;

        const color = labelColor(isFocus, isSelected, node.confidenceScore);
        const fontSize = isFocus ? 0.45 : isSelected ? 0.38 : 0.28;

        return (
          <Billboard
            key={node.nodeId}
            position={[pos.x, pos.y + yOffset, pos.z]}
          >
            <Text
              anchorX="center"
              anchorY="bottom"
              color={color}
              fontSize={fontSize}
              maxWidth={6}
              outlineColor="#080C14"
              outlineWidth={0.04}
            >
              {label}
            </Text>
          </Billboard>
        );
      })}
    </>
  );
});
