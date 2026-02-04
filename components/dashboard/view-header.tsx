"use client";

import { useParams, usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { SidebarTrigger } from "@/components/animate-ui/components/radix/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type DashboardHeaderConfig = {
  title?: ReactNode;
  side?: ReactNode;
  subheader?: ReactNode;
};

type ViewHeaderProps = {
  readonly header?: DashboardHeaderConfig;
  /**
   * Optional: fetch org name in an RSC layout, pass it here.
   * Otherwise the component will derive a readable label from the URL slug.
   */
  readonly organizationName?: string | null;
};

const ROUTE_LABELS: Record<string, string> = {
  "/organization/[slug]/services": "Services",
  "/organization/[slug]/settings": "Organization",
  "/organization/[slug]/members": "Members",
  "/organization/[slug]/invitations": "Invitations",
  "/account/settings": "Account Settings",
};

function cleanString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function humanizeSlug(slug: string): string {
  // "testing-worskpace" -> "Testing Worskpace"
  return slug
    .trim()
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function getOrgCrumbLabel(
  paramsSlug: string | null,
  organizationName?: string | null
): string {
  const fromProp = cleanString(organizationName);
  if (fromProp) return fromProp;

  const slug = cleanString(paramsSlug);
  if (slug) return humanizeSlug(slug);

  // Should be rare in org-first routes; keep a safe fallback.
  return "Workspace";
}

function getPageCrumbLabel(pathname: string): string {
  // Org scoped: /organization/:slug/:section(/...)
  if (pathname.startsWith("/organization/")) {
    const parts = pathname.split("/").filter(Boolean);
    // parts: ["organization", ":slug", ":section", ...rest]
    const section = cleanString(parts[2]) ?? "services";
    const key = `/organization/[slug]/${section}`;
    return ROUTE_LABELS[key] ?? humanizeSlug(section);
  }

  // Account scoped: /account/:section(/...)
  if (pathname.startsWith("/account/")) {
    const parts = pathname.split("/").filter(Boolean);
    // parts: ["account", ":section", ...rest]
    const section = cleanString(parts[1]) ?? "settings";
    const key = `/account/${section}`;
    return ROUTE_LABELS[key] ?? humanizeSlug(section);
  }

  return "Home";
}

export function ViewHeader({ header, organizationName }: ViewHeaderProps) {
  const pathname = usePathname();
  const params = useParams<{ slug?: string }>();
  const slugFromUrl = cleanString(params?.slug);

  const orgLabel = useMemo(
    () => getOrgCrumbLabel(slugFromUrl, organizationName),
    [organizationName, slugFromUrl]
  );

  const pageLabel = useMemo(() => getPageCrumbLabel(pathname), [pathname]);

  return (
    <header
      className={cn(
        "sticky top-0 z-30",
        "border-b border-border/60",
        "bg-background/60 backdrop-blur supports-backdrop-filter:bg-background/40"
      )}
    >
      <div className="flex h-11 min-w-0 items-center gap-2 px-3 md:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarTrigger className="-ml-1" />

          <Breadcrumb>
            <BreadcrumbList className="min-w-0">
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate text-[13px] font-medium">
                  {orgLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate text-[13px] text-muted-foreground">
                  {pageLabel}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {header?.side ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {header.side}
          </div>
        ) : null}
      </div>

      {header?.subheader ? (
        <div className="px-3 pb-2 md:px-4">
          <div className="min-w-0">{header.subheader}</div>
        </div>
      ) : null}
    </header>
  );
}
