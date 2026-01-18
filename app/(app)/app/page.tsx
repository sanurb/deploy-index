import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb, auth } from "@/lib/auth";

/**
 * Server-side organization resolver.
 *
 * This is the canonical entry point for authenticated users.
 * It resolves the active organization and redirects to the org's services page.
 *
 * Flow:
 * 1. Check authentication - redirect to sign-in if not authenticated
 * 2. Resolve active organization:
 *    a. Use session.activeOrganizationId if valid
 *    b. Otherwise, find first accessible org and set as active
 *    c. If no orgs exist, the user creation hook should have created one
 * 3. Redirect to /organization/{slug}/services
 */
export default async function AppEntryPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  // Not authenticated - redirect to sign-in with return URL
  if (!session?.user) {
    redirect("/auth/sign-in?next=/app");
  }

  const userId = session.user.id;
  const activeOrgId = session.session.activeOrganizationId;

  let resolvedSlug: string | null = null;

  // Step 1: Try to resolve from activeOrganizationId
  if (activeOrgId) {
    const { organizations } = await adminDb.query({
      organizations: {
        $: { where: { id: activeOrgId } },
      },
    });

    const org = organizations?.[0];
    if (org?.slug && typeof org.slug === "string") {
      resolvedSlug = org.slug;
    }
  }

  // Step 2: If no valid active org, find first accessible org
  if (!resolvedSlug) {
    const { members } = await adminDb.query({
      members: {
        $: { where: { userId }, limit: 1 },
        organization: {},
      },
    });

    const firstMember = members?.[0];
    const org = firstMember?.organization;

    if (org?.id && org?.slug && typeof org.slug === "string") {
      resolvedSlug = org.slug;

      // Update session's activeOrganizationId
      // This is done via the organization plugin's setActive API
      // For now, we'll just navigate - the session hook will pick it up on next login
      // TODO: Call auth.api.setActiveOrganization if available
    }
  }

  // Step 3: If still no org, this is a data integrity issue
  // The user creation hook should have created a personal org
  if (!resolvedSlug) {
    // Last resort: query all memberships to find any valid org
    const { members } = await adminDb.query({
      members: {
        $: { where: { userId } },
        organization: {},
      },
    });

    for (const member of members || []) {
      const org = member?.organization;
      if (org?.slug && typeof org.slug === "string") {
        resolvedSlug = org.slug;
        break;
      }
    }
  }

  // Redirect to the resolved organization's services page
  if (resolvedSlug) {
    redirect(`/organization/${resolvedSlug}/services`);
  }

  // Invariant violation: authenticated user with no accessible organizations
  // This should never happen if the signup flow works correctly
  // Show error page instead of redirecting to avoid loops
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-md text-center">
        <h1 className="font-semibold text-lg">No workspace available</h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Your account has no accessible workspace. This is a configuration
          error. Please contact support.
        </p>
      </div>
    </div>
  );
}
