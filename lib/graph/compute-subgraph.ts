import { createHash } from "node:crypto";
import type {
  GraphEdge,
  GraphNode,
  GraphResponse,
  GraphResponseMeta,
} from "@/types/graph";
import { NODE_LIMIT } from "@/types/graph";
import {
  computeColorKey,
  computeCompletenessScore,
  computeConfidenceScore,
  computeDepId,
  computeImpactScore,
  computeRuntimeId,
} from "./scoring";

// ---------------------------------------------------------------------------
// Raw DB types (from InstantDB query)
// ---------------------------------------------------------------------------

interface RawService {
  id: string;
  name: string;
  description?: string | null;
  language?: string | null;
  owner: string;
  repository: string;
  organizationId: string;
}

interface RawInterface {
  id: string;
  domain: string;
  env: string;
  branch?: string | null;
  runtimeType?: string | null;
  runtimeId?: string | null;
  serviceId: string;
}

interface RawDependency {
  id: string;
  dependencyName: string;
  serviceId: string;
}

// ---------------------------------------------------------------------------
// Internal adjacency structures
// ---------------------------------------------------------------------------

interface InternalNode {
  nodeId: string;
  kind: "software" | "dependency" | "runtime";
  displayName: string;
  ownerId: string;
  ownerName: string;
  envPresence: { production: boolean; staging: boolean; development: boolean };
  prodInterfaceCount: number;
  totalInterfaceCount: number;
  description?: string | null;
  language?: string | null;
  repository?: string;
  hasInterfaces: boolean;
}

interface InternalEdge {
  fromId: string;
  toId: string;
  strength: "confirmed" | "declared";
  envScope: "production" | "staging" | "development" | "cross-env";
  weight: number;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export async function computeSubgraph(
  adminDb: {
    query: (q: Record<string, unknown>) => Promise<Record<string, unknown[]>>;
  },
  organizationId: string,
  focusKind: string,
  focusId: string,
  hops: number
): Promise<GraphResponse> {
  const start = performance.now();

  // 1. Query all services + dependencies + interfaces for the org
  const result = await adminDb.query({
    services: {
      $: { where: { organizationId } },
      interfaces: {},
      dependencies: {},
    },
  });

  const rawServices = (result.services ?? []) as Array<
    RawService & {
      interfaces?: RawInterface[];
      dependencies?: RawDependency[];
    }
  >;

  // Build name→serviceId map for dependency resolution
  const nameToServiceIds = new Map<string, string[]>();
  for (const svc of rawServices) {
    const key = svc.name.toLowerCase().trim();
    const existing = nameToServiceIds.get(key) ?? [];
    existing.push(svc.id);
    nameToServiceIds.set(key, existing);
  }

  // 2. Build adjacency structures
  const nodeMap = new Map<string, InternalNode>();
  const edgeList: InternalEdge[] = [];
  const adjacency = new Map<string, Set<string>>();

  const addAdjacency = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    adjacency.get(a)!.add(b);
    adjacency.get(b)!.add(a);
  };

  for (const svc of rawServices) {
    const interfaces = svc.interfaces ?? [];
    const hasProd = interfaces.some((i) => i.env === "production");
    const hasStaging = interfaces.some((i) => i.env === "staging");
    const hasDev = interfaces.some((i) => i.env === "development");
    const prodCount = interfaces.filter((i) => i.env === "production").length;

    nodeMap.set(svc.id, {
      nodeId: svc.id,
      kind: "software",
      displayName: svc.name,
      ownerId: svc.id,
      ownerName: svc.owner || "",
      envPresence: {
        production: hasProd,
        staging: hasStaging,
        development: hasDev,
      },
      prodInterfaceCount: prodCount,
      totalInterfaceCount: interfaces.length,
      description: svc.description,
      language: svc.language,
      repository: svc.repository,
      hasInterfaces: interfaces.length > 0,
    });

    // Process dependencies
    const deps = svc.dependencies ?? [];
    for (const dep of deps) {
      const depNameKey = dep.dependencyName.toLowerCase().trim();
      const matchedIds = nameToServiceIds.get(depNameKey) ?? [];

      if (matchedIds.length === 1) {
        // Exact single match → edge to that service
        const targetId = matchedIds[0];
        edgeList.push({
          fromId: svc.id,
          toId: targetId,
          strength: "declared",
          envScope: "cross-env",
          weight: 1,
        });
        addAdjacency(svc.id, targetId);
      } else {
        // Zero or multiple matches → virtual dependency node
        const depNodeId = computeDepId(dep.dependencyName);
        if (!nodeMap.has(depNodeId)) {
          nodeMap.set(depNodeId, {
            nodeId: depNodeId,
            kind: "dependency",
            displayName: dep.dependencyName,
            ownerId: "",
            ownerName: "",
            envPresence: {
              production: false,
              staging: false,
              development: false,
            },
            prodInterfaceCount: 0,
            totalInterfaceCount: 0,
            hasInterfaces: false,
          });
        }
        edgeList.push({
          fromId: svc.id,
          toId: depNodeId,
          strength: "declared",
          envScope: "cross-env",
          weight: 1,
        });
        addAdjacency(svc.id, depNodeId);
      }
    }

    // Process unique runtimes
    const runtimeTypes = new Set<string>();
    for (const iface of interfaces) {
      if (iface.runtimeType && !runtimeTypes.has(iface.runtimeType)) {
        runtimeTypes.add(iface.runtimeType);
        const rtNodeId = computeRuntimeId(iface.runtimeType);
        if (!nodeMap.has(rtNodeId)) {
          nodeMap.set(rtNodeId, {
            nodeId: rtNodeId,
            kind: "runtime",
            displayName: iface.runtimeType,
            ownerId: "",
            ownerName: "",
            envPresence: {
              production: false,
              staging: false,
              development: false,
            },
            prodInterfaceCount: 0,
            totalInterfaceCount: 0,
            hasInterfaces: false,
          });
        }
        edgeList.push({
          fromId: svc.id,
          toId: rtNodeId,
          strength: "confirmed",
          envScope: iface.env as InternalEdge["envScope"],
          weight: 1,
        });
        addAdjacency(svc.id, rtNodeId);
      }
    }
  }

