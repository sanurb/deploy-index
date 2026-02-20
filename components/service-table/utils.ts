import type { Service } from "@/lib/yaml-utils";
import { ENV_LABELS, ENV_ORDER } from "./constants";
import type { EnvironmentInfo, GroupedService } from "./types";

/**
 * Normalizes environment string to a valid environment type
 */
export function normalizeEnv(
  env: string | null
): "production" | "staging" | "development" | null {
  if (!env) {
    return null;
  }

  const normalized = env.toLowerCase();
  if (normalized === "production" || normalized === "prod") {
    return "production";
  }

  if (normalized === "staging" || normalized === "stage") {
    return "staging";
  }

  if (normalized === "development" || normalized === "dev") {
    return "development";
  }

  return null;
}

/**
 * Sorts environments by criticality order
 */
export function sortEnvironments(
  envs: readonly EnvironmentInfo[]
): readonly EnvironmentInfo[] {
  return [...envs].sort(
    (a, b) => ENV_ORDER.indexOf(a.env) - ENV_ORDER.indexOf(b.env)
  );
}

/**
 * Computes runtime footprint (unique runtime types) from environments
 */
export function computeRuntimeFootprint(
  environments: readonly EnvironmentInfo[]
): readonly string[] {
  const types = new Set<string>();
  for (const env of environments) {
    if (env.runtimeType) {
      types.add(env.runtimeType);
    }
  }
  return Array.from(types).sort();
}

/**
 * Groups services by service name, aggregating interfaces into environments
 */
export function groupServicesByService(
  services: readonly Service[]
): readonly GroupedService[] {
  return services.map((service, serviceIndex) => {
    const environments: EnvironmentInfo[] = [];

    if (service.interfaces && service.interfaces.length > 0) {
      for (const iface of service.interfaces) {
        if (iface.domain && iface.domain.trim().length > 0) {
          const normalizedEnv = normalizeEnv(iface.env);
          const env: "production" | "staging" | "development" =
            normalizedEnv ?? "development";

          environments.push({
            env,
            domain: iface.domain.trim(),
            branch: iface.branch?.trim() ?? null,
            runtimeType: iface.runtime?.type ?? null,
            runtimeId: iface.runtime?.id ?? null,
          });
        }
      }
    }

    const sortedEnvs = sortEnvironments(environments);

    return {
      id: `service-${serviceIndex}`,
      serviceIndex,
      name: service.name,
      owner: service.owner,
      repository: service.repository,
      dependencies: service.dependencies ?? [],
      environments: sortedEnvs,
      domainsCount: sortedEnvs.length,
      runtimeFootprint: computeRuntimeFootprint(sortedEnvs),
    };
  });
}

/**
 * Calculates search score for a service based on query relevance
 */
export function calculateSearchScore(
  service: GroupedService,
  query: string
): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  if (service.name.toLowerCase().includes(lowerQuery)) {
    score += 100;
  }

  if (service.owner.toLowerCase().includes(lowerQuery)) {
    score += 50;
  }

  for (const env of service.environments) {
    if (env.domain.toLowerCase().includes(lowerQuery)) {
      score += 150;
    }

    if (env.branch?.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    if (
      env.env === lowerQuery ||
      ENV_LABELS[env.env].toLowerCase() === lowerQuery
    ) {
      score += 20;
    }

    if (env.runtimeType?.toLowerCase().includes(lowerQuery)) {
      score += 25;
    }
  }

  return score;
}

/**
 * Converts InstantDB services data to GroupedService format for ServiceTable
 */
export function convertServicesToGrouped(
  services: Array<{
    readonly id: string;
    readonly name: string;
    readonly description?: string | null;
    readonly language?: string | null;
    readonly owner: string;
    readonly repository: string;
    readonly interfaces?: Array<{
      readonly domain: string;
      readonly env: string | null;
      readonly branch: string | null;
      readonly runtimeType: string | null;
      readonly runtimeId: string | null;
    }>;
    readonly dependencies?: Array<{
      readonly dependencyName: string;
    }>;
  }>
): readonly GroupedService[] {
  return services.map((service, serviceIndex) => {
    const environments: Array<{
      readonly env: "production" | "staging" | "development";
      readonly domain: string;
      readonly branch: string | null;
      readonly runtimeType: string | null;
      readonly runtimeId: string | null;
    }> = [];

    if (service.interfaces && service.interfaces.length > 0) {
      for (const iface of service.interfaces) {
        if (iface.domain && iface.domain.trim().length > 0) {
          const normalizedEnv = normalizeEnv(iface.env);
          const env: "production" | "staging" | "development" =
            normalizedEnv ?? "development";

          environments.push({
            env,
            domain: iface.domain.trim(),
            branch: iface.branch?.trim() ?? null,
            runtimeType: iface.runtimeType?.trim() ?? null,
            runtimeId: iface.runtimeId?.trim() ?? null,
          });
        }
      }
    }

    const sortedEnvs = sortEnvironments(environments);

    // Parse languages from comma-separated string to array
    const languages =
      service.language && service.language.trim()
        ? service.language
            .split(",")
            .map((lang) => lang.trim())
            .filter(Boolean)
        : [];

    return {
      id: service.id,
      serviceIndex,
      name: service.name,
      description: service.description ?? null,
      languages: languages.length > 0 ? languages : undefined,
      owner: service.owner,
      repository: service.repository,
      dependencies: service.dependencies?.map((d) => d.dependencyName) ?? [],
      environments: sortedEnvs,
      domainsCount: sortedEnvs.length,
      runtimeFootprint: computeRuntimeFootprint(sortedEnvs),
    };
  });
}
