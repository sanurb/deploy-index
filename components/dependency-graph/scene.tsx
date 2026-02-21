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
import { Color as ThreeColor, FogExp2 } from "three";
import { NEON_BG_CSS, NEON_FOG } from "@/lib/graph/neon-palette";

/**
 * Scene: Vercel/Linear-dark canvas with disciplined post-processing.
 *
 * frameloop="always" — edges have a continuous slow dash animation that
 * runs purely in material space (dashOffset uniform in useFrame).
 * No React re-renders; just GPU work.
 */

interface SceneProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly enablePostprocessing?: boolean;
}

const SCENE_BG = new ThreeColor(NEON_BG_CSS);
const SCENE_FOG = new FogExp2(NEON_FOG, 0.022);

export function Scene({
  children,
  className,
  enablePostprocessing = true,
}: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 14, 22], fov: 50 }}
      className={className}
      frameloop="always"
      gl={{ antialias: true, alpha: false, toneMappingExposure: 1.0 }}
      scene={{ background: SCENE_BG }}
      style={{ background: NEON_BG_CSS }}
    >
      <ambientLight intensity={0.05} />
      <primitive attach="fog" object={SCENE_FOG} />

      {children}

      {enablePostprocessing ? (
        <EffectComposer>
          <Bloom
            intensity={0.18}
            luminanceSmoothing={0.25}
            luminanceThreshold={0.7}
            mipmapBlur
            radius={0.25}
          />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette darkness={0.45} offset={0.3} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
