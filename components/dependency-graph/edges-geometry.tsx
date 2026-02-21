"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo } from "react";
import { Color, NormalBlending, Vector3 } from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { neonColorFromKey } from "@/lib/graph/neon-palette";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Opacity tiers
// ---------------------------------------------------------------------------

const OPACITY_DEFAULT = 0.38;
const OPACITY_HIGHLIGHTED = 0.52;
const OPACITY_DIMMED = 0.2;

const MAX_HIGHLIGHTED_EDGES = 12;

// Thickness
const THICKNESS_MIN = 0.6;
const THICKNESS_MAX = 1.2;
const THICKNESS_BOOST = 0.3;

// Luminance gradient — source end brighter, destination end dimmer
const DEST_DIM_FACTOR = 0.7;

// Dash animation — only on highlighted edges
const DASH_SPEED = 0.1;

// Highlighted edges: near-solid with subtle breaks
const CONFIRMED_DASH_SIZE = 3.0;
const CONFIRMED_GAP_SIZE = 0.25;
const DECLARED_DASH_SIZE = 0.6;
const DECLARED_GAP_SIZE = 0.4;

function weightToThickness(weight: number): number {
  const t = Math.min(Math.max(weight, 0), 1);
  return THICKNESS_MIN + t * (THICKNESS_MAX - THICKNESS_MIN);
}

// ---------------------------------------------------------------------------
// Cubic Bezier
// ---------------------------------------------------------------------------

const SAMPLES_PER_CURVE = 20;

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
// Control points — arcs flow outward from center with spread
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

  const arcMag = Math.min(dist * 0.28, 4.5);
  const yLift = dist * 0.1;

  cp1.lerpVectors(from, to, 0.3);
  cp1.addScaledVector(_dir, arcMag * 0.55);
  cp1.addScaledVector(_perp, arcMag * 0.22);
  cp1.y += yLift;

  cp2.lerpVectors(from, to, 0.7);
  cp2.addScaledVector(_dir, arcMag * 0.55);
  cp2.addScaledVector(_perp, -arcMag * 0.22);
  cp2.y += yLift;
}

// ---------------------------------------------------------------------------
// Build curve segments with luminance gradient
// ---------------------------------------------------------------------------

interface CurveData {
  positions: Float32Array;
  colors: Float32Array;
  segmentCount: number;
}

