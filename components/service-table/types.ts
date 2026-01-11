/**
 * Environment information extracted from service interfaces
 */
export interface EnvironmentInfo {
  readonly env: "production" | "staging" | "development";
  readonly domain: string;
  readonly branch: string | null;
  readonly runtimeType: string | null;
  readonly runtimeId: string | null;
}

/**
 * Grouped service with aggregated environment and runtime data
 */
export interface GroupedService {
  readonly id: string;
  readonly serviceIndex: number;
  readonly name: string;
  readonly owner: string;
  readonly repository: string;
  readonly dependencies: readonly string[];
  readonly environments: readonly EnvironmentInfo[];
  readonly domainsCount: number;
  readonly runtimeFootprint: readonly string[];
}

/**
 * Props for the main ServiceTable component
 */
export interface ServiceTableProps {
  readonly yamlContent?: string;
  readonly services?: readonly GroupedService[];
  readonly initialSearchQuery?: string;
  readonly onSearchChange?: (query: string) => void;
  readonly showHeader?: boolean;
  readonly onEdit?: (service: GroupedService) => void;
  readonly onDelete?: (service: GroupedService) => void;
}

/**
 * Service interface for form data
 */
export interface ServiceInterface {
  readonly id: string;
  readonly domain: string;
  readonly env: string;
  readonly branch: string;
  readonly runtimeType: string;
  readonly runtimeId: string;
}

/**
 * Service dependency for form data
 */
export interface ServiceDependency {
  readonly id: string;
  readonly name: string;

/**
 * Form data for creating/editing a service
 */
export interface CreateServiceFormData {
  readonly name: string;
  readonly owner: string;
  readonly repository: string;
  readonly interfaces: readonly ServiceInterface[];
  readonly dependencies: readonly ServiceDependency[];
}
