"use client";

import { AuthUIContext } from "@daveyplate/better-auth-ui";
import { Download, Package, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommandPalette } from "@/components/command-palette";
import {
  CreateServiceDrawer,
  type CreateServiceFormData,
} from "@/components/service-table/create-service-drawer";
import { createNewServiceTransactions } from "@/components/service-table/service-transactions";
import type { GroupedService } from "@/components/service-table/types";
import { convertServicesToGrouped } from "@/components/service-table/utils";
import { GlobalSearchBar } from "@/components/services/global-search-bar";
import { ServicesContent } from "@/components/services/services-content";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
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
 * Ref handle for exposing query state callbacks to parent.
 */
interface QueryStateBridge {
  setQ: (query: string) => void;
  setOwner: (owners: readonly string[]) => void;
}

/**
 * Toolbar row component with search and actions.
 * Rendered in Suspense boundary to access query state.
 */
function ToolbarRowContent({
  canCreate,
  groupedServices,
  onCreateService,
  queryStateBridgeRef,
}: {
  readonly canCreate: boolean;
  readonly groupedServices: readonly GroupedService[];
  readonly onCreateService: () => void;
  readonly queryStateBridgeRef: React.RefObject<QueryStateBridge | null>;
}) {
  const queryState = useServicesQueryState();

  // Expose query state setters to parent via ref
  useEffect(() => {
    queryStateBridgeRef.current = {
      setQ: queryState.setQ,
      setOwner: queryState.setOwner,
    };
    return () => {
      queryStateBridgeRef.current = null;
    };
  }, [queryState.setQ, queryState.setOwner, queryStateBridgeRef]);

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

        {/* Create Service - Icon button with tooltip */}
        {canCreate && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                aria-label="New service"
                className="h-9"
                onClick={onCreateService}
                size="icon"
                variant="default"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              align="end"
              avoidCollisions
              className="flex items-center gap-1 rounded-md border border-border bg-popover px-2 py-1.5 text-popover-foreground text-xs shadow-sm [&_svg]:hidden"
              side="top"
              sideOffset={6}
            >
              <span>New service</span>
              <span className="flex items-center gap-0.5">
                <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  N
                </kbd>
                <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  S
                </kbd>
              </span>
            </TooltipContent>
          </Tooltip>
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
  queryStateBridgeRef,
}: {
  readonly canCreate: boolean;
  readonly groupedServices: readonly GroupedService[];
  readonly onCreateService: () => void;
  readonly queryStateBridgeRef: React.RefObject<QueryStateBridge | null>;
}) {
  return (
    <Suspense fallback={<ToolbarRowSkeleton />}>
      <ToolbarRowContent
        canCreate={canCreate}
        groupedServices={groupedServices}
        onCreateService={onCreateService}
        queryStateBridgeRef={queryStateBridgeRef}
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
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createServiceTrigger, setCreateServiceTrigger] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEmptyStateDrawerOpen, setIsEmptyStateDrawerOpen] = useState(false);
  const queryStateBridgeRef = useRef<QueryStateBridge | null>(null);

  // Resolve organization from Better Auth API list (server-backed). This avoids
  // client-side InstantDB permission/sync issues after accepting an invitation.
  const authUIContext = useContext(AuthUIContext);
  const orgListResult = authUIContext?.hooks?.useListOrganizations?.();
  const apiOrgList = orgListResult?.data ?? null;
  const isOrgListLoading = orgListResult?.isPending ?? false;

  // API may return members (with nested organization) or plain organizations; resolve by slug
  const organizationFromApi = useMemo(() => {
    if (!slug || !apiOrgList || !Array.isArray(apiOrgList)) return null;
    for (const item of apiOrgList as Array<
      | { slug?: string; id?: string; name?: string }
      | { organization?: { slug?: string; id?: string; name?: string } }
    >) {
      const orgSlug =
        "organization" in item && item.organization?.slug != null
          ? item.organization.slug
          : "slug" in item && item.slug != null
            ? item.slug
            : null;
      if (orgSlug != null && String(orgSlug) === String(slug)) {
        return ("organization" in item ? item.organization : item) as {
          id: string;
          name?: string;
          slug: string;
        };
      }
    }
    return null;
  }, [slug, apiOrgList]);

  // Fallback: client-side InstantDB org-by-slug (may be empty due to permissions until sync)
  const { data: orgData, error: orgError } = db.useQuery(
    slug && !organizationFromApi
      ? {
          organizations: {
            $: {
              where: { slug },
            },
          },
        }
      : null
  );

  const orgListFromDb = Array.isArray(orgData?.organizations)
    ? orgData.organizations
    : [];
  const organizationFromDb = orgListFromDb[0] ?? null;

  const organization = organizationFromApi ?? organizationFromDb;
  const organizationId =
    organization?.id && typeof organization.id === "string"
      ? organization.id
      : null;

  // Determine if user has access: if org is from API, user has access
  const hasAccessViaApi = Boolean(organizationFromApi);

  // Query user's membership to determine role (for canCreate permission)
  const {
    data: membershipData,
    isLoading: isLoadingMembership,
    error: membershipError,
  } = db.useQuery(
    userId && organizationId
      ? {
          members: {
            $: {
              where: {
                userId,
                organizationId,
              },
            },
          },
        }
      : null
  );

  const membership = membershipData?.members?.[0];
  const memberRole = membership?.role ?? null;

  const canCreate = useMemo(() => {
    // While membership is loading, disable creation to avoid permission errors
    if (!membershipData) {
      return false;
    }
    if (!membership) {
      return false;
    }
    return (
      memberRole === "member" ||
      memberRole === "editor" ||
      memberRole === "admin" ||
      memberRole === "owner"
    );
  }, [membershipData, membership, memberRole]);

  // Query services for this organization only
  // IMPORTANT: Must query organization relationship for permissions to work
  const {
    data: servicesData,
    isLoading: isLoadingServices,
    error: servicesError,
  } = db.useQuery(
    organizationId
      ? {
          services: {
            $: {
              where: {
                organizationId,
              },
            },
            interfaces: {},
            dependencies: {},
            organization: {
              members: {
                user: {},
              },
            },
          },
        }
      : null
  );

  // Combined loading state:
  // - Resolving org from API list or from InstantDB
  // - If org is found, services query loading
  const isLoading = useMemo(() => {
    if (!slug) return false;
    // Resolving org from Better Auth API list
    if (isOrgListLoading && !organizationFromApi) {
      return true;
    }
    // Fallback: InstantDB org-by-slug still loading (when we don't have org from API yet)
    if (!organizationFromApi && orgData === undefined) {
      return true;
    }
    // If we have org, just wait for services to load
    if (organizationId && isLoadingServices) {
      return true;
    }
    return false;
  }, [
    slug,
    isOrgListLoading,
    organizationFromApi,
    orgData,
    organizationId,
    isLoadingServices,
  ]);

  // Org not found: slug in URL but org not in API list and not in InstantDB result
  const orgNotFound = useMemo(() => {
    if (!slug) return false;
    if (organization) return false;
    if (isOrgListLoading) return false;
    if (organizationFromApi !== null) return false;
    if (orgData === undefined) return false;
    return orgListFromDb.length === 0;
  }, [
    slug,
    organization,
    isOrgListLoading,
    organizationFromApi,
    orgData,
    orgListFromDb.length,
  ]);

  // Determine if user doesn't have access
  // Only block if: org exists, no API access, and membership query shows no membership
  const noAccess = useMemo(() => {
    // If user has access via API, they have access
    if (hasAccessViaApi) {
      return false;
    }
    // Otherwise, check membership: org exists, membership query completed, but no membership found
    return organization && membershipData !== undefined && !membership;
  }, [hasAccessViaApi, organization, membershipData, membership]);

  // Check for any query errors
  const hasError = orgError || membershipError || servicesError;

  const rawServices = (servicesData?.services || []) as Array<{
    id: string;
    name: string;
    description?: string | null;
    language?: string | null; // Stored as comma-separated string
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

  // N+S chord handler for creating new service
  useEffect(() => {
    let chordTimer: NodeJS.Timeout | null = null;
    let waitingForS = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputElement) {
        return;
      }

      // Don't trigger if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) {
        return;
      }

      // Disable chord handler if any modal/drawer is open (except the service drawer)
      if (commandPaletteOpen || (isDrawerOpen && e.key !== "Escape")) {
        if (chordTimer) {
          clearTimeout(chordTimer);
          chordTimer = null;
        }
        waitingForS = false;
        return;
      }

      // Start chord: N key
      if ((e.key === "n" || e.key === "N") && !waitingForS) {
        e.preventDefault();
        waitingForS = true;

        // Set timeout to clear chord state after ~1000ms
        chordTimer = setTimeout(() => {
          waitingForS = false;
          chordTimer = null;
        }, 1000);
      }
      // Complete chord: S key after N
      else if ((e.key === "s" || e.key === "S") && waitingForS) {
        e.preventDefault();
        e.stopPropagation();

        // Clear chord state
        if (chordTimer) {
          clearTimeout(chordTimer);
          chordTimer = null;
        }
        waitingForS = false;

        // Open drawer
        if (canCreate) {
          setCreateServiceTrigger((prev) => prev + 1);
        }
      }
      // Any other key clears the chord
      else if (waitingForS) {
        if (chordTimer) {
          clearTimeout(chordTimer);
          chordTimer = null;
        }
        waitingForS = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (chordTimer) {
        clearTimeout(chordTimer);
      }
    };
  }, [canCreate, commandPaletteOpen, isDrawerOpen]);

  // Handler to trigger create service from toolbar
  const handleCreateService = useCallback(() => {
    setCreateServiceTrigger((prev) => prev + 1);
  }, []);

  // Handler to track drawer open state
  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setIsDrawerOpen(open);
  }, []);

  // Handler to open empty state drawer
  const handleOpenEmptyStateDrawer = useCallback(() => {
    setIsEmptyStateDrawerOpen(true);
  }, []);

  // Handler for service creation from empty state
  const handleEmptyStateServiceSubmit = useCallback(
    async (data: CreateServiceFormData) => {
      if (!userId || !organizationId) {
        return;
      }

      try {
        const transactions = createNewServiceTransactions(
          db,
          organizationId,
          userId,
          data
        );
        await db.transact(transactions);
        setIsEmptyStateDrawerOpen(false);
      } catch (error) {
        console.error("Failed to create service:", error);
        throw error;
      }
    },
    [userId, organizationId]
  );

  // Show error state if any query failed
  if (hasError) {
    const errorMessage =
      orgError?.message ||
      membershipError?.message ||
      servicesError?.message ||
      "An error occurred";
    return (
      <div className="space-y-4">
        <Empty className="border-border/40 border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Something went wrong</EmptyTitle>
            <EmptyDescription>{errorMessage}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // If organization not found (query completed, no results), show error
  if (orgNotFound) {
    return (
      <div className="space-y-4">
        <Empty className="border-border/40 border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Organization not found</EmptyTitle>
            <EmptyDescription>
              The organization you're looking for doesn't exist.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  // If user doesn't have access (org exists but no membership), show error
  if (noAccess) {
    return (
      <div className="space-y-4">
        <Empty className="border-border/40 border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Access denied</EmptyTitle>
            <EmptyDescription>
              You don't have access to this organization.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="space-y-1 hidden">
        <h1 className="font-bold text-3xl tracking-tight">{PAGE_TITLE}</h1>
        <p className="text-muted-foreground text-sm">{PAGE_DESCRIPTION}</p>
      </div>

      {/* Toolbar Row - Search + Actions */}
      {!isLoading && hasServices && userId && organizationId && (
        <ToolbarRow
          canCreate={canCreate}
          groupedServices={groupedServices}
          onCreateService={handleCreateService}
          queryStateBridgeRef={queryStateBridgeRef}
        />
      )}

      {/* Content Area with Suspense boundary */}
      {isLoading && (
        <div className="space-y-4">
          {slug && (
            <p className="text-muted-foreground text-center text-sm">
              Loading workspace…
            </p>
          )}
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
        </div>
      )}

      {!isLoading && hasServices && userId && organizationId && (
        <Suspense fallback={<ServicesContentFallback />}>
          <ServicesContent
            availableOwners={availableOwners}
            availableRuntimes={availableRuntimes}
            canCreate={canCreate}
            createServiceTrigger={createServiceTrigger}
            existingServiceNames={existingServiceNames}
            groupedServices={groupedServices}
            onDrawerOpenChange={handleDrawerOpenChange}
            organizationIds={[organizationId]}
            rawServices={rawServices}
            userId={userId}
          />
        </Suspense>
      )}

      {!isLoading && !hasServices && (
        <>
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
            {canCreate && (
              <EmptyContent>
                <Button onClick={handleOpenEmptyStateDrawer}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create service
                </Button>
              </EmptyContent>
            )}
          </Empty>

          {canCreate && organizationId && (
            <CreateServiceDrawer
              canCreate={canCreate}
              existingServiceNames={existingServiceNames}
              onOpenChange={setIsEmptyStateDrawerOpen}
              onSubmit={handleEmptyStateServiceSubmit}
              open={isEmptyStateDrawerOpen}
            />
          )}
        </>
      )}

      <CommandPalette
        canCreate={canCreate}
        groupedServices={groupedServices}
        onCreateService={handleCreateService}
        onOpenChange={setCommandPaletteOpen}
        onSetOwner={(owners) => {
          queryStateBridgeRef.current?.setOwner(owners);
        }}
        onSetQuery={(query) => {
          queryStateBridgeRef.current?.setQ(query);
        }}
        open={commandPaletteOpen}
        services={rawServices.map((s) => ({
          id: s.id,
          name: s.name,
          owner: s.owner,
          interfaces: s.interfaces?.map((i) => ({ domain: i.domain })),
        }))}
        slug={slug}
      />
    </div>
  );
}
