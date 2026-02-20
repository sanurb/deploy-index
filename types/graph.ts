import { z } from "zod";

// ---------------------------------------------------------------------------
// Focus Reference — typed, no heuristic matching
// ---------------------------------------------------------------------------

const focusKinds = ["service", "domain", "dependency"] as const;
export type FocusKind = (typeof focusKinds)[number];

export interface FocusRef {
  readonly kind: FocusKind;
  readonly id: string;
  readonly displayName: string;
}

// ---------------------------------------------------------------------------
// Graph Node
// ---------------------------------------------------------------------------

export type NodeKind = "software" | "dependency" | "runtime";

export interface GraphNode {
  readonly nodeId: string;
  readonly kind: NodeKind;
  readonly displayName: string;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly envPresence: {
    production: boolean;
    staging: boolean;
    development: boolean;
  };
  readonly prodInterfaceCount: number;
  readonly totalInterfaceCount: number;
  readonly dependencyDegree: number;
  readonly hopDistance: number;
  readonly impactScore: number;
  readonly confidenceScore: number;
  readonly completenessScore: number;
  readonly missingFields: readonly string[];
  readonly colorKey: string;
}

// ---------------------------------------------------------------------------
// Graph Edge
// ---------------------------------------------------------------------------

export type EdgeStrength = "confirmed" | "declared";
export type EnvScope = "production" | "staging" | "development" | "cross-env";

export interface GraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly strength: EdgeStrength;
  readonly envScope: EnvScope;
  readonly weight: number;
}

// ---------------------------------------------------------------------------
// API Contract — Query params
// ---------------------------------------------------------------------------

export const graphQuerySchema = z.object({
  organizationId: z.string().min(1),
  focusKind: z.enum(focusKinds),
  focusId: z.string().min(1),
  hops: z.coerce.number().int().min(1).max(5).default(3),
});

export type GraphQueryParams = z.infer<typeof graphQuerySchema>;

// ---------------------------------------------------------------------------
// API Contract — Response
// ---------------------------------------------------------------------------

export interface GraphResponseMeta {
  readonly totalServicesInOrg: number;
  readonly subgraphSize: number;
  readonly computeTimeMs: number;
  readonly nodeLimit: number;
}

export interface GraphResponse {
  readonly focusNodeId: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly queryHash: string;
  readonly truncated: boolean;
  readonly meta: GraphResponseMeta;
}

// ---------------------------------------------------------------------------
// Layout (client-side)
// ---------------------------------------------------------------------------

export interface NodePosition {
  readonly nodeId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GraphLayout {
  readonly positions: readonly NodePosition[];
  readonly queryHash: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NODE_LIMIT = 300;
export const DEFAULT_HOPS = 3;
export const MAX_HOPS = 5;
