"use client";

import { useCallback, useMemo, useRef } from "react";
import type { GraphLayout, GraphResponse } from "@/types/graph";
import {
  CameraController,
  type CameraControllerHandle,
} from "./camera-controller";
import { EdgePackets } from "./edge-packets";
import { EdgesGeometry } from "./edges-geometry";
import { FocusHalo } from "./focus-halo";
import { HopRings } from "./hop-rings";
import { HoverTooltip } from "./hover-tooltip";
import { Labels } from "./labels";
import { NodesMesh } from "./nodes-mesh";
import { Scene } from "./scene";

interface GraphCanvasProps {
  readonly data: GraphResponse;
  readonly layout: GraphLayout;
  readonly selectedNodeId: string;
  readonly hoveredNodeId: string;
  readonly view: "3d" | "2d";
  readonly hops: number;
  readonly onSelect: (nodeId: string) => void;
  readonly onHover: (nodeId: string) => void;
  readonly cameraRef?: React.RefObject<CameraControllerHandle | null>;
  readonly className?: string;
}

export function GraphCanvas({
  data,
  layout,
  selectedNodeId,
  hoveredNodeId,
  view,
  hops,
  onSelect,
  onHover,
  cameraRef: externalCameraRef,
  className,
}: GraphCanvasProps) {
  const internalCameraRef = useRef<CameraControllerHandle>(null);
  const cameraRef = externalCameraRef ?? internalCameraRef;

  const handleClick = useCallback(
    (nodeId: string) => {
      onSelect(nodeId);
      const pos = layout.positions.find((p) => p.nodeId === nodeId);
      if (pos) {
        cameraRef.current?.focusOnPosition(pos);
      }
    },
    [onSelect, layout.positions, cameraRef]
  );

  // Focus node position for halo
  const focusPos = useMemo(
    () => layout.positions.find((p) => p.nodeId === data.focusNodeId) ?? null,
    [layout.positions, data.focusNodeId]
  );

  // Focus node colorKey for neon halo tint
  const focusNode = useMemo(
    () => data.nodes.find((n) => n.nodeId === data.focusNodeId),
    [data.nodes, data.focusNodeId]
  );

  return (
    <Scene className={className}>
      {/* Structural guides */}
      <HopRings maxHops={hops} />

      {/* Focus halo — neon-colored radial glow */}
      <FocusHalo colorKey={focusNode?.colorKey ?? ""} position={focusPos} />

      {/* Curved edges behind nodes */}
      <EdgesGeometry
        edges={data.edges}
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Subtle packets on selected-neighborhood edges only */}
      <EdgePackets
        edges={data.edges}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Nodes: core + halo wireframe */}
      <NodesMesh
        edges={data.edges}
        focusNodeId={data.focusNodeId}
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        onClick={handleClick}
        onHover={onHover}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Labels: SDF text with neon glow */}
      <Labels
        focusNodeId={data.focusNodeId}
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Tooltip: DOM overlay */}
      <HoverTooltip
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
      />

      <CameraController is2D={view === "2d"} ref={cameraRef} />
    </Scene>
  );
}
