"use client";

import { useInstantAuth } from "@daveyplate/better-auth-instantdb";
import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { useInstantOptions } from "@daveyplate/better-auth-ui/instantdb";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useMemo } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: sessionData, isPending } = authClient.useSession();

  useInstantAuth({ db: db as never, sessionData, isPending });

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

  // TODO: Add hooks and mutators where these are stable
  const { hooks, mutators } = useInstantOptions(instantOptions);

  // Memoize callbacks to prevent re-renders
  const handleNavigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const handleReplace = useCallback(
    (path: string) => {
      router.replace(path);
    },
    [router]
  );

  const handleSessionChange = useCallback(() => {
    // Clear router cache (protected routes)
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
        replace={handleReplace}
      >
        {children}

        <Toaster />
      </AuthUIProvider>
    </ThemeProvider>
  );
}
