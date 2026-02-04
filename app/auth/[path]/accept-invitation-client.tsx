"use client";

import {
  AcceptInvitationCard,
  AuthUIContext,
} from "@daveyplate/better-auth-ui";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Custom accept invitation page that redirects to the organization
 * after successful acceptance instead of the landing page.
 */
export function AcceptInvitationPageClient() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();

  // Get hooks from AuthUIContext to monitor organization changes
  const authUIContext = useContext(AuthUIContext);

  if (!authUIContext?.hooks) {
    // Fallback if hooks are not available - just render the card
    // It will handle its own redirect via better-auth-ui defaults
    return <AcceptInvitationCard />;
  }

  const activeOrgResult = authUIContext.hooks.useActiveOrganization();
  const organizationsResult = authUIContext.hooks.useListOrganizations();

  const activeOrg = activeOrgResult?.data ?? null;
  const isActiveOrgLoading = activeOrgResult?.isPending ?? false;
  const organizations = organizationsResult?.data ?? null;
  const isOrgsLoading = organizationsResult?.isPending ?? false;

  // Track initial organization count to detect when a new one is added
  const initialOrgCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      isOrgsLoading ||
      organizations === null ||
      organizations === undefined
    ) {
      return;
    }

    // Set initial count on first load
    if (initialOrgCountRef.current === null) {
      initialOrgCountRef.current = organizations.length;
      return;
    }

    // If organization count increased, user accepted an invitation
    if (
      organizations.length > initialOrgCountRef.current &&
      !hasRedirectedRef.current
    ) {
      hasRedirectedRef.current = true;

      // Find the newly added organization (should be the active one)
      const newOrg = activeOrg || organizations[organizations.length - 1];

      if (newOrg?.slug && typeof newOrg.slug === "string") {
        // Allow adapter to write member to InstantDB and client to receive it before redirect
        router.refresh();
        setTimeout(() => {
          router.replace(`/organization/${newOrg.slug}/services`);
        }, 1500);
      } else {
        router.refresh();
        setTimeout(() => router.replace("/app"), 1500);
      }
    }
  }, [organizations, isOrgsLoading, activeOrg, router]);

  // Fallback: Monitor active organization changes
  useEffect(() => {
    if (
      isSessionPending ||
      isActiveOrgLoading ||
      hasRedirectedRef.current ||
      !sessionData?.session
    ) {
      return;
    }

    const activeOrgId =
      sessionData.session.activeOrganizationId ||
      (sessionData as { activeOrganization?: { id?: string } })
        ?.activeOrganization?.id;

    // If we have an active org and it has a slug, redirect there
    if (activeOrg?.slug && typeof activeOrg.slug === "string" && activeOrgId) {
      // Only redirect if we haven't already and we're on the accept-invitation page
      if (
        !hasRedirectedRef.current &&
        typeof window !== "undefined" &&
        window.location.pathname.includes("accept-invitation")
      ) {
        hasRedirectedRef.current = true;
        router.refresh();
        setTimeout(() => {
          router.replace(`/organization/${activeOrg.slug}/services`);
        }, 1500);
      }
    }
  }, [sessionData, isSessionPending, isActiveOrgLoading, activeOrg, router]);

  return <AcceptInvitationCard />;
}
