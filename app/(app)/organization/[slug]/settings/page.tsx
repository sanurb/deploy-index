import { OrganizationView } from "@daveyplate/better-auth-ui";

/**
 * Organization settings page.
 * Uses Better Auth UI OrganizationView component.
 */
export default function OrganizationSettingsPage() {
  return (
    <main className="min-w-0 p-4 md:p-6">
      <OrganizationView path="settings" />
    </main>
  );
}
