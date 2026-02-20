"use client";

import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { ReactNode } from "react";
import { NEON_BG_CSS } from "@/lib/graph/neon-palette";

/**
 * Scene: dark canvas, disciplined post-processing.
 *
 * Bloom has a HIGH threshold (0.75) so only intentionally bright wireframe
 * edges on focus/hover nodes trigger it.  Everything else stays sub-threshold.
 * Labels, background, idle nodes — none of these bloom.
 */

interface SceneProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Scene({ children, className }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 14, 22], fov: 50 }}
      className={className}
      frameloop="demand"
      gl={{ antialias: true, alpha: false, toneMappingExposure: 1.0 }}
      style={{ background: NEON_BG_CSS }}
    >
      <ambientLight intensity={0.05} />
      <fog args={[NEON_BG_CSS, 50, 85]} attach="fog" />

      {children}

      <EffectComposer>
        <Bloom
          intensity={0.35}
          luminanceSmoothing={0.4}
          luminanceThreshold={0.75}
          mipmapBlur
          radius={0.4}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette darkness={0.35} offset={0.35} />
      </EffectComposer>
    </Canvas>
  );
}
