"use client";

import { Download, Package, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CommandPalette } from "@/components/command-palette";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ServiceTable } from "@/components/service-table";
import { CreateServiceDrawer } from "@/components/service-table/create-service-drawer";
import { deriveVisibleServices } from "@/components/service-table/derive-visible-services";
import {
  createNewServiceTransactions,
  createUpdateServiceTransactions,
} from "@/components/service-table/service-transactions";
import type {
  CreateServiceFormData,
  GroupedService,
} from "@/components/service-table/types";
import { convertServicesToGrouped } from "@/components/service-table/utils";
import { QueryBar } from "@/components/services/query-bar";
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
import { useServicesQueryState } from "@/hooks/use-services-query-state";
import { db } from "@/lib/db";

const PAGE_TITLE = "Services";
const PAGE_DESCRIPTION =
  "Manage and track your deployed services across environments.";

/**
 * Restores focus to an element if it's still in the DOM and focusable
 */
function restoreFocus(element: HTMLElement | null): void {
  if (!element) {
    return;
  }

  // Check if element is still in the DOM and focusable
  if (document.contains(element) && typeof element.focus === "function") {
    try {
      element.focus();
    } catch {
      // If focus fails, try to focus the table container instead
      const tableContainer = document.querySelector(
        '[data-slot="table-container"]'
      ) as HTMLElement;
      if (tableContainer) {
        tableContainer.focus();
      }
    }
  }
}

export default function ServicesPage() {
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editingService, setEditingService] = useState<GroupedService | null>(
    null
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Query state management via URL-synced hook
  const queryState = useServicesQueryState();

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

  // Derive visible services from query state (pure selector, no side effects)
  const visibleServices = useMemo(
    () => deriveVisibleServices(groupedServices, queryState),
    [groupedServices, queryState]
  );

  const hasServices = groupedServices.length > 0;
  const hasFilteredServices = visibleServices.length > 0;

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

  const handleCreateService = () => {
    if (canCreate) {
      setEditingService(null);
      setIsDrawerOpen(true);
    }
  };

  const handleEditService = useCallback(
    (service: GroupedService) => {
      if (canCreate) {
        // Store the currently focused element before opening drawer
        previousFocusRef.current =
          (document.activeElement as HTMLElement) || null;
        setEditingService(service);
        setIsDrawerOpen(true);
      }
    },
    [canCreate]
  );

  const handleDeleteService = useCallback(
    async (service: GroupedService) => {
      if (!userId) {
        return;
      }

      try {
        // Delete service - cascades to interfaces and dependencies
        await db.transact([db.tx.services[service.id].delete()]);
      } catch (error) {
        console.error("Failed to delete service:", error);
        // TODO: Show error toast
      }
    },
    [userId]
  );

  const handleExportCsv = useCallback(() => {
    // Import and use the export function
    import("@/components/service-table/export").then(
      ({ exportServicesToCsv }) => {
        exportServicesToCsv(groupedServices);
      }
    );
  }, [groupedServices]);

  const handleServiceSubmit = useCallback(
    async (data: CreateServiceFormData) => {
      if (!userId || organizationIds.length === 0) {
        return;
      }

      const organizationId = organizationIds[0];
      const isEditing = editingService !== null;

      if (isEditing && editingService) {
        // Update existing service
        const serviceId = editingService.id;

        // Find the raw service to get existing interfaces and dependencies with IDs
        const rawService = rawServices.find((s) => s.id === serviceId);
        if (!rawService) {
          console.error("Service not found for editing");
          return;
        }

        const transactions = createUpdateServiceTransactions(
          db,
          serviceId,
          userId,
          data,
          rawService
        );

        await db.transact(transactions);
      } else {
        // Create new service
        const transactions = createNewServiceTransactions(
          db,
          organizationId,
          userId,
          data
        );

        await db.transact(transactions);
      }
    },
    [userId, organizationIds, editingService, rawServices]
  );

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-4">
          {/* PageHeader with Actions - Strict hierarchy, 8/16px rhythm */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-bold text-3xl tracking-tight">
                {PAGE_TITLE}
              </h1>
              <p className="text-muted-foreground text-sm">
                {PAGE_DESCRIPTION}
              </p>
            </div>

            {/* Actions - Right-aligned, icon-only, consistent hit areas */}
            <div className="flex items-center gap-2">
              {/* CSV Export - Tertiary, reduced prominence */}
              {hasFilteredServices && (
                <Button
                  aria-label="Export to CSV"
                  className="h-[42px] w-10"
                  onClick={handleExportCsv}
                  size="icon"
                  variant="ghost"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {/* Create service - Primary CTA, isolated */}
              {canCreate && (
                <Button
                  aria-label="Create service"
                  className="h-[42px] w-10"
                  onClick={handleCreateService}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Query Bar - Search-first with filter tokens, 16px spacing */}
          {hasServices && (
            <div className="space-y-2">
              <QueryBar
                availableOwners={availableOwners}
                availableRuntimes={availableRuntimes}
                onQChange={queryState.setQ}
                queryState={queryState}
              />
            </div>
          )}

          {/* Content Area */}
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

          {!isLoading && hasServices && hasFilteredServices && (
            <ServiceTable
              onDelete={handleDeleteService}
              onEdit={handleEditService}
              services={visibleServices}
              showHeader={false}
              yamlContent=""
            />
          )}

          {!isLoading &&
            hasServices &&
            !hasFilteredServices &&
            (queryState.q.trim().length > 0 ||
              queryState.env.length > 0 ||
              queryState.runtime.length > 0 ||
              queryState.owner.length > 0) && (
              <Empty className="border-border/40">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No services match your filters</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your search query or removing filters to see
                    more results.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => {
                      queryState.clearFilters();
                    }}
                    variant="outline"
                  >
                    Clear filters
                  </Button>
                </EmptyContent>
              </Empty>
            )}

          {!(isLoading || hasServices) && (
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
                  <Button onClick={handleCreateService}>
                    <Plus className="mr-2 size-4" />
                    Create service
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}

          <CreateServiceDrawer
            canCreate={canCreate}
            editingService={editingService}
            existingServiceNames={existingServiceNames}
            onOpenChange={useCallback((open: boolean) => {
              setIsDrawerOpen(open);
              if (!open) {
                setEditingService(null);
                // Restore focus to the previously focused element
                // Use setTimeout to ensure Sheet has fully closed and DOM has updated
                setTimeout(() => {
                  restoreFocus(previousFocusRef.current);
                  previousFocusRef.current = null;
                }, 100);
              }
            }, [])}
            onSubmit={handleServiceSubmit}
            open={isDrawerOpen}
          />

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
