"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { AdditiveBlending, type Mesh } from "three";
import type { NodePosition } from "@/types/graph";

/**
 * Focus node halo — a soft radial glow sprite centered on the focus node.
 * Uses additive blending + high emissive so the bloom pass picks it up.
 * Creates the "radial light" effect that makes the focus node dominant.
 */

interface FocusHaloProps {
  readonly position: NodePosition | null;
  readonly color: string;
}

export function FocusHalo({ position, color }: FocusHaloProps) {
  const meshRef = useRef<Mesh>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [position, invalidate]);

  if (!position) return null;

  return (
    <mesh position={[position.x, position.y, position.z]} ref={meshRef}>
      <sphereGeometry args={[2.2, 32, 32]} />
      <meshStandardMaterial
        blending={AdditiveBlending}
        color={color}
        depthWrite={false}
        emissive={color}
        emissiveIntensity={0.4}
        opacity={0.08}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
