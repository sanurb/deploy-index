"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Color, type InstancedMesh, Object3D } from "three";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Owner color: colorKey → vivid neon via forced HSL
// ---------------------------------------------------------------------------

const ownerColorCache = new Map<string, Color>();

function ownerColorVivid(colorKey: string): Color {
  if (!colorKey) return new Color("#64748B");
  const cached = ownerColorCache.get(colorKey);
  if (cached) return cached;

  const raw = new Color(`#${colorKey}`);
  const hsl = { h: 0, s: 0, l: 0 };
  raw.getHSL(hsl);
  // Force vivid: saturation 70–85%, lightness 55–65%
  const c = new Color().setHSL(
    hsl.h,
    0.7 + (hsl.s > 0.5 ? 0.15 : 0),
    0.55 + hsl.l * 0.1
  );
  ownerColorCache.set(colorKey, c);
  return c;
}

// ---------------------------------------------------------------------------
// Emissive intensity from impactScore (0–100 → 0.15–0.9)
// Higher impact = stronger glow, bloom picks up > 0.6
// ---------------------------------------------------------------------------

function impactEmissive(impactScore: number): number {
  return 0.15 + (impactScore / 100) * 0.75;
}

// ---------------------------------------------------------------------------
// Confidence → desaturation + opacity
// ---------------------------------------------------------------------------

function confidenceDesaturate(color: Color, score: number): Color {
  if (score >= 0.7) return color;
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  if (score >= 0.4) {
    // Medium: desaturate 30%
    return new Color().setHSL(hsl.h, hsl.s * 0.7, hsl.l);
  }
  // Low: desaturate 60%
  return new Color().setHSL(hsl.h, hsl.s * 0.4, hsl.l * 0.85);
}

function confidenceOpacity(score: number): number {
  if (score >= 0.7) return 1.0;
  if (score >= 0.4) return 0.75;
  return 0.5;
}

// ---------------------------------------------------------------------------
// Node scale: prodInterfaceCount + focus boost
// ---------------------------------------------------------------------------

function nodeScale(node: GraphNode, isFocus: boolean): number {
  const base = Math.log2(node.prodInterfaceCount + 1) * 0.3 + 0.45;
  return isFocus ? base * 1.4 : base;
}

// ---------------------------------------------------------------------------
// Scratch objects
// ---------------------------------------------------------------------------

const tmpObj = new Object3D();
const tmpColor = new Color();

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
// Per-kind instanced mesh: fill + wireframe overlay
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
  const fillRef = useRef<InstancedMesh>(null);
  const wireRef = useRef<InstancedMesh>(null);
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
    const fill = fillRef.current;
    const wire = wireRef.current;
    if (!fill || count === 0) return;

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

      // --- Transform ---
      const scale = nodeScale(node, isFocus);
      tmpObj.position.set(pos.x, pos.y, pos.z);
      tmpObj.scale.setScalar(scale);
      tmpObj.updateMatrix();
      fill.setMatrixAt(i, tmpObj.matrix);

      // Wireframe overlay: slightly larger
      if (wire) {
        tmpObj.scale.setScalar(scale * 1.08);
        tmpObj.updateMatrix();
        wire.setMatrixAt(i, tmpObj.matrix);
      }

      // --- Color: vivid owner-based ---
      const ownerBase = ownerColorVivid(node.colorKey);
      tmpColor.copy(ownerBase);

      // Focus node: white emissive override
      if (isFocus) {
        tmpColor.setRGB(0.95, 0.95, 0.97);
      } else if (isSelected) {
        // Brighten owner color
        tmpColor.lerp(new Color("#FFFFFF"), 0.35);
      } else if (isHovered) {
        tmpColor.lerp(new Color("#FFFFFF"), 0.2);
      }

      // Confidence: desaturate low-confidence nodes
      if (!isFocus && !isSelected) {
        const desaturated = confidenceDesaturate(
          tmpColor.clone(),
          node.confidenceScore
        );
        tmpColor.copy(desaturated);
      }

      // Selection dimming: non-neighborhood fades
      if (hasSelection && !isInNeighborhood && !isFocus) {
        const gray =
          tmpColor.r * 0.299 + tmpColor.g * 0.587 + tmpColor.b * 0.114;
        tmpColor.setRGB(gray * 0.15, gray * 0.15, gray * 0.18);
      }

      fill.setColorAt(i, tmpColor);

      // Wireframe: same color but dimmer for structural overlay
      if (wire) {
        const wireColor = tmpColor.clone().multiplyScalar(0.6);
        wire.setColorAt(i, wireColor);
      }
    }

    fill.instanceMatrix.needsUpdate = true;
    if (fill.instanceColor) fill.instanceColor.needsUpdate = true;
    if (wire) {
      wire.instanceMatrix.needsUpdate = true;
      if (wire.instanceColor) wire.instanceColor.needsUpdate = true;
    }
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

  // --- Emissive intensities via userData (recomputed per frame via effect) ---
  // We encode emissive per-instance via the material's emissive + vertex color trick:
  // the material emissive is set to a base, and vertex colors amplify it.

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

  // Compute a representative emissive intensity for the whole batch
  // (average impactScore — individual variation happens via vertex color brightness)
  const avgEmissive = useMemo(() => {
    if (nodes.length === 0) return 0.3;
    const sum = nodes.reduce(
      (acc, n) => acc + impactEmissive(n.impactScore),
      0
    );
    return sum / nodes.length;
  }, [nodes]);

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
      {/* Fill mesh */}
      <instancedMesh
        args={[undefined, undefined, count]}
        onClick={handleClick}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        ref={fillRef}
      >
        {geometryElement}
        <meshStandardMaterial
          emissive="#FFFFFF"
          emissiveIntensity={avgEmissive}
          metalness={0.1}
          roughness={0.4}
          toneMapped={false}
          vertexColors
        />
      </instancedMesh>

      {/* Wireframe overlay — communicates infrastructure sophistication */}
      <instancedMesh args={[undefined, undefined, count]} ref={wireRef}>
        {geometryElement}
        <meshBasicMaterial
          depthWrite={false}
          opacity={0.3}
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

  // 1-hop neighborhood
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
