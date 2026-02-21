"use client";

import { useMemo } from "react";
import { AdditiveBlending } from "three";

/**
 * Concentric ring guides on the ground plane (Y=0).
 * Neon-tinted: very faint cyan-blue additive glow, subtle structural cue.
 */

const HOP_RADII = [4, 8, 13, 19, 26];
const RING_COLOR = "#0e1a2e";
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
            blending={AdditiveBlending}
            color={RING_COLOR}
            depthWrite={false}
            opacity={RING_OPACITY - i * 0.03}
            toneMapped={false}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
