/**
 * Filter Domain Types
 *
 * Core types for the two-layer filter architecture matching Linear's approach:
 * - Layer 1: Global search (free text only)
 * - Layer 2: Structured filters (chips + builder)
 */

import type { Environment } from "@/hooks/use-services-query-state";

/**
 * Filter field types supported by the filter builder.
 * Maps to structured filter dimensions in the data model.
 */
export type FilterFieldType = "env" | "owner" | "runtime";

/**
 * Filter operator for value matching.
 * - is: Single value match
 * - is-any-of: Multi-value match (OR condition)
 */
export type FilterOperator = "is" | "is-any-of";

/**
 * Match mode determines how multiple filters are combined.
 * - all: AND condition (match all filters)
 * - any: OR condition (match any filter)
 */
export type FilterMatchMode = "all" | "any";

/**
 * Single filter definition with field, operator, and values.
 *
 * Invariants:
 * - values array must have at least one element
 * - operator "is" must have exactly one value
 * - operator "is-any-of" must have two or more values
 */
export interface FilterDefinition {
  readonly field: FilterFieldType;
  readonly operator: FilterOperator;
  readonly values: readonly string[];
}

/**
 * Complete filter state for the services table.
 *
 * Invariants:
 * - env values must be valid Environment types
 * - All arrays are deduplicated
 * - Empty arrays indicate no filter for that field
 */
export interface FilterState {
  readonly env: readonly Environment[];
  readonly owner: readonly string[];
  readonly runtime: readonly string[];
  readonly matchMode: FilterMatchMode;
}

/**
 * Filter field metadata for display and behavior.
 */
export interface FilterFieldMetadata {
  readonly field: FilterFieldType;
  readonly label: string;
  readonly pluralLabel: string;
  readonly supportsMultiSelect: boolean;
}

/**
 * Available values for a filter field.
 * Used to populate the filter builder value list.
 */
export interface FilterFieldValues {
  readonly field: FilterFieldType;
  readonly values: readonly FilterValueOption[];
}

/**
 * Single value option in the filter builder.
 */
export interface FilterValueOption {
  readonly value: string;
  readonly displayLabel: string;
  readonly searchTerms: readonly string[];
}
