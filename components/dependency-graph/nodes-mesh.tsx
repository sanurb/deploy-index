"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, type InstancedMesh, Object3D } from "three";
import { neonColorFromKey } from "@/lib/graph/neon-palette";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Brightness rules — CONSERVATIVE.  Additive blending means any stacking
// becomes a white haze.  Keep idle nodes *barely* visible and only let
// the active neighborhood push above bloom threshold (0.75).
//
//   Focus:      0.50   — clearly dominant, will bloom subtly
//   Hovered:    0.40   — visible glow
//   Selected:   0.38
//   Neighbor:   0.28   — readable but secondary
//   Idle:       0.08   — faint constellation dust
//   Dimmed:     0.025  — near-invisible when selection active
// ---------------------------------------------------------------------------

const BRIGHT_FOCUS = 0.5;
const BRIGHT_HOVERED = 0.4;
const BRIGHT_SELECTED = 0.38;
const BRIGHT_NEIGHBOR = 0.28;
const BRIGHT_IDLE = 0.08;
const BRIGHT_DIMMED = 0.025;

// Halo: only rendered for active nodes (focus/hover/selected).
// Tight scale to avoid overlap, very low intensity.
const HALO_SCALE = 1.08;
const HALO_INTENSITY = 0.22;

// Render order: halo behind core for stable compositing
const RENDER_ORDER_HALO = 1;
const RENDER_ORDER_CORE = 2;

// Scratch objects (reused every update, never allocate in loop)
const tmpObj = new Object3D();
const tmpColor = new Color();
const tmpHsl = { h: 0, s: 0, l: 0 };
const BLACK = new Color(0x000000);

// ---------------------------------------------------------------------------
// Node scale
// ---------------------------------------------------------------------------

function nodeScale(node: GraphNode, isFocus: boolean): number {
  const base = Math.log2(node.prodInterfaceCount + 1) * 0.3 + 0.45;
  return isFocus ? base * 1.4 : base;
}

// ---------------------------------------------------------------------------
// Confidence desaturation
// ---------------------------------------------------------------------------

