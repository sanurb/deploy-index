"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type LineSegments,
} from "three";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Edge color policy:
//   Default:  owner color of the source node at 0.12 alpha (ultra-faint)
//   Hover:    owner color at 0.5 alpha (neighborhood highlight)
//   Selected: owner color at 0.75 alpha (locked neighborhood)
//   Dimmed:   near-zero when something is selected and this edge is outside
//   Declared: separate dashed pass
// ---------------------------------------------------------------------------

const DIMMED = new Color("#030508");
const ownerEdgeCache = new Map<string, Color>();

function ownerColorForEdge(colorKey: string): Color {
  if (!colorKey) return new Color("#3F3F46");
  const cached = ownerEdgeCache.get(colorKey);
  if (cached) return cached;
  const raw = new Color(`#${colorKey}`);
  const hsl = { h: 0, s: 0, l: 0 };
  raw.getHSL(hsl);
  const c = new Color().setHSL(hsl.h, 0.7, 0.55);
  ownerEdgeCache.set(colorKey, c);
  return c;
}

interface EdgesGeometryProps {
  readonly edges: readonly GraphEdge[];
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
}

// ---------------------------------------------------------------------------
// Single edge pass
// ---------------------------------------------------------------------------

function EdgePass({
  edges,
  nodeMap,
  posMap,
  selectedNodeId,
  hoveredNodeId,
  isDashed,
}: {
  edges: readonly GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  posMap: Map<string, NodePosition>;
  selectedNodeId: string;
  hoveredNodeId: string;
  isDashed: boolean;
}) {
  const lineRef = useRef<LineSegments>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    const line = lineRef.current;
    if (!line || edges.length === 0) return;

    const vertexCount = edges.length * 2;
    const posArray = new Float32Array(vertexCount * 3);
    const colorArray = new Float32Array(vertexCount * 3);

    const hasSelection = Boolean(selectedNodeId);
    const activeNode = selectedNodeId || hoveredNodeId;
    const tmpColor = new Color();

    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      const from = posMap.get(edge.fromId);
      const to = posMap.get(edge.toId);

      const idx = i * 6;
      posArray[idx] = from?.x ?? 0;
      posArray[idx + 1] = from?.y ?? 0;
      posArray[idx + 2] = from?.z ?? 0;
      posArray[idx + 3] = to?.x ?? 0;
      posArray[idx + 4] = to?.y ?? 0;
      posArray[idx + 5] = to?.z ?? 0;

      // Derive color from source node's owner
      const sourceNode = nodeMap.get(edge.fromId);
      const ownerColor = ownerColorForEdge(sourceNode?.colorKey ?? "");

      const isNeighborEdge =
        activeNode && (edge.fromId === activeNode || edge.toId === activeNode);

      if (isNeighborEdge && selectedNodeId) {
        tmpColor.copy(ownerColor).multiplyScalar(1.4);
      } else if (isNeighborEdge) {
        tmpColor.copy(ownerColor).multiplyScalar(0.9);
      } else if (hasSelection) {
        tmpColor.copy(DIMMED);
      } else {
        // Default: very faint owner color
        tmpColor.copy(ownerColor).multiplyScalar(0.2);
      }

      const cidx = i * 6;
      colorArray[cidx] = tmpColor.r;
      colorArray[cidx + 1] = tmpColor.g;
      colorArray[cidx + 2] = tmpColor.b;
      colorArray[cidx + 3] = tmpColor.r;
      colorArray[cidx + 4] = tmpColor.g;
      colorArray[cidx + 5] = tmpColor.b;
    }

    const geo = line.geometry as BufferGeometry;
    geo.setAttribute("position", new BufferAttribute(posArray, 3));
    geo.setAttribute("color", new BufferAttribute(colorArray, 3));
    geo.computeBoundingSphere();

    if (isDashed) {
      const distances = new Float32Array(vertexCount);
      for (let i = 0; i < edges.length; i++) {
        const from = posMap.get(edges[i].fromId);
        const to = posMap.get(edges[i].toId);
        const dx = (to?.x ?? 0) - (from?.x ?? 0);
        const dy = (to?.y ?? 0) - (from?.y ?? 0);
        const dz = (to?.z ?? 0) - (from?.z ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        distances[i * 2] = 0;
        distances[i * 2 + 1] = dist;
      }
      geo.setAttribute("lineDistance", new BufferAttribute(distances, 1));
    }

    invalidate();
  }, [
    edges,
    nodeMap,
    posMap,
    selectedNodeId,
    hoveredNodeId,
    isDashed,
    invalidate,
  ]);

  if (edges.length === 0) return null;

  // Opacity: neighborhood edges are more visible
  const hasActive = Boolean(selectedNodeId || hoveredNodeId);
  const baseOpacity = isDashed ? 0.35 : 0.5;

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      {isDashed ? (
        <lineDashedMaterial
          dashSize={0.5}
          gapSize={0.35}
          opacity={baseOpacity}
          transparent
          vertexColors
        />
      ) : (
        <lineBasicMaterial opacity={baseOpacity} transparent vertexColors />
      )}
    </lineSegments>
  );
}

// ---------------------------------------------------------------------------
// Public — splits confirmed/declared, builds lookup maps
// ---------------------------------------------------------------------------

export function EdgesGeometry({
  edges,
  nodes,
  positions,
  selectedNodeId,
  hoveredNodeId,
}: EdgesGeometryProps) {
  const posMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const pos of positions) {
      map.set(pos.nodeId, pos);
    }
    return map;
  }, [positions]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const node of nodes) {
      map.set(node.nodeId, node);
    }
    return map;
  }, [nodes]);

  const confirmedEdges = useMemo(
    () => edges.filter((e) => e.strength === "confirmed"),
    [edges]
  );

  const declaredEdges = useMemo(
    () => edges.filter((e) => e.strength === "declared"),
    [edges]
  );

  return (
    <>
      <EdgePass
        edges={confirmedEdges}
        hoveredNodeId={hoveredNodeId}
        isDashed={false}
        nodeMap={nodeMap}
        posMap={posMap}
        selectedNodeId={selectedNodeId}
      />
      <EdgePass
        edges={declaredEdges}
        hoveredNodeId={hoveredNodeId}
        isDashed
        nodeMap={nodeMap}
        posMap={posMap}
        selectedNodeId={selectedNodeId}
      />
    </>
  );
}
