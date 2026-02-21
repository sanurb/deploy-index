"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, NormalBlending, Vector3 } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { neonColorFromKey } from "@/lib/graph/neon-palette";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Opacity tiers
//   Default:     idle edges, subtle but visible
//   Highlighted: neighborhood of active node
//   Dimmed:      non-neighborhood when a node is active (~20%)
// ---------------------------------------------------------------------------

const OPACITY_DEFAULT = 0.25;
const OPACITY_HIGHLIGHTED = 0.55;
const OPACITY_DIMMED = 0.05;

const MAX_HIGHLIGHTED_EDGES = 12;

// Thickness
const THICKNESS_MIN = 0.8;
const THICKNESS_MAX = 1.4;
const THICKNESS_BOOST = 0.4; // added to highlighted edges

// Dash animation — slow, calm directional flow
const DASH_SPEED = 0.12; // units per second

// Confirmed edges: near-solid with subtle breaks
const CONFIRMED_DASH_SIZE = 3.0;
const CONFIRMED_GAP_SIZE = 0.3;

// Declared edges: clearly dashed
const DECLARED_DASH_SIZE = 0.6;
const DECLARED_GAP_SIZE = 0.4;

function weightToThickness(weight: number): number {
  const t = Math.min(Math.max(weight, 0), 1);
  return THICKNESS_MIN + t * (THICKNESS_MAX - THICKNESS_MIN);
}

// ---------------------------------------------------------------------------
// Cubic Bezier
// ---------------------------------------------------------------------------

const SAMPLES_PER_CURVE = 16;

function cubicBezier(
  p0: Vector3,
  p1: Vector3,
  p2: Vector3,
  p3: Vector3,
  t: number,
  out: Vector3
): Vector3 {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  out.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
  out.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
  out.z = uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z;
  return out;
}

// ---------------------------------------------------------------------------
// Control points — arcs flow outward from center
// ---------------------------------------------------------------------------

const _origin = new Vector3(0, 0, 0);
const _mid = new Vector3();
const _dir = new Vector3();
const _up = new Vector3(0, 1, 0);
const _perp = new Vector3();

function computeControlPoints(
  from: Vector3,
  to: Vector3,
  cp1: Vector3,
  cp2: Vector3
): void {
  _mid.lerpVectors(from, to, 0.5);
  const dist = from.distanceTo(to);

  _dir.copy(_mid).sub(_origin);
  const dirLen = _dir.length();
  if (dirLen > 0.01) {
    _dir.divideScalar(dirLen);
  } else {
    _dir.set(from.z - to.z, 0, to.x - from.x).normalize();
  }

  _perp.subVectors(to, from).cross(_up).normalize();

  const arcMag = Math.min(dist * 0.25, 4.0);
  const yLift = dist * 0.08;

  cp1.lerpVectors(from, to, 0.33);
  cp1.addScaledVector(_dir, arcMag * 0.6);
  cp1.addScaledVector(_perp, arcMag * 0.15);
  cp1.y += yLift;

  cp2.lerpVectors(from, to, 0.67);
  cp2.addScaledVector(_dir, arcMag * 0.6);
  cp2.addScaledVector(_perp, -arcMag * 0.15);
  cp2.y += yLift;
}

// ---------------------------------------------------------------------------
// Build curve segments
// ---------------------------------------------------------------------------

interface CurveData {
  positions: Float32Array;
  colors: Float32Array;
  segmentCount: number;
}

