import { AccountView } from "@daveyplate/better-auth-ui";

/**
 * Catch-all route for Better Auth UI account views.
 * Handles any account view path not explicitly defined.
 */
export default function AccountCatchAllPage({
  params,
}: {
  readonly params: { path: string[] };
}) {
  const viewPath = params.path.join("/");
  return (
    <main className="min-w-0 p-4 md:p-6">
      <AccountView path={viewPath} />
    </main>
  );
}
