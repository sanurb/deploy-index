"use client";

import { ExternalLink } from "lucide-react";
import type { GraphNode } from "@/types/graph";

interface BlastPanelRowProps {
  readonly node: GraphNode;
  readonly slug: string;
  readonly onSelect: (nodeId: string) => void;
}

export function BlastPanelRow({ node, slug, onSelect }: BlastPanelRowProps) {
  return (
    <button
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-800"
      onClick={() => onSelect(node.nodeId)}
      type="button"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-200">
          {node.displayName}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="capitalize">{node.kind}</span>
          {node.ownerName && (
            <>
              <span className="text-slate-600">·</span>
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: `#${node.colorKey}` }}
              />
              <span>{node.ownerName}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>Impact {node.impactScore}</span>
        {node.kind === "software" && (
          <a
            className="text-slate-400 hover:text-slate-200"
            href={`/organization/${slug}/services?q=${encodeURIComponent(node.displayName)}`}
            onClick={(e) => e.stopPropagation()}
            title="Open service"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </button>
  );
}