function buildCurveData(
  edges: readonly GraphEdge[],
  nodeMap: Map<string, GraphNode>,
  posMap: Map<string, NodePosition>,
  isHighlighted: boolean
): CurveData {
  const segsPerEdge = SAMPLES_PER_CURVE - 1;
  const maxSegments = edges.length * segsPerEdge;
  const positions = new Float32Array(maxSegments * 6);
  const colors = new Float32Array(maxSegments * 6);

  const p0 = new Vector3();
  const p3 = new Vector3();
  const cp1 = new Vector3();
  const cp2 = new Vector3();
  const prev = new Vector3();
  const curr = new Vector3();
  const tmpColor = new Color();

  let segIdx = 0;

  for (const edge of edges) {
    const fromPos = posMap.get(edge.fromId);
    const toPos = posMap.get(edge.toId);
    if (!fromPos || !toPos) continue;

    p0.set(fromPos.x, fromPos.y, fromPos.z);
    p3.set(toPos.x, toPos.y, toPos.z);
    computeControlPoints(p0, p3, cp1, cp2);

    const sourceNode = nodeMap.get(edge.fromId);
    const neon = neonColorFromKey(sourceNode?.colorKey ?? "");

    const hsl = { h: 0, s: 0, l: 0 };
    neon.getHSL(hsl);

    if (isHighlighted) {
      tmpColor.setHSL(hsl.h, hsl.s * 0.7, hsl.l * 0.85);
    } else {
      tmpColor.setHSL(hsl.h, hsl.s * 0.55, hsl.l * 0.7);
    }

    cubicBezier(p0, cp1, cp2, p3, 0, prev);

    for (let s = 1; s < SAMPLES_PER_CURVE; s++) {
      const t = s / (SAMPLES_PER_CURVE - 1);
      cubicBezier(p0, cp1, cp2, p3, t, curr);

      const off = segIdx * 6;
      positions[off] = prev.x;
      positions[off + 1] = prev.y;
      positions[off + 2] = prev.z;
      positions[off + 3] = curr.x;
      positions[off + 4] = curr.y;
      positions[off + 5] = curr.z;

      colors[off] = tmpColor.r;
      colors[off + 1] = tmpColor.g;
      colors[off + 2] = tmpColor.b;
      colors[off + 3] = tmpColor.r;
      colors[off + 4] = tmpColor.g;
      colors[off + 5] = tmpColor.b;

      prev.copy(curr);
      segIdx++;
    }
  }

  return {
    positions: positions.subarray(0, segIdx * 6),
    colors: colors.subarray(0, segIdx * 6),
    segmentCount: segIdx,
  };
}

// ---------------------------------------------------------------------------
// Weight buckets
// ---------------------------------------------------------------------------

interface WeightBucket {
  edges: GraphEdge[];
  linewidth: number;
}

function bucketByWeight(
  edges: readonly GraphEdge[],
  thicknessBoost = 0
): WeightBucket[] {
  const low: GraphEdge[] = [];
  const mid: GraphEdge[] = [];
  const high: GraphEdge[] = [];

  for (const e of edges) {
    if (e.weight < 0.35) low.push(e);
    else if (e.weight < 0.7) mid.push(e);
    else high.push(e);
  }

  const buckets: WeightBucket[] = [];
  if (low.length > 0)
    buckets.push({
      edges: low,
      linewidth: weightToThickness(0.15) + thicknessBoost,
    });
  if (mid.length > 0)
    buckets.push({
      edges: mid,
      linewidth: weightToThickness(0.5) + thicknessBoost,
    });
  if (high.length > 0)
    buckets.push({
      edges: high,
      linewidth: weightToThickness(0.85) + thicknessBoost,
    });
  return buckets;
}

// ---------------------------------------------------------------------------
// Edge pass — dashed, animated dashOffset via useFrame
// ---------------------------------------------------------------------------

