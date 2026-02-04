import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import { AppHeader } from "@/components/shared/app-header";
import { AcceptInvitationPageClient } from "./accept-invitation-client";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  // Custom handling for accept-invitation to redirect to organization after acceptance
  if (path === "accept-invitation") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container flex grow flex-col items-center justify-center self-center p-4 md:p-6">
          <AcceptInvitationPageClient />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex grow flex-col items-center justify-center self-center p-4 md:p-6">
        <AuthView path={path} redirectTo="/app" />
      </main>
    </div>
  );
}
