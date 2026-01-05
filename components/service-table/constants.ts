/**
 * Environment order by criticality (most critical first)
 */
export const ENV_ORDER: readonly ["production", "staging", "development"] = [
  "production",
  "staging",
  "development",
];

/**
 * Environment labels for display
 */
export const ENV_LABELS = {
  production: "PROD",
  staging: "STAGE",
  development: "DEV",
} as const;

/**
 * Runtime type labels for display
 */
export const RUNTIME_LABELS: Readonly<Record<string, string>> = {
  ec2: "EC2",
  vm: "VM",
  k8s: "K8S",
  lambda: "λ",
  container: "CTR",
  paas: "PAAS",
} as const;

/**
 * Table configuration constants
 */
export const TABLE_ID = "services" as const;
export const NON_CLICKABLE_COLUMNS = new Set(["actions"]);
