"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { ReactNode } from "react";

/**
 * Premium color policy — single source of truth.
 *
 * Background:    #05070B  (near-black, neutral, no blue tint)
 * Fog:           #05070B  → 40..70  (depth fade, distant nodes dissolve)
 *
 * Owner colors:  colorKey → HSL forced to S 70–85%, L 55–65% = vivid neon
 * Emissive:      impactScore drives emissiveIntensity (0.2 base → 0.8 max)
 *                Bloom pass picks up emissive > 1.0 for glow halos
 *
 * Focus node:    1.4× scale, white emissive, halo sprite
 * Selected:      0.9 emissive intensity, bright owner color
 * Hovered:       +0.3 emissive boost
 *
 * Confidence:    ≥0.7 full saturation + opacity
 *                0.4–0.7 desaturated 30%, opacity 0.75
 *                <0.4 desaturated 60%, opacity 0.5
 *
 * Production:    Y +1.5, emissive +0.15 warm boost
 * Staging:       Y 0
 * Development:   Y -1.5, opacity 0.8
 *
 * Kind geometry: software=icosahedron, dependency=octahedron, runtime=cube
 * Wireframe:     second instanced pass per kind, owner-colored, thin lines
 *
 * Edges default: owner color at 0.12 alpha, ultra-thin
 * Edges active:  owner color at 0.7 alpha, neighborhood highlight
 * Declared:      dashed via separate LineDashedMaterial pass
 *
 * Labels:        SDF, owner color tint at 50% blend with white
 *                Focus 0.5em, hovered 0.4em, top-N 0.3em
 *
 * Bloom:         luminanceThreshold 0.6, radius 0.5, intensity 0.8
 *                Picks up high-emissive nodes (focus, high-impact)
 */

interface SceneProps {
  readonly children: ReactNode;
  readonly className?: string;
}

const BG = "#05070B";

export function Scene({ children, className }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 14, 22], fov: 50 }}
      className={className}
      frameloop="demand"
      gl={{ antialias: true, alpha: false }}
      style={{ background: BG }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight
        color="#E2E8F0"
        intensity={0.4}
        position={[10, 20, 8]}
      />
      <pointLight
        color="#64748B"
        decay={2}
        distance={50}
        intensity={0.6}
        position={[0, 10, 0]}
      />
      <fog args={[BG, 40, 70]} attach="fog" />
      {children}
      <EffectComposer>
        <Bloom
          intensity={0.8}
          luminanceSmoothing={0.4}
          luminanceThreshold={0.6}
          mipmapBlur
          radius={0.5}
        />
      </EffectComposer>
    </Canvas>
  );
}
