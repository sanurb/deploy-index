import { OrganizationView } from "@daveyplate/better-auth-ui";

/**
 * Catch-all route for Better Auth UI organization views.
 * Handles any organization view path not explicitly defined.
 * Explicit routes (services, settings, members, invitations) take precedence.
 */
export default function OrganizationCatchAllPage({
  params,
}: {
  readonly params: { slug: string; path: string[] };
}) {
  const viewPath = params.path.join("/");
  return (
    <main className="min-w-0 p-4 md:p-6">
      <OrganizationView path={viewPath} />
    </main>
  );
}
