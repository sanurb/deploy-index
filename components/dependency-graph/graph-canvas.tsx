"use client";

import { useCallback, useMemo, useRef } from "react";
import type { GraphLayout, GraphResponse } from "@/types/graph";
import {
  CameraController,
  type CameraControllerHandle,
} from "./camera-controller";
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

  // Focus node owner color for halo tint
  const focusNode = useMemo(
    () => data.nodes.find((n) => n.nodeId === data.focusNodeId),
    [data.nodes, data.focusNodeId]
  );
  const focusHaloColor = useMemo(() => {
    if (!focusNode?.colorKey) return "#64748B";
    return `#${focusNode.colorKey}`;
  }, [focusNode]);

  return (
    <Scene className={className}>
      {/* Structural guides */}
      <HopRings maxHops={hops} />

      {/* Focus halo — soft radial glow, bloom picks it up */}
      <FocusHalo color={focusHaloColor} position={focusPos} />

      {/* Edges behind nodes */}
      <EdgesGeometry
        edges={data.edges}
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Nodes: fill + wireframe overlay */}
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

      {/* Labels: SDF text with owner glow */}
      <Labels
        focusNodeId={data.focusNodeId}
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
        selectedNodeId={selectedNodeId}
      />

      {/* Tooltip: single DOM overlay */}
      <HoverTooltip
        hoveredNodeId={hoveredNodeId}
        nodes={data.nodes}
        positions={layout.positions}
      />

      <CameraController is2D={view === "2d"} ref={cameraRef} />
    </Scene>
  );
}
