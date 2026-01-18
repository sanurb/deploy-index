import { OrganizationView } from "@daveyplate/better-auth-ui";

/**
 * Organization invitations page.
 * Uses Better Auth UI OrganizationView component.
 */
export default function OrganizationInvitationsPage() {
  return (
    <main className="min-w-0 p-4 md:p-6">
      <OrganizationView path="invitations" />
    </main>
  );
}
