"use client";

import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  EdgesGeometry,
  IcosahedronGeometry,
  type InstancedMesh,
  NormalBlending,
  Object3D,
  OctahedronGeometry,
} from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { neonColorFromKey } from "@/lib/graph/neon-palette";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Brightness — controls per-node neon tint intensity.
// Colors are stored as `neon * brightness` in linear space.
// LineMaterial with toneMapped=false writes these directly to the render
// target; the EffectComposer's ToneMapping handles the rest.
//
//   Focus:      1.00   — full neon, triggers bloom
//   Hovered:    0.80   — clear highlight
//   Selected:   0.65   — strong
//   Neighbor:   0.50   — readable secondary
//   Idle:       0.35   — visible tint, quiet
//   Dimmed:     0.10   — background hum when selection active
// ---------------------------------------------------------------------------

const BRIGHT_FOCUS = 1.0;
const BRIGHT_HOVERED = 0.85;
const BRIGHT_SELECTED = 0.9;
const BRIGHT_NEIGHBOR = 0.5;
const BRIGHT_IDLE = 0.35;
const BRIGHT_DIMMED = 0.1;

// Line widths (screen pixels, not world units)
const LINE_WIDTH_IDLE = 1.5;
const LINE_WIDTH_ACTIVE = 2.0;
const LINE_WIDTH_FOCUS = 2.8;

// ---------------------------------------------------------------------------
// Edge templates — pre-computed at module level.
// EdgesGeometry extracts only hard edges (no internal triangulation).
// ---------------------------------------------------------------------------

function extractEdgeTemplate(
  geo: BoxGeometry | IcosahedronGeometry | OctahedronGeometry
): Float32Array {
  const edges = new EdgesGeometry(geo, 1);
  const arr = new Float32Array(edges.attributes.position.array);
  edges.dispose();
  geo.dispose();
  return arr;
}

const EDGE_TEMPLATES: Record<string, Float32Array> = {
  icosahedron: extractEdgeTemplate(new IcosahedronGeometry(1, 0)),
  octahedron: extractEdgeTemplate(new OctahedronGeometry(1, 0)),
  box: extractEdgeTemplate(new BoxGeometry(1, 1, 1)),
};

// Scratch objects
const tmpObj = new Object3D();
const tmpColor = new Color();
const tmpHsl = { h: 0, s: 0, l: 0 };

// ---------------------------------------------------------------------------
// Node scale
// ---------------------------------------------------------------------------

