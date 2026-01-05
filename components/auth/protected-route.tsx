"use client";

import { Building2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOrganization?: boolean;
}

export function ProtectedRoute({
  children,
  requireOrganization = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { user, isLoading: isAuthLoading } = db.useAuth();

  // Query user's organizations
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const { data: orgData, isLoading: isOrgsLoading } = db.useQuery(
    userId
      ? {
          members: {
            $: {
              where: { userId },
            },
            organization: {},
          },
        }
      : null
  );

  const organizations = orgData?.members?.map((m) => m.organization) || [];
  const hasOrganization = organizations.length > 0;

  const isLoading = isSessionPending || isAuthLoading || isOrgsLoading;
  const isAuthenticated = !!session?.session && !!user;

  useEffect(() => {
    if (!(isLoading || isAuthenticated)) {
      router.push("/auth/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Show "Awaiting Invitation" state if organization required but user has none
  if (requireOrganization && !hasOrganization) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <div className="flex flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Mail className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Awaiting Invitation</CardTitle>
              <CardDescription>
                You need to be invited to an organization to access the
                dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">
                      No organization access
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Contact an administrator to receive an invitation to an
                      organization.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link href="/">Go to Home</Link>
                </Button>
                <Button onClick={() => authClient.signOut()} variant="ghost">
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User is authenticated and has organization access (if required)
  return <>{children}</>;
}
