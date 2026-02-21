"use client";

import { Html } from "@react-three/drei";
import { memo, useMemo } from "react";
import { neonHex } from "@/lib/graph/neon-palette";
import type { GraphNode, NodePosition } from "@/types/graph";

interface HoverTooltipProps {
  readonly nodes: readonly GraphNode[];
  readonly positions: readonly NodePosition[];
  readonly hoveredNodeId: string;
}

export const HoverTooltip = memo(function HoverTooltip({
  nodes,
  positions,
  hoveredNodeId,
}: HoverTooltipProps) {
  const node = useMemo(
    () => nodes.find((n) => n.nodeId === hoveredNodeId),
    [nodes, hoveredNodeId]
  );

  const pos = useMemo(
    () => positions.find((p) => p.nodeId === hoveredNodeId),
    [positions, hoveredNodeId]
  );

  if (!node || !pos) return null;

  const scale = Math.log2(node.prodInterfaceCount + 1) * 0.3 + 0.45;
  const confidencePct = Math.round(node.confidenceScore * 100);
  const missingCount = node.missingFields.length;

  return (
    <Html
      position={[pos.x, pos.y + scale + 1.0, pos.z]}
      style={{ pointerEvents: "none" }}
      zIndexRange={[100, 0]}
    >
      <div
        className="rounded border border-white/[0.06] bg-[#0A0D14]/95 px-2.5 py-1.5 text-[11px] leading-tight text-slate-300 shadow-2xl"
        style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
      >
        {/* Row 1: name + kind badge */}
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-white/90">{node.displayName}</span>
          <span className="rounded bg-white/[0.06] px-1 py-px text-[9px] uppercase tracking-wider text-slate-500">
            {node.kind}
          </span>
        </div>

        {/* Row 2: owner · impact · confidence */}
        <div className="mt-1 flex items-center gap-1.5 text-slate-400">
          {node.ownerName && (
            <>
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ backgroundColor: neonHex(node.colorKey) }}
              />
              <span>{node.ownerName}</span>
              <span className="text-white/10">|</span>
            </>
          )}
          <span>Impact {node.impactScore}</span>
          <span className="text-white/10">|</span>
          <span
            className={
              confidencePct >= 70
                ? "text-slate-300"
                : confidencePct >= 40
                  ? "text-amber-400/80"
                  : "text-red-400/80"
            }
          >
            {confidencePct}% conf
          </span>
        </div>

        {/* Row 3: prod + missing (only when relevant) */}
        {(node.envPresence.production || missingCount > 0) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-slate-500">
            {node.envPresence.production && (
              <span>{node.prodInterfaceCount} prod</span>
            )}
            {missingCount > 0 && (
              <>
                {node.envPresence.production && (
                  <span className="text-white/10">|</span>
                )}
                <span className="text-amber-500/70">
                  {missingCount} missing
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </Html>
  );
});