function nodeScale(
  node: GraphNode,
  isFocus: boolean,
  isSelected: boolean
): number {
  const base = Math.log2(node.prodInterfaceCount + 1) * 0.3 + 0.45;
  if (isFocus) return base * 1.4;
  if (isSelected) return base * 1.25;
  return base;
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
// Per-kind: LineSegments2 for visible wireframe + invisible mesh for hit test
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
  const hitRef = useRef<InstancedMesh>(null);
  const lineRef = useRef<LineSegments2>(null);
  const matRef = useRef<LineMaterial>(null);
  const { invalidate, size } = useThree();
  const count = nodes.length;

  const nodeIndexMap = useMemo(() => {
    const map = new Map<number, string>();
    for (let i = 0; i < nodes.length; i++) {
      map.set(i, nodes[i].nodeId);
    }
    return map;
  }, [nodes]);

  // Keep LineMaterial resolution in sync
  useEffect(() => {
    if (matRef.current) {
      matRef.current.resolution.set(size.width, size.height);
    }
  }, [size]);

  // Determine line width — thicker when focus/selected is in this group
  const hasFocusOrSelected = nodes.some(
    (n) => n.nodeId === focusNodeId || n.nodeId === selectedNodeId
  );
  const hasActive = Boolean(selectedNodeId || hoveredNodeId);
  const linewidth = hasFocusOrSelected
    ? LINE_WIDTH_FOCUS
    : hasActive
      ? LINE_WIDTH_ACTIVE
      : LINE_WIDTH_IDLE;

  // Build line geometry + update hit mesh transforms
  useEffect(() => {
    const hit = hitRef.current;
    const line = lineRef.current;
    if (!line || count === 0) return;

    const template = EDGE_TEMPLATES[geometry];
    const verticesPerEdge = 6; // 2 endpoints * 3 coords
    const edgesPerNode = template.length / verticesPerEdge;
    const totalSegments = count * edgesPerNode;

    const outPos = new Float32Array(totalSegments * verticesPerEdge);
    const outCol = new Float32Array(totalSegments * verticesPerEdge);

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

      // Brightness
      let brightness: number;
      if (isFocus) brightness = BRIGHT_FOCUS;
      else if (isHovered) brightness = BRIGHT_HOVERED;
      else if (isSelected) brightness = BRIGHT_SELECTED;
      else if (isInNeighborhood) brightness = BRIGHT_NEIGHBOR;
      else if (hasSelection) brightness = BRIGHT_DIMMED;
      else brightness = BRIGHT_IDLE;

      if (!isFocus && !isHovered && !isSelected) {
        if (node.confidenceScore < 0.4) brightness *= 0.5;
        else if (node.confidenceScore < 0.7) brightness *= 0.75;
      }

      const s = nodeScale(node, isFocus, isSelected);
      const neon = neonColorFromKey(node.colorKey);
      if (!isFocus && !isSelected) applyConfidenceDesaturation(neon, node.confidenceScore);
      tmpColor.copy(neon).multiplyScalar(brightness);

      // Update hit mesh transform
      if (hit) {
        tmpObj.position.set(pos.x, pos.y, pos.z);
        tmpObj.scale.setScalar(s);
        tmpObj.updateMatrix();
        hit.setMatrixAt(i, tmpObj.matrix);
      }

      // Write edge segments: scale template vertices + translate to position
      const baseOff = i * edgesPerNode * verticesPerEdge;
      for (let e = 0; e < edgesPerNode; e++) {
        const src = e * verticesPerEdge;
        const dst = baseOff + src;

        // Endpoint A
        outPos[dst + 0] = template[src + 0] * s + pos.x;
        outPos[dst + 1] = template[src + 1] * s + pos.y;
        outPos[dst + 2] = template[src + 2] * s + pos.z;
        // Endpoint B
        outPos[dst + 3] = template[src + 3] * s + pos.x;
        outPos[dst + 4] = template[src + 4] * s + pos.y;
        outPos[dst + 5] = template[src + 5] * s + pos.z;

        // Color for both endpoints
        outCol[dst + 0] = tmpColor.r;
        outCol[dst + 1] = tmpColor.g;
        outCol[dst + 2] = tmpColor.b;
        outCol[dst + 3] = tmpColor.r;
        outCol[dst + 4] = tmpColor.g;
        outCol[dst + 5] = tmpColor.b;
      }
    }

    if (hit) {
      hit.instanceMatrix.needsUpdate = true;
    }

    const geo = new LineSegmentsGeometry();
    geo.setPositions(outPos);
    geo.setColors(outCol);

    line.geometry.dispose();
    line.geometry = geo;
    line.computeLineDistances();

    if (matRef.current) {
      matRef.current.linewidth = linewidth;
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
    geometry,
    linewidth,
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

  const solidGeometry =
    geometry === "icosahedron" ? (
      <icosahedronGeometry args={[1, 0]} />
    ) : geometry === "octahedron" ? (
      <octahedronGeometry args={[1, 0]} />
    ) : (
      <boxGeometry args={[1, 1, 1]} />
    );

  return (
    <group>
      {/* Hit-detection mesh — invisible, receives pointer events */}
      <instancedMesh
        args={[undefined, undefined, count]}
        onClick={handleClick}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        ref={hitRef}
        renderOrder={0}
      >
        {solidGeometry}
        <meshBasicMaterial
          colorWrite={false}
          depthWrite={false}
          transparent
          opacity={0}
        />
      </instancedMesh>

      {/* Visible wireframe — LineSegments2 with controllable thickness */}
      <primitive object={new LineSegments2()} ref={lineRef} renderOrder={2}>
        <primitive
          attach="material"
          object={
            new LineMaterial({
              vertexColors: true,
              linewidth,
              transparent: true,
              opacity: 1.0,
              worldUnits: false,
              blending: NormalBlending,
              depthWrite: false,
              toneMapped: false,
              resolution: [size.width, size.height],
            } as ConstructorParameters<typeof LineMaterial>[0])
          }
          ref={matRef}
        />
      </primitive>
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
