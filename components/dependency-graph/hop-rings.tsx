"use client";

import { useMemo } from "react";
import { RingGeometry } from "three";

/**
 * Concentric ring guides on the ground plane (Y=0).
 * One ring per hop distance, matching layout-engine radii [0, 4, 8, 13, 19, 26].
 * Faint, structural, never distracting — communicates hop distance without a legend.
 */

const HOP_RADII = [4, 8, 13, 19, 26];
const RING_COLOR = "#0F1219";
const RING_OPACITY = 0.25;
const RING_THICKNESS = 0.03;

export function HopRings({ maxHops }: { readonly maxHops: number }) {
  const visibleRadii = useMemo(() => HOP_RADII.slice(0, maxHops), [maxHops]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {visibleRadii.map((radius, i) => (
        <mesh key={radius} position={[0, 0, 0]}>
          <ringGeometry
            args={[radius - RING_THICKNESS, radius + RING_THICKNESS, 128]}
          />
          <meshBasicMaterial
            color={RING_COLOR}
            opacity={RING_OPACITY - i * 0.03}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
