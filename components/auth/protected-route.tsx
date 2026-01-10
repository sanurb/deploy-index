"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/shared/app-header";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { user, isLoading: isAuthLoading } = db.useAuth();

  const isLoading = isSessionPending || isAuthLoading;
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

  // User is authenticated (personal organization is created automatically on signup)
  return <>{children}</>;
}
