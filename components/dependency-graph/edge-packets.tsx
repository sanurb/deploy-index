"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DynamicDrawUsage,
  type Points,
  ShaderMaterial,
  Vector3,
} from "three";
import type { GraphEdge, GraphNode, NodePosition } from "@/types/graph";

// ── Visual constants ────────────────────────────────────────────────────────
const PILLS_PER_EDGE = 5;
const PILL_SPEED = 0.12;
const PILL_MIN_SIZE = 1.5;
const PILL_MAX_SIZE = 3.0;
const PILL_OPACITY = 0.45;
const CAP_T = 0.94;
const CAP_SIZE = 4.5;
const CAP_OPACITY = 0.7;
const FADE_ZONE = 0.12;
const MAX_ACTIVE_EDGES = 12;
const PARTICLES_PER_EDGE = PILLS_PER_EDGE + 1; // 5 pills + 1 comet cap

// ── Sprite texture (created once) ───────────────────────────────────────────
let spriteTexture: CanvasTexture | null = null;

function getSpriteTexture(): CanvasTexture {
  if (spriteTexture) return spriteTexture;
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  spriteTexture = new CanvasTexture(canvas);
  return spriteTexture;
}

// ── Shaders ─────────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;

  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uSprite;
  varying float vAlpha;

  void main() {
    float a = texture2D(uSprite, gl_PointCoord).a;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a * vAlpha);
  }
`;

// ── Helpers ─────────────────────────────────────────────────────────────────
const _origin = new Vector3(0, 0, 0);
const _mid = new Vector3();
const _dir = new Vector3();
const _up = new Vector3(0, 1, 0);
const _perp = new Vector3();
const _tmp = new Vector3();

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

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ── Component ───────────────────────────────────────────────────────────────
interface EdgePacketsProps {
  readonly edges: readonly GraphEdge[];
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
}

export const EdgePackets = memo(function EdgePackets({
  edges,
  nodes: _nodes,
  positions,
  selectedNodeId,
  hoveredNodeId,
}: EdgePacketsProps) {
  const pointsRef = useRef<Points>(null);
  const tRef = useRef(0);

  const activeNode = selectedNodeId || hoveredNodeId;

  const activeEdges = useMemo(() => {
    if (!activeNode) return [];
    const matched = edges.filter(
      (e) => e.fromId === activeNode || e.toId === activeNode
    );
    // Sort by weight descending, cap at MAX_ACTIVE_EDGES
    matched.sort((a, b) => b.weight - a.weight);
    return matched.slice(0, MAX_ACTIVE_EDGES);
  }, [edges, activeNode]);

  const posMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    for (const pos of positions) {
      map.set(pos.nodeId, pos);
    }
    return map;
  }, [positions]);

  const curves = useMemo(() => {
    return activeEdges.map((edge) => {
      const fromPos = posMap.get(edge.fromId);
      const toPos = posMap.get(edge.toId);
      const p0 = new Vector3(fromPos?.x ?? 0, fromPos?.y ?? 0, fromPos?.z ?? 0);
      const p3 = new Vector3(toPos?.x ?? 0, toPos?.y ?? 0, toPos?.z ?? 0);
      const cp1v = new Vector3();
      const cp2v = new Vector3();
      computeControlPoints(p0, p3, cp1v, cp2v);
      return { p0, cp1: cp1v, cp2: cp2v, p3 };
    });
  }, [activeEdges, posMap]);

  const totalParticles = curves.length * PARTICLES_PER_EDGE;

  // Stable buffers — recreated only when particle count changes
  const { geometry, material } = useMemo(() => {
    const count = Math.max(totalParticles, 1);
    const posArr = new Float32Array(count * 3);
    const sizeArr = new Float32Array(count);
    const alphaArr = new Float32Array(count);

    const geo = new BufferGeometry();
    const posAttr = new BufferAttribute(posArr, 3);
    posAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("position", posAttr);

    const sizeAttr = new BufferAttribute(sizeArr, 1);
    sizeAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("aSize", sizeAttr);

    const alphaAttr = new BufferAttribute(alphaArr, 1);
    alphaAttr.setUsage(DynamicDrawUsage);
    geo.setAttribute("aAlpha", alphaAttr);

    geo.setDrawRange(0, totalParticles);

    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uSprite: { value: getSpriteTexture() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });

    return { geometry: geo, material: mat };
  }, [totalParticles]);

  // Animate in useFrame — mutate buffers directly, zero React state
  useFrame((_, delta) => {
    if (totalParticles === 0 || !pointsRef.current) return;

    tRef.current = (tRef.current + delta * PILL_SPEED) % 1;

    const posAttr = geometry.getAttribute("position") as BufferAttribute;
    const sizeAttr = geometry.getAttribute("aSize") as BufferAttribute;
    const alphaAttr = geometry.getAttribute("aAlpha") as BufferAttribute;

    for (let i = 0; i < curves.length; i++) {
      const { p0, cp1, cp2, p3 } = curves[i];
      const base = i * PARTICLES_PER_EDGE;

      // 5 flow pills
      for (let p = 0; p < PILLS_PER_EDGE; p++) {
        const t = (tRef.current + p / PILLS_PER_EDGE) % 1;
        cubicBezier(p0, cp1, cp2, p3, t, _tmp);
        const idx = base + p;
        posAttr.setXYZ(idx, _tmp.x, _tmp.y, _tmp.z);

        // Fade in/out near endpoints
        const fadeAlpha =
          smoothstep(0, FADE_ZONE, t) *
          smoothstep(1, 1 - FADE_ZONE, t) *
          PILL_OPACITY;
        alphaAttr.setX(idx, fadeAlpha);

        // Size taper: largest at midpoint
        const taper = 1 - Math.abs(2 * t - 1);
        const size = PILL_MIN_SIZE + (PILL_MAX_SIZE - PILL_MIN_SIZE) * taper;
        sizeAttr.setX(idx, size);
      }

      // 1 comet cap at destination end
      const capIdx = base + PILLS_PER_EDGE;
      cubicBezier(p0, cp1, cp2, p3, CAP_T, _tmp);
      posAttr.setXYZ(capIdx, _tmp.x, _tmp.y, _tmp.z);
      alphaAttr.setX(capIdx, CAP_OPACITY);
      sizeAttr.setX(capIdx, CAP_SIZE);
    }

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  if (totalParticles === 0) return null;

  return (
    <points
      geometry={geometry}
      material={material}
      ref={pointsRef}
      renderOrder={3}
    />
  );
});
