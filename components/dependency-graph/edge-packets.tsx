"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, type Points, Vector3 } from "three";
import type { GraphEdge, NodePosition } from "@/types/graph";

/**
 * Edge packets — tiny dots traveling along selected edges.
 *
 * ONLY active when a node is SELECTED (not hovered).
 * Two dots per edge (offset by 0.5) for a calm, directional flow.
 * Additive blending, dim, small — micro-accent only.
 * All animation in useFrame via buffer mutation, no React state.
 */

const MAX_PACKETS_PER_EDGE = 2;
const PACKET_SPEED = 0.2;
const PACKET_SIZE = 1.2;
const PACKET_OPACITY = 0.45;

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

interface EdgePacketsProps {
  readonly edges: readonly GraphEdge[];
  readonly positions: readonly NodePosition[];
  readonly selectedNodeId: string;
}

export function EdgePackets({
  edges,
  positions,
  selectedNodeId,
}: EdgePacketsProps) {
  const pointsRef = useRef<Points>(null);
  const tRef = useRef(0);

  const activeEdges = useMemo(() => {
    if (!selectedNodeId) return [];
    return edges.filter(
      (e) => e.fromId === selectedNodeId || e.toId === selectedNodeId
    );
  }, [edges, selectedNodeId]);

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
      const p0 = new Vector3(
        fromPos?.x ?? 0,
        fromPos?.y ?? 0,
        fromPos?.z ?? 0
      );
      const p3 = new Vector3(toPos?.x ?? 0, toPos?.y ?? 0, toPos?.z ?? 0);
      const cp1v = new Vector3();
      const cp2v = new Vector3();
      computeControlPoints(p0, p3, cp1v, cp2v);
      return { p0, cp1: cp1v, cp2: cp2v, p3 };
    });
  }, [activeEdges, posMap]);

  const totalParticles = curves.length * MAX_PACKETS_PER_EDGE;

  // Animate in useFrame — mutate buffer directly, no React state
  useFrame((_, delta) => {
    if (totalParticles === 0 || !pointsRef.current) return;

    tRef.current = (tRef.current + delta * PACKET_SPEED) % 1;
    const posAttr = pointsRef.current.geometry.getAttribute(
      "position"
    ) as BufferAttribute;
    const tmp = new Vector3();

    for (let i = 0; i < curves.length; i++) {
      const { p0, cp1, cp2, p3 } = curves[i];

      for (let p = 0; p < MAX_PACKETS_PER_EDGE; p++) {
        const t = (tRef.current + p / MAX_PACKETS_PER_EDGE) % 1;
        cubicBezier(p0, cp1, cp2, p3, t, tmp);
        const idx = i * MAX_PACKETS_PER_EDGE + p;
        posAttr.setXYZ(idx, tmp.x, tmp.y, tmp.z);
      }
    }

    posAttr.needsUpdate = true;
  });

  if (totalParticles === 0) return null;

  const posArray = new Float32Array(totalParticles * 3);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          args={[posArray, 3]}
          attach="attributes-position"
          count={totalParticles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        blending={AdditiveBlending}
        color="#8898aa"
        depthWrite={false}
        opacity={PACKET_OPACITY}
        size={PACKET_SIZE}
        sizeAttenuation={false}
        toneMapped={false}
        transparent
      />
    </points>
  );
}
