"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { AdditiveBlending, type Mesh } from "three";
import { neonHex } from "@/lib/graph/neon-palette";
import type { NodePosition } from "@/types/graph";

/**
 * Focus halo — a tight wireframe ring around the focus node.
 * NOT a volumetric sphere.  Just a thin torus at scale ~1.08 with
 * low additive opacity so bloom picks it up subtly.
 *
 * This makes the focus node unmistakable within 2 seconds without
 * polluting the background or stacking with other additive layers.
 */

interface FocusHaloProps {
  readonly position: NodePosition | null;
  readonly colorKey: string;
}

export function FocusHalo({ position, colorKey }: FocusHaloProps) {
  const meshRef = useRef<Mesh>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [position, invalidate]);

  if (!position) return null;

  const hex = neonHex(colorKey);

  return (
    <mesh
      position={[position.x, position.y, position.z]}
      ref={meshRef}
      renderOrder={0}
    >
      {/* Torus: radius matches focus-scale node, tube is thin */}
      <torusGeometry args={[1.1, 0.04, 8, 48]} />
      <meshBasicMaterial
        blending={AdditiveBlending}
        color={hex}
        depthWrite={false}
        opacity={0.25}
        toneMapped={false}
        transparent
      />
    </mesh>
  );
}
