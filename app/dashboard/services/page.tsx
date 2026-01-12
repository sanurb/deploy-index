"use client";

import { Download, Package, Plus } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CommandPalette } from "@/components/command-palette";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import type { GroupedService } from "@/components/service-table/types";
import { convertServicesToGrouped } from "@/components/service-table/utils";
import { GlobalSearchBar } from "@/components/services/global-search-bar";
import { ServicesContent } from "@/components/services/services-content";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServicesQueryState } from "@/hooks/use-services-query-state";
import { db } from "@/lib/db";

const PAGE_TITLE = "Services";
const PAGE_DESCRIPTION =
  "Manage and track your deployed services across environments.";

/**
 * Loading fallback for Suspense boundary.
 * Shown while useSearchParams() resolves during dynamic rendering.
 */
function ServicesContentFallback() {
  return (
    <div className="space-y-4">
      {/* Filter skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map((key) => (
          <div
            className="flex items-center gap-4 rounded border border-border/40 bg-card p-4"
            key={key}
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Toolbar row component with search and actions.
 * Rendered in Suspense boundary to access query state.
 */
function ToolbarRowContent({
  canCreate,
  groupedServices,
  onCreateService,
}: {
  readonly canCreate: boolean;
  readonly groupedServices: readonly GroupedService[];
  readonly onCreateService: () => void;
}) {
  const queryState = useServicesQueryState();

  const hasFilteredServices = useMemo(() => {
    const hasQuery = queryState.q.trim().length > 0;
    const hasFilters =
      queryState.env.length > 0 ||
      queryState.runtime.length > 0 ||
      queryState.owner.length > 0;
    return hasQuery || hasFilters;
  }, [queryState]);

  const handleExportCsv = useCallback(() => {
    import("@/components/service-table/export").then(
      ({ exportServicesToCsv }) => {
        exportServicesToCsv(groupedServices);
      }
    );
  }, [groupedServices]);

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      {/* Left: Search */}
      <div className="w-full min-w-[320px] max-w-[560px]">
        <GlobalSearchBar onChange={queryState.setQ} value={queryState.q} />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center justify-end gap-2">
        {/* Export CSV - Icon only with tooltip */}
        {hasFilteredServices && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Export to CSV"
                className="h-9"
                onClick={handleExportCsv}
                size="icon"
                variant="ghost"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export CSV</TooltipContent>
          </Tooltip>
        )}

        {/* Create Service - Responsive: text+icon on desktop, icon-only on mobile */}
        {canCreate && (
          <Button
            aria-label="Create service"
            className="h-9"
            onClick={onCreateService}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New service</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Toolbar row wrapper that handles Suspense boundary.
 */
function ToolbarRow({
  canCreate,
  groupedServices,
  onCreateService,
}: {
  readonly canCreate: boolean;
  readonly groupedServices: readonly GroupedService[];
  readonly onCreateService: () => void;
}) {
  return (
    <Suspense fallback={<ToolbarRowSkeleton />}>
      <ToolbarRowContent
        canCreate={canCreate}
        groupedServices={groupedServices}
        onCreateService={onCreateService}
      />
    </Suspense>
  );
}

/**
 * Loading skeleton for toolbar row.
 */
function ToolbarRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <Skeleton className="h-9 w-full min-w-[320px] max-w-[560px]" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createServiceTrigger, setCreateServiceTrigger] = useState(0);

  // Query user's organizations and memberships to check roles
  const { data: orgData } = db.useQuery(
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

  const members = orgData?.members || [];
  const organizations = members.map((m) => m.organization).filter(Boolean);
  const organizationIds =
    organizations.length > 0
      ? organizations
          .map((org) => org?.id)
          .filter(
            (orgId): orgId is string =>
              typeof orgId === "string" && orgId.length > 0
          )
      : [];

  // Check if user has editor/admin/owner role
  const canCreate = useMemo(() => {
    if (!members.length) {
      return false;
    }
    return members.some(
      (m) => m.role === "editor" || m.role === "admin" || m.role === "owner"
    );
  }, [members]);

  // Query services with interfaces and dependencies for user's organizations
  const { data: servicesData, isLoading } = db.useQuery(
    organizationIds.length > 0
      ? {
          services: {
            $: {
              where: {
                organizationId: { $in: organizationIds },
              },
            },
            interfaces: {},
            dependencies: {},
          },
        }
      : null
  );

  const rawServices = (servicesData?.services || []) as Array<{
    id: string;
    name: string;
    owner: string;
    repository: string;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
    interfaces?: Array<{
      id: string;
      domain: string;
      env: string | null;
      branch: string | null;
      runtimeType: string | null;
      runtimeId: string | null;
    }>;
    dependencies?: Array<{
      id: string;
      dependencyName: string;
    }>;
  }>;

  const groupedServices = useMemo(
    () => convertServicesToGrouped(rawServices),
    [rawServices]
  );

  const existingServiceNames = useMemo(
    () => rawServices.map((s) => s.name),
    [rawServices]
  );

  // Extract available filter options from services
  const availableRuntimes = useMemo(() => {
    const runtimeSet = new Set<string>();
    for (const service of groupedServices) {
      for (const runtime of service.runtimeFootprint) {
        runtimeSet.add(runtime);
      }
    }
    return Array.from(runtimeSet).sort();
  }, [groupedServices]);

  const availableOwners = useMemo(() => {
    const ownerSet = new Set<string>();
    for (const service of groupedServices) {
      ownerSet.add(service.owner);
    }
    return Array.from(ownerSet).sort();
  }, [groupedServices]);

  const hasServices = groupedServices.length > 0;

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handler to trigger create service from toolbar
  const handleCreateService = useCallback(() => {
    setCreateServiceTrigger((prev) => prev + 1);
  }, []);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          {/* Page Header */}
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground text-sm">{PAGE_DESCRIPTION}</p>
          </div>

          {/* Toolbar Row - Search + Actions */}
          {!isLoading && hasServices && userId && (
            <ToolbarRow
              canCreate={canCreate}
              groupedServices={groupedServices}
              onCreateService={handleCreateService}
            />
          )}

          {/* Content Area with Suspense boundary */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
                (key) => {
                  return (
                    <div
                      className="flex items-center gap-4 rounded border border-border/40 bg-card p-4"
                      key={key}
                    >
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="ml-auto h-8 w-8 rounded" />
                    </div>
                  );
                }
              )}
            </div>
          )}

          {!isLoading && hasServices && userId && (
            <Suspense fallback={<ServicesContentFallback />}>
              <ServicesContent
                availableOwners={availableOwners}
                availableRuntimes={availableRuntimes}
                canCreate={canCreate}
                createServiceTrigger={createServiceTrigger}
                existingServiceNames={existingServiceNames}
                groupedServices={groupedServices}
                organizationIds={organizationIds}
                rawServices={rawServices}
                userId={userId}
              />
            </Suspense>
          )}

          {!isLoading && !hasServices && (
            <Empty className="border-border/40 border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Package className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No services yet</EmptyTitle>
                <EmptyDescription>
                  Services represent deployed software in your organization.
                  Create your first service to start building your deployment
                  inventory.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <CommandPalette
            onOpenChange={setCommandPaletteOpen}
            onSearch={(query) => {
              // Search handled by ServiceTable internally
              console.log("Search:", query);
            }}
            open={commandPaletteOpen}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
