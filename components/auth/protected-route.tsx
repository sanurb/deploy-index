// components/auth/protected-route.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db";

interface ProtectedRouteProps {
  readonly children: React.ReactNode;
}

const AUTH_PREFIX = "/auth/";
const ACCOUNT_PREFIX = "/account/";
const ORG_PREFIX = "/organization/";

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith(AUTH_PREFIX);
}

function isAccountRoute(pathname: string): boolean {
  return pathname.startsWith(ACCOUNT_PREFIX);
}

function isOrgRoute(pathname: string): boolean {
  return pathname.startsWith(ORG_PREFIX);
}

function getSlugFromOrgPath(pathname: string): string | null {
  if (!isOrgRoute(pathname)) return null;
  const rest = pathname.slice(ORG_PREFIX.length);
  const slug = rest.split("/")[0]?.trim();
  return slug && slug.length > 0 ? slug : null;
}

type ActiveOrgShape = {
  readonly id?: string;
  readonly slug?: string;
  readonly name?: string;
  readonly logo?: string;
} | null;

type SessionDataShape =
  | {
      readonly session?: {
        readonly activeOrganizationId?: string;
      };
      readonly activeOrganization?: ActiveOrgShape;
      readonly organization?: ActiveOrgShape;
      readonly activeOrganizationId?: string;
      readonly activeOrganizationSlug?: string;
    }
  | null
  | undefined;

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function extractActiveOrgSlug(sessionData: unknown): string | null {
  const s = sessionData as SessionDataShape;

  const a1 = cleanString(s?.activeOrganization?.slug);
  if (a1) return a1;

  const a2 = cleanString(s?.organization?.slug);
  if (a2) return a2;

  const a3 = cleanString(s?.activeOrganizationSlug);
  if (a3) return a3;

  return null;
}

/**
 * Client-side route protection for the (app) layout.
 *
 * Responsibilities:
 * 1. Redirect unauthenticated users to sign-in
 * 2. Validate org routes have a valid slug
 * 3. Allow account routes without org context
 *
 * Note: Entry point resolution (/app, /dashboard, /) is handled server-side.
 * This component only handles client-side navigation protection.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();
  const { user, isLoading: isAuthLoading } = db.useAuth();

  const isLoading = isSessionPending || isAuthLoading;
  const isAuthenticated = Boolean(sessionData?.session) && Boolean(user);

  const urlSlug = useMemo(() => getSlugFromOrgPath(pathname), [pathname]);
  const sessionSlug = useMemo(
    () => extractActiveOrgSlug(sessionData),
    [sessionData]
  );

  const lastNavRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // Auth routes are always public
    if (isAuthRoute(pathname)) return;

    // Not authenticated => redirect to sign-in with return URL
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/");
      const target = `/auth/sign-in?next=${next}`;
      if (lastNavRef.current !== target) {
        lastNavRef.current = target;
        router.replace(target);
      }
      return;
    }

    // Account routes are allowed without org context
    if (isAccountRoute(pathname)) return;

    // Org route validation: ensure we have a valid slug
    if (isOrgRoute(pathname) && !urlSlug) {
      // Malformed /organization/* without slug - redirect to /app for resolution
      const target = "/app";
      if (lastNavRef.current !== target) {
        lastNavRef.current = target;
        router.replace(target);
      }
      return;
    }

    // For org routes with a valid slug, trust the URL as source of truth
    // The org route layout/page will handle access validation
  }, [isAuthenticated, isLoading, pathname, router, sessionSlug, urlSlug]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="m-auto text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  // Not authenticated - render nothing while redirect happens
  if (!isAuthenticated && !isAuthRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}
