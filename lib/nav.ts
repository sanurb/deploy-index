/**
 * Determines if a route is active based on the current pathname.
 *
 * @param pathname - Current pathname from router
 * @param href - Route href to check against
 * @returns true if the route is active
 *
 * @example
 * // Root dashboard must match exactly
 * isRouteActive("/dashboard/services", "/dashboard") // false
 * isRouteActive("/dashboard", "/dashboard") // true
 *
 * // Other routes match exactly or as parent
 * isRouteActive("/dashboard/services", "/dashboard/services") // true
 * isRouteActive("/dashboard/services/123", "/dashboard/services") // true
 */
export function isRouteActive(pathname: string | null, href: string): boolean {
  if (!pathname) {
    return false;
  }

  // Root dashboard item must be exact match only
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  // All other items are active when exact or nested
  return pathname === href || pathname.startsWith(`${href}/`);
}