  // 3. Resolve focus node
  let focusNodeId: string | null = null;

  if (focusKind === "service") {
    if (nodeMap.has(focusId)) {
      focusNodeId = focusId;
    }
  } else if (focusKind === "domain") {
    // Find service by domain
    for (const svc of rawServices) {
      const interfaces = svc.interfaces ?? [];
      for (const iface of interfaces) {
        if (iface.domain === focusId) {
          focusNodeId = svc.id;
          break;
        }
      }
      if (focusNodeId) break;
    }
  } else if (focusKind === "dependency") {
    if (nodeMap.has(focusId)) {
      focusNodeId = focusId;
    }
  }

  if (!focusNodeId) {
    throw new NotFoundError("Focus node not found");
  }

  // 4. BFS from focus
  const visited = new Map<string, number>(); // nodeId → hopDistance
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: focusNodeId, depth: 0 },
  ];
  visited.set(focusNodeId, 0);
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= hops) continue;

    const neighbors = adjacency.get(current.nodeId);
    if (!neighbors) continue;

    for (const neighborId of neighbors) {
      if (visited.has(neighborId)) continue;

      if (visited.size >= NODE_LIMIT) {
        truncated = true;
        break;
      }

      visited.set(neighborId, current.depth + 1);
      queue.push({ nodeId: neighborId, depth: current.depth + 1 });
    }

    if (truncated) break;
  }

  // 5. Build output nodes with scoring
  const nameCount = new Map<string, number>();
  for (const [, node] of nodeMap) {
    if (node.kind === "software") {
      const key = node.displayName.toLowerCase().trim();
      nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
    }
  }

  // Count dependency degree for nodes in the subgraph
  const degreeMap = new Map<string, number>();
  for (const edge of edgeList) {
    if (visited.has(edge.fromId) && visited.has(edge.toId)) {
      degreeMap.set(edge.fromId, (degreeMap.get(edge.fromId) ?? 0) + 1);
      degreeMap.set(edge.toId, (degreeMap.get(edge.toId) ?? 0) + 1);
    }
  }

  const outputNodes: GraphNode[] = [];
  for (const [nodeId, hopDistance] of visited) {
    const internal = nodeMap.get(nodeId);
    if (!internal) continue;

    const degree = degreeMap.get(nodeId) ?? 0;
    const isNameUnique =
      internal.kind === "software"
        ? (nameCount.get(internal.displayName.toLowerCase().trim()) ?? 0) <= 1
        : true;

    const hasProdDomains =
      internal.envPresence.production && internal.prodInterfaceCount > 0;

    const confidence = computeConfidenceScore({
      hasOwner: Boolean(internal.ownerName),
      hasRepository: Boolean(internal.repository),
      hasProdInterfaces: internal.envPresence.production,
      hasAnyInterfaces: internal.hasInterfaces,
      isNameUnique,
      hasValidProdDomains: hasProdDomains,
    });

    const completeness = computeCompletenessScore({
      hasDescription: Boolean(internal.description),
      hasLanguage: Boolean(internal.language),
      hasInterfaces: internal.hasInterfaces,
    });

    outputNodes.push({
      nodeId,
      kind: internal.kind,
      displayName: internal.displayName,
      ownerId: internal.ownerId,
      ownerName: internal.ownerName,
      envPresence: internal.envPresence,
      prodInterfaceCount: internal.prodInterfaceCount,
      totalInterfaceCount: internal.totalInterfaceCount,
      dependencyDegree: degree,
      hopDistance,
      impactScore: computeImpactScore(
        internal.prodInterfaceCount,
        degree,
        hopDistance,
        hops
      ),
      confidenceScore: confidence.score,
      completenessScore: completeness.score,
      missingFields: confidence.missingFields,
      colorKey: computeColorKey(internal.ownerName),
    });
  }

  // 6. Filter edges to subgraph
  const outputEdges: GraphEdge[] = [];
  for (const edge of edgeList) {
    if (visited.has(edge.fromId) && visited.has(edge.toId)) {
      outputEdges.push(edge);
    }
  }

  // 7. Compute query hash
  const queryHash = createHash("sha256")
    .update(`${organizationId}:${focusKind}:${focusId}:${hops}`)
    .digest("hex")
    .slice(0, 16);

  const computeTimeMs = Math.round(performance.now() - start);

  const meta: GraphResponseMeta = {
    totalServicesInOrg: rawServices.length,
    subgraphSize: outputNodes.length,
    computeTimeMs,
    nodeLimit: NODE_LIMIT,
  };

  return {
    focusNodeId,
    nodes: outputNodes,
    edges: outputEdges,
    queryHash,
    truncated,
    meta,
  };
}

// ---------------------------------------------------------------------------
// Custom error for 404
// ---------------------------------------------------------------------------

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
