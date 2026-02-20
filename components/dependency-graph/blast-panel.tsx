"use client";

import { AlertTriangle, ArrowUpRight, Clipboard, Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { neonHex } from "@/lib/graph/neon-palette";
import type { GraphNode, GraphResponse } from "@/types/graph";
import { BlastPanelRow } from "./blast-panel-row";
import {
  downloadBlastReport,
  generateBlastReport,
} from "./export-blast-report";

interface BlastPanelProps {
  readonly data: GraphResponse;
  readonly selectedNodeId: string;
  readonly slug: string;
  readonly orgName: string;
  readonly onSelect: (nodeId: string) => void;
  readonly onReduceHops: () => void;
}

export function BlastPanel({
  data,
  selectedNodeId,
  slug,
  orgName,
  onSelect,
  onReduceHops,
}: BlastPanelProps) {
  const [exportAcknowledged, setExportAcknowledged] = useState(false);

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.nodeId === selectedNodeId) ?? null,
    [data.nodes, selectedNodeId]
  );

  const displayNode =
    selectedNode ??
    data.nodes.find((n) => n.nodeId === data.focusNodeId) ??
    null;

  const prodNodes = useMemo(
    () => data.nodes.filter((n) => n.envPresence.production),
    [data.nodes]
  );

  const stagingNodes = useMemo(
    () => data.nodes.filter((n) => n.envPresence.staging),
    [data.nodes]
  );

  const devNodes = useMemo(
    () => data.nodes.filter((n) => n.envPresence.development),
    [data.nodes]
  );

  const ownerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of data.nodes) {
      if (node.ownerName) {
        counts.set(node.ownerName, (counts.get(node.ownerName) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.nodes]);

  const topImpacted = useMemo(
    () =>
      [...data.nodes]
        .filter((n) => n.nodeId !== data.focusNodeId)
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 8),
    [data.nodes, data.focusNodeId]
  );

  const handleExport = useCallback(() => {
    if (!displayNode) return;

    const needsAck = displayNode.confidenceScore < 0.5 && !exportAcknowledged;
    if (needsAck) {
      setExportAcknowledged(true);
      return;
    }

    const report = generateBlastReport({
      data,
      selectedNode: displayNode,
      orgName,
    });
    downloadBlastReport(
      report,
      `blast-report-${displayNode.displayName.toLowerCase().replace(/\s+/g, "-")}.md`
    );
    setExportAcknowledged(false);
  }, [data, displayNode, orgName, exportAcknowledged]);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
  }, []);

  if (!displayNode) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-slate-500">
        Select a node to see its blast radius
      </div>
    );
  }

  const confidencePct = Math.round(displayNode.confidenceScore * 100);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-slate-50">
              {displayNode.displayName}
            </h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5 capitalize">
                {displayNode.kind}
              </span>
              {displayNode.ownerName && (
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{
                      backgroundColor: neonHex(displayNode.colorKey),
                    }}
                  />
                  {displayNode.ownerName}
                </span>
              )}
              <span
                className={
                  confidencePct >= 70
                    ? "text-emerald-400"
                    : confidencePct >= 40
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                {confidencePct}% confidence
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              className="h-7 w-7"
              onClick={handleCopyUrl}
              size="icon"
              title="Copy URL"
              variant="ghost"
            >
              <Clipboard className="size-3.5" />
            </Button>
            <Button
              className="h-7 w-7"
              onClick={handleExport}
              size="icon"
              title="Export report"
              variant="ghost"
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Export acknowledgment gate */}
      {exportAcknowledged && displayNode.confidenceScore < 0.5 && (
        <div className="border-b border-amber-900/50 bg-amber-950/30 px-4 py-3">
          <p className="text-xs text-amber-300">
            This report is based on incomplete operational data for:{" "}
            <strong>{displayNode.missingFields.join(", ")}</strong>
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              className="h-7 bg-amber-600 text-xs hover:bg-amber-700"
              onClick={handleExport}
              size="sm"
            >
              Export anyway
            </Button>
            <Button
              className="h-7 text-xs"
              onClick={() => setExportAcknowledged(false)}
              size="sm"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Operational profile callout */}
      {displayNode.confidenceScore < 0.7 &&
        displayNode.missingFields.length > 0 && (
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-start gap-2 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
              <div>
                <p className="font-medium text-amber-300">
                  Fix operational profile
                </p>
                <ul className="mt-1 space-y-0.5 text-slate-400">
                  {displayNode.missingFields.map((field) => (
                    <li className="flex items-center gap-1" key={field}>
                      <span className="text-slate-600">·</span>
                      Missing {field}
                      {displayNode.kind === "software" && (
                        <a
                          className="ml-1 text-sky-400 hover:text-sky-300"
                          href={`/organization/${slug}/services?q=${encodeURIComponent(displayNode.displayName)}`}
                        >
                          <ArrowUpRight className="inline size-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

      {/* Truncated warning */}
      {data.truncated && (
        <div className="border-b border-slate-800 px-4 py-3">
          <p className="text-xs text-slate-400">
            Showing top results. Narrow the query to see more.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              className="h-7 text-xs"
              onClick={onReduceHops}
              size="sm"
              variant="outline"
            >
              Reduce to 2 hops
            </Button>
          </div>
        </div>
      )}

      {/* Blast summary by env */}
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          Impact by environment
        </h3>
        <div className="space-y-1.5">
          <EnvRow count={prodNodes.length} env="Production" />
          <EnvRow count={stagingNodes.length} env="Staging" />
          <EnvRow count={devNodes.length} env="Development" />
        </div>
      </div>

      {/* Impacted owners */}
      {ownerCounts.length > 0 && (
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Impacted owners
          </h3>
          <div className="space-y-1">
            {ownerCounts.slice(0, 6).map(([owner, count]) => (
              <div
                className="flex items-center justify-between text-xs"
                key={owner}
              >
                <span className="text-slate-300">{owner}</span>
                <span className="text-slate-500">
                  {count} node{count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top impacted services */}
      {topImpacted.length > 0 && (
        <div className="px-4 py-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Top impacted
          </h3>
          <div className="space-y-0.5">
            {topImpacted.map((node) => (
              <BlastPanelRow
                key={node.nodeId}
                node={node}
                onSelect={onSelect}
                slug={slug}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnvRow({ env, count }: { env: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-300">{env}</span>
      <span className="font-medium text-slate-200">
        {count} service{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