function EdgePass({
  edges,
  nodeMap,
  posMap,
  isHighlighted,
  dashSize,
  gapSize,
  linewidth,
  opacity,
}: {
  edges: readonly GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  posMap: Map<string, NodePosition>;
  isHighlighted: boolean;
  dashSize: number;
  gapSize: number;
  linewidth: number;
  opacity: number;
}) {
  const lineRef = useRef<LineSegments2>(null);
  const matRef = useRef<LineMaterial>(null);
  const { size } = useThree();

  // Build geometry when edges or interaction state change
  useEffect(() => {
    if (!lineRef.current || !matRef.current || edges.length === 0) return;

    const { positions, colors, segmentCount } = buildCurveData(
      edges,
      nodeMap,
      posMap,
      isHighlighted
    );

    if (segmentCount === 0) return;

    const geo = new LineSegmentsGeometry();
    geo.setPositions(positions);
    geo.setColors(colors);

    lineRef.current.geometry.dispose();
    lineRef.current.geometry = geo;
    lineRef.current.computeLineDistances();

    if (matRef.current) {
      matRef.current.opacity = opacity;
      matRef.current.linewidth = linewidth;
    }
  }, [edges, nodeMap, posMap, isHighlighted, opacity, linewidth]);

  // Resolution sync
  useEffect(() => {
    if (matRef.current) {
      matRef.current.resolution.set(size.width, size.height);
    }
  }, [size]);

  // Animate dashOffset — purely in material space, no React state
  useFrame((_, delta) => {
    if (matRef.current) {
      matRef.current.dashOffset -= delta * DASH_SPEED;
    }
  });

  if (edges.length === 0) return null;

  return (
    <primitive object={new LineSegments2()} ref={lineRef}>
      <primitive
        attach="material"
        object={
          new LineMaterial({
            vertexColors: true,
            linewidth,
            transparent: true,
            opacity,
            dashed: true,
            dashScale: 1,
            dashSize,
            gapSize,
            dashOffset: 0,
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
  );
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

interface EdgesGeometryProps {
  readonly edges: readonly GraphEdge[];
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
}

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

  const activeNode = selectedNodeId || hoveredNodeId;

  // Split edges into neighborhood (highlighted) and background (dimmed)
  const { neighborEdges, backgroundEdges } = useMemo(() => {
    if (!activeNode) {
      return { neighborEdges: [] as GraphEdge[], backgroundEdges: [...edges] };
    }

    const neighbor: GraphEdge[] = [];
    const bg: GraphEdge[] = [];

    for (const e of edges) {
      if (e.fromId === activeNode || e.toId === activeNode) {
        neighbor.push(e);
      } else {
        bg.push(e);
      }
    }

    // Cap highlighted at 12 highest-weight
    if (neighbor.length > MAX_HIGHLIGHTED_EDGES) {
      const sorted = [...neighbor].sort((a, b) => b.weight - a.weight);
      return {
        neighborEdges: sorted.slice(0, MAX_HIGHLIGHTED_EDGES),
        backgroundEdges: [
          ...bg,
          ...sorted.slice(MAX_HIGHLIGHTED_EDGES),
        ],
      };
    }

    return { neighborEdges: neighbor, backgroundEdges: bg };
  }, [edges, activeNode]);

  // Buckets for highlighted edges (boosted thickness)
  const highlightedConfirmed = useMemo(
    () =>
      bucketByWeight(
        neighborEdges.filter((e) => e.strength === "confirmed"),
        THICKNESS_BOOST
      ),
    [neighborEdges]
  );
  const highlightedDeclared = useMemo(
    () =>
      bucketByWeight(
        neighborEdges.filter((e) => e.strength === "declared"),
        THICKNESS_BOOST
      ),
    [neighborEdges]
  );

  // Buckets for background edges (default or dimmed)
  const bgOpacity = activeNode ? OPACITY_DIMMED : OPACITY_DEFAULT;
  const bgConfirmed = useMemo(
    () =>
      bucketByWeight(backgroundEdges.filter((e) => e.strength === "confirmed")),
    [backgroundEdges]
  );
  const bgDeclared = useMemo(
    () =>
      bucketByWeight(backgroundEdges.filter((e) => e.strength === "declared")),
    [backgroundEdges]
  );

  const shared = { nodeMap, posMap } as const;

  return (
    <>
      {/* Background / idle edges */}
      {bgConfirmed.map((bucket, i) => (
        <EdgePass
          {...shared}
          dashSize={CONFIRMED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={CONFIRMED_GAP_SIZE}
          isHighlighted={false}
          key={`bg-c-${i}`}
          linewidth={bucket.linewidth}
          opacity={bgOpacity}
        />
      ))}
      {bgDeclared.map((bucket, i) => (
        <EdgePass
          {...shared}
          dashSize={DECLARED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={DECLARED_GAP_SIZE}
          isHighlighted={false}
          key={`bg-d-${i}`}
          linewidth={bucket.linewidth}
          opacity={bgOpacity * 0.8}
        />
      ))}

      {/* Highlighted neighborhood edges */}
      {highlightedConfirmed.map((bucket, i) => (
        <EdgePass
          {...shared}
          dashSize={CONFIRMED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={CONFIRMED_GAP_SIZE}
          isHighlighted
          key={`hl-c-${i}`}
          linewidth={bucket.linewidth}
          opacity={OPACITY_HIGHLIGHTED}
        />
      ))}
      {highlightedDeclared.map((bucket, i) => (
        <EdgePass
          {...shared}
          dashSize={DECLARED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={DECLARED_GAP_SIZE}
          isHighlighted
          key={`hl-d-${i}`}
          linewidth={bucket.linewidth}
          opacity={OPACITY_HIGHLIGHTED * 0.7}
        />
      ))}
    </>
  );
}
