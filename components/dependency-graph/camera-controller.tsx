"use client";

import { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type CameraControlsImpl from "camera-controls";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Vector3 } from "three";
import type { NodePosition } from "@/types/graph";

export interface CameraControllerHandle {
  focusOnPosition: (pos: NodePosition) => void;
  resetView: () => void;
}

interface CameraControllerProps {
  readonly is2D: boolean;
}

export const CameraController = forwardRef<
  CameraControllerHandle,
  CameraControllerProps
>(function CameraController({ is2D }, ref) {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { invalidate } = useThree();

  useImperativeHandle(ref, () => ({
    focusOnPosition(pos: NodePosition) {
      const controls = controlsRef.current;
      if (!controls) return;
      controls.setLookAt(
        pos.x,
        pos.y + 8,
        pos.z + 12,
        pos.x,
        pos.y,
        pos.z,
        true
      );
      invalidate();
    },
    resetView() {
      const controls = controlsRef.current;
      if (!controls) return;
      controls.setLookAt(0, 12, 20, 0, 0, 0, true);
      invalidate();
    },
  }));

  // Switch between 3D and 2D views
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (is2D) {
      controls.setLookAt(0, 30, 0.01, 0, 0, 0, true);
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = 0.01;
    } else {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2;
    }
    invalidate();
  }, [is2D, invalidate]);

  return (
    <CameraControls
      dollySpeed={0.5}
      makeDefault
      maxDistance={80}
      minDistance={3}
      ref={controlsRef}
    />
  );
});
