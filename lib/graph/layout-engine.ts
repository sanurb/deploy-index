import type { GraphLayout, GraphNode, NodePosition } from "@/types/graph";

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32)
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashToSeed(queryHash: string): number {
  let h = 0;
  for (let i = 0; i < queryHash.length; i++) {
    h = (Math.imul(31, h) + queryHash.charCodeAt(i)) | 0;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Ring radii by hop distance
// ---------------------------------------------------------------------------

const RING_RADII = [0, 4, 8, 13, 19, 26];

// ---------------------------------------------------------------------------
// Y-axis offsets by env presence
// ---------------------------------------------------------------------------

function envYOffset(node: GraphNode): number {
  if (node.envPresence.production) return 1.5;
  if (node.envPresence.staging) return 0;
  return -1.5;
}

// ---------------------------------------------------------------------------
// Deterministic layout computation
// ---------------------------------------------------------------------------

export function computeLayout(
  nodes: readonly GraphNode[],
  queryHash: string
): GraphLayout {
  if (nodes.length === 0) {
    return { positions: [], queryHash };
  }

  const rng = mulberry32(hashToSeed(queryHash));

  // Collect unique owners sorted alphabetically
  const ownerSet = new Set<string>();
  for (const node of nodes) {
    ownerSet.add(node.ownerName || "__none__");
  }
  const owners = [...ownerSet].sort();
  const ownerSlotCount = Math.max(owners.length, 8);
  const ownerIndexMap = new Map<string, number>();
  for (let i = 0; i < owners.length; i++) {
    ownerIndexMap.set(owners[i], i);
  }

  // Group nodes by (hopDistance, owner) for slot subdivision
  const slotCounters = new Map<string, number>();

  const positions: NodePosition[] = [];

  for (const node of nodes) {
    const hop = Math.min(node.hopDistance, RING_RADII.length - 1);
    const radius = RING_RADII[hop];

    if (radius === 0) {
      // Focus node at origin
      positions.push({ nodeId: node.nodeId, x: 0, y: 0, z: 0 });
      continue;
    }

    const ownerKey = node.ownerName || "__none__";
    const ownerIdx = ownerIndexMap.get(ownerKey) ?? 0;

    // Subdivide slot for multiple nodes at same hop+owner
    const slotKey = `${hop}:${ownerKey}`;
    const subIdx = slotCounters.get(slotKey) ?? 0;
    slotCounters.set(slotKey, subIdx + 1);

    const slotAngle = (2 * Math.PI) / ownerSlotCount;
    const baseAngle = ownerIdx * slotAngle;
    const subOffset = subIdx * (slotAngle / Math.max(subIdx + 2, 3));
    const angle = baseAngle + subOffset;

    // Jitter
    const jx = (rng() - 0.5) * 0.6;
    const jz = (rng() - 0.5) * 0.6;

    const x = Math.cos(angle) * radius + jx;
    const z = Math.sin(angle) * radius + jz;
    const y = envYOffset(node);

    positions.push({ nodeId: node.nodeId, x, y, z });
  }

  // Relaxation: 3 passes, push apart nodes closer than 1.2 units
  const MIN_DIST = 1.2;
  const MAX_DISPLACEMENT = 0.5;

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < MIN_DIST && dist > 0.001) {
          const push = ((MIN_DIST - dist) / 2) * 0.5;
          const nx = (dx / dist) * Math.min(push, MAX_DISPLACEMENT);
          const ny = (dy / dist) * Math.min(push, MAX_DISPLACEMENT);
          const nz = (dz / dist) * Math.min(push, MAX_DISPLACEMENT);

          // Mutate positions array (we own it)
          (positions[i] as { x: number; y: number; z: number }).x -= nx;
          (positions[i] as { x: number; y: number; z: number }).y -= ny;
          (positions[i] as { x: number; y: number; z: number }).z -= nz;
          (positions[j] as { x: number; y: number; z: number }).x += nx;
          (positions[j] as { x: number; y: number; z: number }).y += ny;
          (positions[j] as { x: number; y: number; z: number }).z += nz;
        }
      }
    }
  }

  return { positions, queryHash };
}
