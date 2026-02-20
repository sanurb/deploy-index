import type { GraphNode, GraphResponse } from "@/types/graph";

export interface ExportOptions {
  readonly data: GraphResponse;
  readonly selectedNode: GraphNode | null;
  readonly orgName: string;
}

export function generateBlastReport(options: ExportOptions): string {
  const { data, selectedNode, orgName } = options;
  const focusNode = data.nodes.find((n) => n.nodeId === data.focusNodeId);
  const target = selectedNode ?? focusNode;

  if (!target) return "";

  const lines: string[] = [];

  // Header with trust level
  const trustLabel = target.confidenceScore >= 0.5 ? "Ready" : "Needs data";
  lines.push(`# Blast Radius Report — ${target.displayName}`);
  lines.push(`**Trust level**: ${trustLabel}`);
  lines.push(`**Organization**: ${orgName}`);
  lines.push(`**Generated**: ${new Date().toISOString()}`);
  lines.push("");

  if (target.confidenceScore < 0.5) {
    lines.push(
      "> **Notice**: This report is based on incomplete operational data."
    );
    lines.push(
      `> Missing fields: ${target.missingFields.join(", ") || "unknown"}`
    );
    lines.push("");
  }

  // Summary
  lines.push("## Summary");
  lines.push(`- **Focus**: ${target.displayName} (${target.kind})`);
  lines.push(`- **Owner**: ${target.ownerName || "unassigned"}`);
  lines.push(`- **Impact score**: ${target.impactScore}/100`);
  lines.push(`- **Confidence**: ${Math.round(target.confidenceScore * 100)}%`);
  lines.push(`- **Subgraph size**: ${data.meta.subgraphSize} nodes`);
  lines.push("");

  // Impacted nodes by env
  const prodNodes = data.nodes.filter((n) => n.envPresence.production);
  const stagingNodes = data.nodes.filter((n) => n.envPresence.staging);
  const devNodes = data.nodes.filter((n) => n.envPresence.development);

  lines.push("## Impact by environment");
  lines.push(`- **Production**: ${prodNodes.length} services`);
  lines.push(`- **Staging**: ${stagingNodes.length} services`);
  lines.push(`- **Development**: ${devNodes.length} services`);
  lines.push("");

  // Impacted owners
  const ownerCounts = new Map<string, number>();
  for (const node of data.nodes) {
    if (node.ownerName) {
      ownerCounts.set(
        node.ownerName,
        (ownerCounts.get(node.ownerName) ?? 0) + 1
      );
    }
  }

  if (ownerCounts.size > 0) {
    lines.push("## Impacted owners");
    const sorted = [...ownerCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [owner, count] of sorted) {
      lines.push(`- **${owner}**: ${count} node${count !== 1 ? "s" : ""}`);
    }
    lines.push("");
  }

  // Top impacted prod nodes
  const topProd = [...prodNodes]
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 10);

  if (topProd.length > 0) {
    lines.push("## Top impacted production services");
    for (const node of topProd) {
      lines.push(
        `- ${node.displayName} (impact: ${node.impactScore}, owner: ${node.ownerName || "unassigned"})`
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadBlastReport(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
