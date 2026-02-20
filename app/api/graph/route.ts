import { NextResponse } from "next/server";
import { adminDb } from "@/lib/auth";
import { computeSubgraph, NotFoundError } from "@/lib/graph/compute-subgraph";
import type { GraphResponse } from "@/types/graph";
import { graphQuerySchema } from "@/types/graph";

// ---------------------------------------------------------------------------
// Server-side response cache (30s TTL)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000;

const responseCache = new Map<
  string,
  { response: GraphResponse; timestamp: number }
>();

function getCached(queryHash: string): GraphResponse | null {
  const entry = responseCache.get(queryHash);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    responseCache.delete(queryHash);
    return null;
  }
  return entry.response;
}

function setCache(queryHash: string, response: GraphResponse) {
  // Evict stale entries periodically
  if (responseCache.size > 100) {
    const now = Date.now();
    for (const [key, entry] of responseCache) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        responseCache.delete(key);
      }
    }
  }
  responseCache.set(queryHash, { response, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// GET /api/graph
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const parsed = graphQuerySchema.safeParse({
    organizationId: searchParams.get("organizationId"),
    focusKind: searchParams.get("focusKind"),
    focusId: searchParams.get("focusId"),
    hops: searchParams.get("hops"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { organizationId, focusKind, focusId, hops } = parsed.data;

  // Check cache first (build hash from params)
  const cacheKey = `${organizationId}:${focusKind}:${focusId}:${hops}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const response = await computeSubgraph(
      adminDb as never,
      organizationId,
      focusKind,
      focusId,
      hops
    );

    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("[Graph API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
