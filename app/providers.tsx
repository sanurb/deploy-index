"use client";

import { useInstantAuth } from "@daveyplate/better-auth-instantdb";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useInstantOptions } from "@daveyplate/better-auth-ui/instantdb";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db";

/**
 * Detects if a navigation path is an org mutation redirect that should go through
 * canonical resolution. This includes:
 * - Direct navigation to /organization/{slug} after org creation
 * - Navigation to /account/organizations after org deletion
 */
function shouldUseCanonicalResolution(
  path: string,
  currentPath: string
): boolean {
  // After org deletion: redirect to /account/organizations should go to /app
  if (path.includes("/account/") && path.includes("organizations")) {
    return true;
  }

  // After org creation: direct navigation to /organization/{slug} from switcher
  // We detect this by checking if we're navigating to a NEW org path
  // (different from current path) that's just the base org path
  const orgPathMatch = path.match(/^\/organization\/([^/]+)$/);
  if (orgPathMatch) {
    // Navigating to /organization/{slug} without a sub-path (e.g., /services)
    // This is likely from org creation dialog
    return true;
  }

  return false;
}

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { slug } = useParams<{ slug: string }>();

  const { data: sessionData, isPending } = authClient.useSession();

  useInstantAuth({ db: db as never, sessionData, isPending });

  // Track if we're in the middle of a canonical resolution to prevent loops
  const isResolvingRef = useRef(false);

  // Stabilize options object to prevent dependency array size changes
  const instantOptions = useMemo(
    () => ({
      db: db as never,
      sessionData: sessionData ?? undefined,
      isPending,
      user: sessionData?.user ?? null,
      usePlural: true,
    }),
    [sessionData, isPending]
  );

  const { hooks, mutators } = useInstantOptions(instantOptions);

  /**
   * Navigation handler that enforces canonical org resolution after mutations.
   * When an org mutation (create/delete) triggers navigation, we:
   * 1. Refresh the router cache to clear stale data
   * 2. Navigate to /app which canonically resolves the active org
   */
  const handleNavigate = useCallback(
    (path: string) => {
      if (isResolvingRef.current) {
        router.push(path);
        return;
      }

      if (shouldUseCanonicalResolution(path, pathname)) {
        isResolvingRef.current = true;
        // Refresh cache first, then navigate to canonical resolver
        router.refresh();
        // Small delay to allow refresh to process
        setTimeout(() => {
          router.replace("/app");
          isResolvingRef.current = false;
        }, 100);
        return;
      }

      router.push(path);
    },
    [router, pathname]
  );

  /**
   * Replace handler with same canonical resolution logic.
   */
  const handleReplace = useCallback(
    (path: string) => {
      if (isResolvingRef.current) {
        router.replace(path);
        return;
      }

      if (shouldUseCanonicalResolution(path, pathname)) {
        isResolvingRef.current = true;
        router.refresh();
        setTimeout(() => {
          router.replace("/app");
          isResolvingRef.current = false;
        }, 100);
        return;
      }

      router.replace(path);
    },
    [router, pathname]
  );

  /**
   * Session change handler - clears router cache for protected routes.
   */
  const handleSessionChange = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <ThemeProvider
      defaultTheme="system"
      enableSystem
      storageKey="service-inventory-theme"
    >
      <AuthUIProvider
        authClient={authClient}
        hooks={hooks}
        Link={Link}
        mutators={mutators}
        navigate={handleNavigate}
        onSessionChange={handleSessionChange}
        organization={{
          basePath: "/organization",
          pathMode: "slug",
          slug,
          customRoles: [
            { role: "editor", label: "Editor" },
            { role: "viewer", label: "Viewer" },
          ],
        }}
        replace={handleReplace}
      >
        {children}

        <Toaster />
      </AuthUIProvider>
    </ThemeProvider>
  );
}