function applyConfidenceDesaturation(color: Color, score: number): void {
  if (score >= 0.7) return;
  color.getHSL(tmpHsl);
  if (score >= 0.4) {
    color.setHSL(tmpHsl.h, tmpHsl.s * 0.7, tmpHsl.l);
  } else {
    color.setHSL(tmpHsl.h, tmpHsl.s * 0.45, tmpHsl.l * 0.85);
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NodesMeshProps {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly positions: readonly NodePosition[];
  readonly focusNodeId: string;
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
  readonly onHover: (nodeId: string) => void;
  readonly onClick: (nodeId: string) => void;
}

// ---------------------------------------------------------------------------
// Per-kind: core wireframe (always) + halo wireframe (active nodes only)
// ---------------------------------------------------------------------------

function KindMesh({
  nodes,
  positions,
  focusNodeId,
  selectedNodeId,
  hoveredNodeId,
  neighborhoodSet,
  geometry,
  onHover,
  onClick,
}: {
  nodes: readonly GraphNode[];
  positions: Map<string, NodePosition>;
  focusNodeId: string;
  selectedNodeId: string;
  hoveredNodeId: string;
  neighborhoodSet: ReadonlySet<string>;
  geometry: "icosahedron" | "octahedron" | "box";
  onHover: (nodeId: string) => void;
  onClick: (nodeId: string) => void;
}) {
  const coreRef = useRef<InstancedMesh>(null);
  const haloRef = useRef<InstancedMesh>(null);
  const { invalidate } = useThree();
  const count = nodes.length;

  const nodeIndexMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < nodes.length; i++) {
      map.set(i, nodes[i].nodeId);
    }
    return map;
  }, [nodes]);

  useEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo || count === 0) return;

    const hasSelection = Boolean(selectedNodeId);
    const activeNode = selectedNodeId || hoveredNodeId;

    for (let i = 0; i < count; i++) {
      const node = nodes[i];
      const pos = positions.get(node.nodeId);
      if (!pos) continue;

      const isFocus = node.nodeId === focusNodeId;
      const isSelected = node.nodeId === selectedNodeId;
      const isHovered = node.nodeId === hoveredNodeId;
      const isInNeighborhood =
        activeNode &&
        (node.nodeId === activeNode || neighborhoodSet.has(node.nodeId));

      // --- Brightness ---
      let brightness: number;
      if (isFocus) brightness = BRIGHT_FOCUS;
      else if (isHovered) brightness = BRIGHT_HOVERED;
      else if (isSelected) brightness = BRIGHT_SELECTED;
      else if (isInNeighborhood) brightness = BRIGHT_NEIGHBOR;
      else if (hasSelection) brightness = BRIGHT_DIMMED;
      else brightness = BRIGHT_IDLE;

      // Confidence penalty for non-interactive nodes
      if (!isFocus && !isHovered && !isSelected) {
        if (node.confidenceScore < 0.4) brightness *= 0.5;
        else if (node.confidenceScore < 0.7) brightness *= 0.75;
      }

      const scale = nodeScale(node, isFocus);
      const neon = neonColorFromKey(node.colorKey);
      if (!isFocus) applyConfidenceDesaturation(neon, node.confidenceScore);

      // --- Core wireframe ---
      tmpObj.position.set(pos.x, pos.y, pos.z);
      tmpObj.scale.setScalar(scale);
      tmpObj.updateMatrix();
      core.setMatrixAt(i, tmpObj.matrix);
      tmpColor.copy(neon).multiplyScalar(brightness);
      core.setColorAt(i, tmpColor);

      // --- Halo: ONLY for focus / hovered / selected — black (invisible) otherwise ---
      const isActive = isFocus || isHovered || isSelected;
      if (isActive) {
        tmpObj.scale.setScalar(scale * HALO_SCALE);
        tmpObj.updateMatrix();
        halo.setMatrixAt(i, tmpObj.matrix);
        tmpColor.copy(neon).multiplyScalar(brightness * HALO_INTENSITY);
        halo.setColorAt(i, tmpColor);
      } else {
        // Collapse to zero and paint black — zero additive contribution
        tmpObj.scale.setScalar(0);
        tmpObj.updateMatrix();
        halo.setMatrixAt(i, tmpObj.matrix);
        halo.setColorAt(i, BLACK);
      }
    }

    core.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
    invalidate();
  }, [
    nodes,
    positions,
    focusNodeId,
    selectedNodeId,
    hoveredNodeId,
    neighborhoodSet,
    count,
    invalidate,
  ]);

  const handlePointerOver = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId != null) {
        const nodeId = nodeIndexMap.get(e.instanceId);
        if (nodeId) onHover(nodeId);
      }
    },
    [nodeIndexMap, onHover]
  );

  const handlePointerOut = useCallback(() => {
    onHover("");
  }, [onHover]);

  const handleClick = useCallback(
    (e: { instanceId?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.instanceId != null) {
        const nodeId = nodeIndexMap.get(e.instanceId);
        if (nodeId) onClick(nodeId);
      }
    },
    [nodeIndexMap, onClick]
  );

  if (count === 0) return null;

  const geometryElement =
    geometry === "icosahedron" ? (
      <icosahedronGeometry args={[1, 1]} />
    ) : geometry === "octahedron" ? (
      <octahedronGeometry args={[1, 0]} />
    ) : (
      <boxGeometry args={[1, 1, 1]} />
    );

  return (
    <group>
      {/* Halo — only visible for active nodes, tight scale */}
      <instancedMesh
        args={[undefined, undefined, count]}
        ref={haloRef}
        renderOrder={RENDER_ORDER_HALO}
      >
        {geometryElement}
        <meshBasicMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          transparent
          vertexColors
          wireframe
        />
      </instancedMesh>

      {/* Core wireframe — crisp thin outlines, interactive */}
      <instancedMesh
        args={[undefined, undefined, count]}
        onClick={handleClick}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        ref={coreRef}
        renderOrder={RENDER_ORDER_CORE}
      >
        {geometryElement}
        <meshBasicMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
          transparent
          vertexColors
          wireframe
        />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Public — splits by kind, computes neighborhood
// ---------------------------------------------------------------------------

export function NodesMesh({
  nodes,
  edges,
  positions: positionsArray,
  focusNodeId,
  selectedNodeId,
  hoveredNodeId,
  onHover,
  onClick,
}: NodesMeshProps) {
  const posMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const pos of positionsArray) {
      map.set(pos.nodeId, pos);
    }
    return map;
  }, [positionsArray]);

  const neighborhoodSet = useMemo(() => {
    const active = selectedNodeId || hoveredNodeId;
    const set = new Set<string>();
    if (!active) return set;
    set.add(active);
    for (const edge of edges) {
      if (edge.fromId === active) set.add(edge.toId);
      if (edge.toId === active) set.add(edge.fromId);
    }
    return set;
  }, [edges, selectedNodeId, hoveredNodeId]);

  const softwareNodes = useMemo(
    () => nodes.filter((n) => n.kind === "software"),
    [nodes]
  );
  const depNodes = useMemo(
    () => nodes.filter((n) => n.kind === "dependency"),
    [nodes]
  );
  const rtNodes = useMemo(
    () => nodes.filter((n) => n.kind === "runtime"),
    [nodes]
  );

  const shared = {
    focusNodeId,
    hoveredNodeId,
    neighborhoodSet,
    onClick,
    onHover,
    positions: posMap,
    selectedNodeId,
  } as const;

  return (
    <>
      <KindMesh {...shared} geometry="icosahedron" nodes={softwareNodes} />
      <KindMesh {...shared} geometry="octahedron" nodes={depNodes} />
      <KindMesh {...shared} geometry="box" nodes={rtNodes} />
    </>
  );
}
