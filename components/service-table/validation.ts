import type { ServiceInterface } from "./types";

/**
 * Validates service name for uniqueness and non-empty value
 */
export function validateName(
  name: string,
  existingServiceNames: readonly string[],
  excludeName?: string
): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Name is required";
  }
  // When editing, exclude the current service name from uniqueness check
  const otherServiceNames = excludeName
    ? existingServiceNames.filter((n) => n !== excludeName)
    : existingServiceNames;
  if (otherServiceNames.includes(trimmed)) {
    return "A service with this name already exists";
  }
  return undefined;
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): string | undefined {
  const trimmed = url.trim();
  if (!trimmed) {
    return "Repository URL is required";
  }
  try {
    new URL(trimmed);
    return undefined;
  } catch {
    return "Please enter a valid URL";
  }
}

/**
 * Validates a service interface for required fields and uniqueness
 */
export function validateServiceInterface(
  iface: ServiceInterface,
  otherInterfaces: readonly ServiceInterface[]
): Partial<Record<keyof ServiceInterface, string>> {
  const errors: Partial<Record<keyof ServiceInterface, string>> = {};

  if (iface.domain.trim()) {
    // Check uniqueness within this service
    const duplicate = otherInterfaces.some(
      (i) => i.domain.trim() === iface.domain.trim() && iface.domain.trim()
    );
    if (duplicate) {
      errors.domain = "Domain must be unique";
    }
  } else {
    errors.domain = "Domain is required";
  }

  if (iface.runtimeType && !iface.runtimeId.trim()) {
    errors.runtimeId = "Runtime ID is required when Runtime Type is set";
  }

  return errors;
}
