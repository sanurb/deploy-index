"use client";

import { Billboard, Text } from "@react-three/drei";
import { useMemo } from "react";
import { Color } from "three";
import type { GraphNode, NodePosition } from "@/types/graph";

/**
 * Label strategy — strict priority, max 8:
 *  1. Focus node (always, largest, white)
 *  2. Hovered node (if any)
 *  3. Selected node (if different from focus)
 *  4. Top-N software nodes by impactScore (skip deps/runtimes — noise)
 *
 * Color: owner color tinted toward white (50% blend)
 * Focus: pure white, 0.5em
 * Glow: outlineColor matches owner at low opacity for subtle neon halo
 */

interface LabelsProps {
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly focusNodeId: string;
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
}

const MAX_LABELS = 8;
const BG_COLOR = "#05070B";

function ownerLabelColor(colorKey: string): string {
  if (!colorKey) return "#94A3B8";
  const raw = new Color(`#${colorKey}`);
  const hsl = { h: 0, s: 0, l: 0 };
  raw.getHSL(hsl);
  // Vivid but lighter for readability — blend toward white
  const c = new Color().setHSL(hsl.h, 0.6, 0.78);
  return `#${c.getHexString()}`;
}

function ownerGlowColor(colorKey: string): string {
  if (!colorKey) return BG_COLOR;
  const raw = new Color(`#${colorKey}`);
  const hsl = { h: 0, s: 0, l: 0 };
  raw.getHSL(hsl);
  const c = new Color().setHSL(hsl.h, 0.8, 0.35);
  return `#${c.getHexString()}`;
}

export function Labels({
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

    // Top impact software nodes
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

        let color: string;
        let fontSize: number;
        let outlineColor: string;

        if (isFocus) {
          color = "#F8FAFC";
          fontSize = 0.5;
          outlineColor = ownerGlowColor(node.colorKey);
        } else if (isSelected) {
          color = ownerLabelColor(node.colorKey);
          fontSize = 0.4;
          outlineColor = ownerGlowColor(node.colorKey);
        } else {
          color = ownerLabelColor(node.colorKey);
          fontSize = 0.3;
          outlineColor = BG_COLOR;
        }

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
              outlineColor={outlineColor}
              outlineWidth={isFocus || isSelected ? 0.06 : 0.04}
            >
              {node.displayName}
            </Text>
          </Billboard>
        );
      })}
    </>
  );
}
