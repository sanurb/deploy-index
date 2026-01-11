"use client";

import { Download, Package, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CommandPalette } from "@/components/command-palette";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ServiceTable } from "@/components/service-table";
import { CreateServiceDrawer } from "@/components/service-table/create-service-drawer";
import {
  createNewServiceTransactions,
  createUpdateServiceTransactions,
} from "@/components/service-table/service-transactions";
import type {
  CreateServiceFormData,
  GroupedService,
} from "@/components/service-table/types";
import {
  calculateSearchScore,
  convertServicesToGrouped,
} from "@/components/service-table/utils";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";

const PAGE_TITLE = "Services";
const PAGE_DESCRIPTION =
  "Manage and track your deployed services across environments.";

export default function ServicesPage() {
  const { user } = db.useAuth();
  const userId = user?.id && typeof user.id === "string" ? user.id : null;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [editingService, setEditingService] = useState<GroupedService | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Filter services based on search query
  const filteredGroupedServices = useMemo((): readonly GroupedService[] => {
    if (!searchQuery.trim()) {
      return groupedServices;
    }

    interface ScoredService {
      readonly service: GroupedService;
      readonly score: number;
    }

    return groupedServices
      .map(
        (service: GroupedService): ScoredService => ({
          service,
          score: calculateSearchScore(service, searchQuery),
        })
      )
      .filter((item: ScoredService) => item.score > 0)
      .sort((a: ScoredService, b: ScoredService) => b.score - a.score)
      .map((item: ScoredService) => item.service);
  }, [groupedServices, searchQuery]);

  const hasServices = groupedServices.length > 0;
  const hasFilteredServices = filteredGroupedServices.length > 0;

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

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        const input = searchInputRef.current;
        if (input) {
          input.focus();
        }
      }

      if (e.key === "Escape" && e.target === searchInputRef.current) {
        const input = searchInputRef.current;
        if (input) {
          input.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        <div className="space-y-6">
          {/* PageHeader - Always visible */}
          <div className="space-y-1">
            <h1 className="font-bold text-3xl tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-muted-foreground text-sm">{PAGE_DESCRIPTION}</p>
          </div>

          {/* PageToolbar - Only when services exist */}
          {hasServices && (
            <div className="flex h-11 items-center gap-2">
              {/* Search input - flex-1, full width flexible */}
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search services"
                  className="h-11 pl-9"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search services…"
                  ref={searchInputRef}
                  value={searchQuery}
                />
              </div>

              {/* Actions cluster - icon-only buttons */}
              <div className="flex items-center gap-2">
                {/* CSV Export button - icon-only, ghost variant */}
                {hasFilteredServices && (
                  <Button
                    aria-label="Export to CSV"
                    className="h-11 w-11"
                    onClick={handleExportCsv}
                    size="icon"
                    variant="ghost"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                {/* Create service button - icon-only, primary */}
                {canCreate && (
                  <Button
                    aria-label="Create service"
                    className="h-11 w-11"
                    onClick={handleCreateService}
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Content Area */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => `skeleton-row-${i}`).map(
                (key) => (
                  <div
                    className="flex items-center gap-4 rounded-lg border bg-card p-4"
                    key={key}
                  >
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                  </div>
                )
              )}
            </div>
          )}

          {!isLoading && hasServices && (
            <ServiceTable
              onDelete={handleDeleteService}
              onEdit={handleEditService}
              services={filteredGroupedServices}
              showHeader={false}
              yamlContent=""
            />
          )}

          {!(isLoading || hasServices) && (
            <Empty className="border-dashed">
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
            onOpenChange={(open: boolean) => {
              setIsDrawerOpen(open);
              if (!open) {
                setEditingService(null);
              }
            }}
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