const tmpHsl = { h: 0, s: 0, l: 0 };

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
  const srcColor = new Color();
  const segColor = new Color();

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
    neon.getHSL(tmpHsl);

    if (isHighlighted) {
      srcColor.setHSL(tmpHsl.h, tmpHsl.s * 0.72, tmpHsl.l * 0.84);
    } else {
      srcColor.setHSL(tmpHsl.h, tmpHsl.s * 0.62, tmpHsl.l * 0.74);
    }

    cubicBezier(p0, cp1, cp2, p3, 0, prev);
    let prevT = 0;

    for (let s = 1; s < SAMPLES_PER_CURVE; s++) {
      const t = s / (SAMPLES_PER_CURVE - 1);
      cubicBezier(p0, cp1, cp2, p3, t, curr);

      const prevDim = 1 - prevT * (1 - DEST_DIM_FACTOR);
      const currDim = 1 - t * (1 - DEST_DIM_FACTOR);

      const off = segIdx * 6;
      positions[off] = prev.x;
      positions[off + 1] = prev.y;
      positions[off + 2] = prev.z;
      positions[off + 3] = curr.x;
      positions[off + 4] = curr.y;
      positions[off + 5] = curr.z;

      segColor.copy(srcColor).multiplyScalar(prevDim);
      colors[off] = segColor.r;
      colors[off + 1] = segColor.g;
      colors[off + 2] = segColor.b;

      segColor.copy(srcColor).multiplyScalar(currDim);
      colors[off + 3] = segColor.r;
      colors[off + 4] = segColor.g;
      colors[off + 5] = segColor.b;

      prev.copy(curr);
      prevT = t;
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
// Solid edge pass — idle edges, no dashing, no animation
// ---------------------------------------------------------------------------

const SolidEdgePass = memo(function SolidEdgePass({
  edges,
  nodeMap,
  posMap,
  linewidth,
  opacity,
}: {
  edges: readonly GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  posMap: Map<string, NodePosition>;
  linewidth: number;
  opacity: number;
}) {
  const { size } = useThree();

  const lineSegments = useMemo(() => new LineSegments2(), []);
  const lineGeometry = useMemo(() => new LineSegmentsGeometry(), []);
  const lineMaterial = useMemo(
    () =>
      new LineMaterial({
        vertexColors: true,
        linewidth,
        transparent: true,
        opacity,
        dashed: false,
        worldUnits: false,
        blending: NormalBlending,
        depthWrite: false,
        toneMapped: false,
      } as ConstructorParameters<typeof LineMaterial>[0]),
    []
  );

  // Attach geometry + material on mount, dispose on unmount
  useEffect(() => {
    lineSegments.geometry = lineGeometry;
    lineSegments.material = lineMaterial;
    return () => {
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [lineSegments, lineMaterial, lineGeometry]);

  // Update geometry data when edges change — mutate in place
  useEffect(() => {
    if (edges.length === 0) return;

    const { positions, colors, segmentCount } = buildCurveData(
      edges,
      nodeMap,
      posMap,
      false
    );

    if (segmentCount === 0) return;

    lineGeometry.setPositions(positions);
    lineGeometry.setColors(colors);
  }, [edges, nodeMap, posMap, lineGeometry]);

  // Update material uniforms
  useEffect(() => {
    lineMaterial.opacity = opacity;
    lineMaterial.linewidth = linewidth;
  }, [opacity, linewidth, lineMaterial]);

  // Resolution sync
  useEffect(() => {
    lineMaterial.resolution.set(size.width, size.height);
  }, [size, lineMaterial]);

  if (edges.length === 0) return null;

  return <primitive object={lineSegments} />;
});

// ---------------------------------------------------------------------------
// Dashed edge pass — highlighted edges, animated dashOffset via useFrame
// ---------------------------------------------------------------------------

const DashedEdgePass = memo(function DashedEdgePass({
  edges,
  nodeMap,
  posMap,
  dashSize,
  gapSize,
  linewidth,
  opacity,
}: {
  edges: readonly GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  posMap: Map<string, NodePosition>;
  dashSize: number;
  gapSize: number;
  linewidth: number;
  opacity: number;
}) {
  const { size } = useThree();

  const lineSegments = useMemo(() => new LineSegments2(), []);
  const lineGeometry = useMemo(() => new LineSegmentsGeometry(), []);
  const lineMaterial = useMemo(
    () =>
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
      } as ConstructorParameters<typeof LineMaterial>[0]),
    []
  );

  // Attach geometry + material on mount, dispose on unmount
  useEffect(() => {
    lineSegments.geometry = lineGeometry;
    lineSegments.material = lineMaterial;
    return () => {
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, [lineSegments, lineMaterial, lineGeometry]);

  // Update geometry data when edges change — mutate in place
  useEffect(() => {
    if (edges.length === 0) return;

    const { positions, colors, segmentCount } = buildCurveData(
      edges,
      nodeMap,
      posMap,
      true
    );

    if (segmentCount === 0) return;

    lineGeometry.setPositions(positions);
    lineGeometry.setColors(colors);
    lineSegments.computeLineDistances();
  }, [edges, nodeMap, posMap, lineGeometry, lineSegments]);

  // Update material uniforms
  useEffect(() => {
    lineMaterial.opacity = opacity;
    lineMaterial.linewidth = linewidth;
  }, [opacity, linewidth, lineMaterial]);

  // Resolution sync
  useEffect(() => {
    lineMaterial.resolution.set(size.width, size.height);
  }, [size, lineMaterial]);

  // Animate dashOffset — only on highlighted edges
  useFrame((_, delta) => {
    lineMaterial.dashOffset -= delta * DASH_SPEED;
  });

  if (edges.length === 0) return null;

  return <primitive object={lineSegments} />;
});

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

export const EdgesGeometry = memo(function EdgesGeometry({
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
        backgroundEdges: [...bg, ...sorted.slice(MAX_HIGHLIGHTED_EDGES)],
      };
    }

    return { neighborEdges: neighbor, backgroundEdges: bg };
  }, [edges, activeNode]);

  // Highlighted edges — dashed with animation, boosted thickness
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

  // Background edges — solid, no animation
  const bgOpacity = activeNode ? OPACITY_DIMMED : OPACITY_DEFAULT;
  const bgBuckets = useMemo(
    () => bucketByWeight(backgroundEdges),
    [backgroundEdges]
  );

  const shared = { nodeMap, posMap } as const;

  return (
    <>
      {/* Background / idle edges — solid, no dash, no animation */}
      {bgBuckets.map((bucket, i) => (
        <SolidEdgePass
          {...shared}
          edges={bucket.edges}
          key={`bg-${i}`}
          linewidth={bucket.linewidth}
          opacity={bgOpacity}
        />
      ))}

      {/* Highlighted neighborhood edges — dashed with slow animation */}
      {highlightedConfirmed.map((bucket, i) => (
        <DashedEdgePass
          {...shared}
          dashSize={CONFIRMED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={CONFIRMED_GAP_SIZE}
          key={`hl-c-${i}`}
          linewidth={bucket.linewidth}
          opacity={OPACITY_HIGHLIGHTED}
        />
      ))}
      {highlightedDeclared.map((bucket, i) => (
        <DashedEdgePass
          {...shared}
          dashSize={DECLARED_DASH_SIZE}
          edges={bucket.edges}
          gapSize={DECLARED_GAP_SIZE}
          key={`hl-d-${i}`}
          linewidth={bucket.linewidth}
          opacity={OPACITY_HIGHLIGHTED * 0.7}
        />
      ))}
    </>
  );
});
