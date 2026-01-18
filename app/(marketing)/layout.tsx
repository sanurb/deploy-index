import type { ReactNode } from "react";

/**
 * Marketing layout for public landing pages.
 * No authentication required, no redirects.
 */
export default function MarketingLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <>{children}</>;
}
