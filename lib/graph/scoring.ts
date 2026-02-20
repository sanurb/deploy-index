import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Impact Score (0–100)
// ---------------------------------------------------------------------------

export function computeImpactScore(
  prodInterfaceCount: number,
  dependencyDegree: number,
  hopDistance: number,
  maxHops: number
): number {
  const raw =
    prodInterfaceCount * 40 +
    dependencyDegree * 30 +
    ((maxHops - hopDistance) / Math.max(maxHops, 1)) * 30;
  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ---------------------------------------------------------------------------
// Confidence Score — operational profile only
// ---------------------------------------------------------------------------

export interface ConfidenceResult {
  readonly score: number;
  readonly missingFields: readonly string[];
}

export function computeConfidenceScore(opts: {
  hasOwner: boolean;
  hasRepository: boolean;
  hasProdInterfaces: boolean;
  hasAnyInterfaces: boolean;
  isNameUnique: boolean;
  hasValidProdDomains: boolean;
}): ConfidenceResult {
  let score = 1.0;
  const missing: string[] = [];

  if (!opts.hasOwner) {
    score -= 0.25;
    missing.push("owner");
  }

  if (!opts.hasRepository) {
    score -= 0.2;
    missing.push("repository");
  }

  if (opts.hasProdInterfaces && !opts.hasOwner) {
    score -= 0.3;
    missing.push("production-owner");
  }

  if (opts.hasAnyInterfaces && !opts.hasProdInterfaces) {
    score -= 0.15;
    missing.push("production-interface");
  }

  if (!opts.isNameUnique) {
    score -= 0.1;
    missing.push("unique-name");
  }

  if (opts.hasProdInterfaces && !opts.hasValidProdDomains) {
    score -= 0.15;
    missing.push("valid-production-domains");
  }

  return { score: Math.max(0, score), missingFields: missing };
}

// ---------------------------------------------------------------------------
// Completeness Score — broader data quality
// ---------------------------------------------------------------------------

export interface CompletenessResult {
  readonly score: number;
  readonly incompleteFields: readonly string[];
}

export function computeCompletenessScore(opts: {
  hasDescription: boolean;
  hasLanguage: boolean;
  hasInterfaces: boolean;
}): CompletenessResult {
  let score = 1.0;
  const incomplete: string[] = [];

  if (!opts.hasDescription) {
    score -= 0.15;
    incomplete.push("description");
  }

  if (!opts.hasLanguage) {
    score -= 0.1;
    incomplete.push("language");
  }

  if (!opts.hasInterfaces) {
    score -= 0.2;
    incomplete.push("interfaces");
  }

  return { score: Math.max(0, score), incompleteFields: incomplete };
}

// ---------------------------------------------------------------------------
// Color Key — deterministic hash of owner name
// ---------------------------------------------------------------------------

export function computeColorKey(ownerName: string): string {
  if (!ownerName) return "94a3b8";
  return createHash("sha1")
    .update(ownerName.toLowerCase().trim())
    .digest("hex")
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// Dependency ID — stable synthetic ID
// ---------------------------------------------------------------------------

export function computeDepId(dependencyName: string): string {
  const hash = createHash("sha1")
    .update(dependencyName.toLowerCase().trim())
    .digest("hex");
  return `dep:${hash}`;
}

export function computeRuntimeId(runtimeType: string): string {
  const hash = createHash("sha1")
    .update(runtimeType.toLowerCase().trim())
    .digest("hex");
  return `rt:${hash}`;
}
