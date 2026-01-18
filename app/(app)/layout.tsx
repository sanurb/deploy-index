import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";

/**
 * App root layout - protects all app routes.
 * This is the authentication boundary for the entire app.
 * Individual route groups can add additional layouts (org-scoped, account-scoped).
 */
export default function AppRootLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
