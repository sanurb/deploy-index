/**
 * Filter Utilities
 *
 * Pure functions for filter state management and transformation.
 * Enforces invariants and provides type-safe operations for the filter system.
 *
 * Responsibilities:
 * - Filter field metadata and configuration
 * - Value formatting and display labels
 * - Filter state transformations
 * - Summary text generation for chips
 */

import { ENV_LABELS } from "@/components/service-table/constants";
import type { Environment } from "@/hooks/use-services-query-state";
import type {
  FilterFieldMetadata,
  FilterFieldType,
  FilterOperator,
  FilterValueOption,
} from "@/types/filters";

/**
 * Metadata for all supported filter fields.
 * Defines display labels, plural forms, and multi-select support.
 */
const FILTER_FIELD_METADATA: Readonly<
  Record<FilterFieldType, FilterFieldMetadata>
> = {
  env: {
    field: "env",
    label: "Environment",
    pluralLabel: "environments",
    supportsMultiSelect: true,
  },
  owner: {
    field: "owner",
    label: "Owner",
    pluralLabel: "owners",
    supportsMultiSelect: true,
  },
  runtime: {
    field: "runtime",
    label: "Runtime",
    pluralLabel: "runtimes",
    supportsMultiSelect: true,
  },
} as const;

/**
 * Order in which filter fields should appear in the UI.
 * Stable order ensures consistent chip placement.
 */
const FILTER_FIELD_DISPLAY_ORDER: readonly FilterFieldType[] = [
  "env",
  "runtime",
  "owner",
] as const;

/**
 * Returns metadata for a specific filter field.
 *
 * @param field - Filter field type
 * @returns Field metadata including labels and capabilities
 */
export function getFilterFieldMetadata(
  field: FilterFieldType
): FilterFieldMetadata {
  return FILTER_FIELD_METADATA[field];
}

/**
 * Returns all filter field metadata in display order.
 *
 * @returns Array of field metadata ordered for UI display
 */
export function getAllFilterFieldMetadata(): readonly FilterFieldMetadata[] {
  return FILTER_FIELD_DISPLAY_ORDER.map(
    (field) => FILTER_FIELD_METADATA[field]
  );
}

/**
 * Determines the appropriate operator based on value count.
 *
 * @param valueCount - Number of selected values
 * @returns "is" for single value, "is-any-of" for multiple
 */
export function getOperatorForValueCount(valueCount: number): FilterOperator {
  return valueCount === 1 ? "is" : "is-any-of";
}

/**
 * Formats a single environment value for display.
 *
 * @param env - Environment value
 * @returns Display label (e.g., "PROD", "STAGE", "DEV")
 */
export function formatEnvironmentLabel(env: Environment): string {
  return ENV_LABELS[env];
}

/**
 * Generates environment filter value options.
 *
 * @returns Array of environment options with display labels and search terms
 */
export function getEnvironmentOptions(): readonly FilterValueOption[] {
  const environments: readonly Environment[] = [
    "production",
    "staging",
    "development",
  ];

  return environments.map((env) => ({
    value: env,
    displayLabel: formatEnvironmentLabel(env),
    searchTerms: [env, formatEnvironmentLabel(env).toLowerCase()],
  }));
}

/**
 * Generates owner filter value options from available owners.
 *
 * @param availableOwners - List of owner identifiers
 * @returns Array of owner options with display labels
 */
export function getOwnerOptions(
  availableOwners: readonly string[]
): readonly FilterValueOption[] {
  return availableOwners.map((owner) => ({
    value: owner,
    displayLabel: owner,
    searchTerms: [owner.toLowerCase()],
  }));
}

/**
 * Generates runtime filter value options from available runtimes.
 *
 * @param availableRuntimes - List of runtime identifiers
 * @returns Array of runtime options with display labels
 */
export function getRuntimeOptions(
  availableRuntimes: readonly string[]
): readonly FilterValueOption[] {
  return availableRuntimes.map((runtime) => ({
    value: runtime,
    displayLabel: runtime,
    searchTerms: [runtime.toLowerCase()],
  }));
}

/**
 * Filters value options based on search query.
 * Case-insensitive prefix matching against search terms.
 *
 * @param options - Available value options
 * @param searchQuery - User's search input
 * @returns Filtered options matching the search query
 */
export function filterValueOptions(
  options: readonly FilterValueOption[],
  searchQuery: string
): readonly FilterValueOption[] {
  if (searchQuery.trim().length === 0) {
    return options;
  }

  const normalizedQuery = searchQuery.toLowerCase().trim();

  return options.filter((option) =>
    option.searchTerms.some((term) => term.startsWith(normalizedQuery))
  );
}

/**
 * Generates display text for filter chip value segment.
 *
 * Single value: Shows the value display label
 * Multiple values: Shows count + plural field label (e.g., "3 environments")
 *
 * @param field - Filter field type
 * @param values - Selected filter values
 * @returns Formatted display text for chip
 */
export function generateChipValueDisplay(
  field: FilterFieldType,
  values: readonly string[]
): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    const singleValue = values[0];
    if (field === "env") {
      return formatEnvironmentLabel(singleValue as Environment);
    }
    return singleValue;
  }

  const metadata = getFilterFieldMetadata(field);
  return `${values.length} ${metadata.pluralLabel}`;
}

/**
 * Checks if a search query matches any search terms for an option.
 * Used for typeahead filtering in the filter builder.
 *
 * @param option - Value option to check
 * @param query - Search query string
 * @returns True if option matches the query
 */
export function optionMatchesQuery(
  option: FilterValueOption,
  query: string
): boolean {
  if (query.trim().length === 0) {
    return true;
  }

  const normalizedQuery = query.toLowerCase().trim();
  return option.searchTerms.some((term) => term.includes(normalizedQuery));
}
