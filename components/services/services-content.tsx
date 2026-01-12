/**
 * Services Content Component
 *
 * Client component that manages services table with search/filter state.
 * Wrapped in Suspense boundary by parent to handle useSearchParams dynamic rendering.
 *
 * Responsibilities:
 * - Read query state from URL (via useServicesQueryState)
 * - Render search bar and filter controls
 * - Filter and display services based on query state
 * - Handle service CRUD operations
 *
 * This component is separated from the page to allow proper Suspense boundaries
 * around dynamic rendering caused by useSearchParams().
 */

"use client";

import { Package, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { FilterChipsRow } from "@/components/services/filter-chips-row";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useServicesQueryState } from "@/hooks/use-services-query-state";
import { db } from "@/lib/db";

interface RawService {
  readonly id: string;
  readonly interfaces?: Array<{
    readonly id: string;
  }>;
  readonly dependencies?: Array<{
    readonly id: string;
  }>;
}

interface ServicesContentProps {
  readonly userId: string;
  readonly organizationIds: readonly string[];
  readonly canCreate: boolean;
  readonly groupedServices: readonly GroupedService[];
  readonly rawServices: readonly RawService[];
  readonly existingServiceNames: readonly string[];
  readonly availableRuntimes: readonly string[];
  readonly availableOwners: readonly string[];
  readonly createServiceTrigger: number;
}

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

/**
 * Services content component with query state management.
 *
 * Uses useServicesQueryState which internally uses useSearchParams(),
 * requiring this component to be wrapped in a Suspense boundary.
 */
export function ServicesContent({
  userId,
  organizationIds,
  canCreate,
  groupedServices,
  rawServices,
  existingServiceNames,
  availableRuntimes,
  availableOwners,
  createServiceTrigger,
}: ServicesContentProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<GroupedService | null>(
    null
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Open drawer when create service is triggered from toolbar
  useEffect(() => {
    if (createServiceTrigger > 0 && canCreate) {
      setEditingService(null);
      setIsDrawerOpen(true);
    }
  }, [createServiceTrigger, canCreate]);

  // Query state management via URL-synced hook (uses useSearchParams internally)
  const queryState = useServicesQueryState();

  // Derive visible services from query state (pure selector, no side effects)
  const visibleServices = useMemo(
    () => deriveVisibleServices(groupedServices, queryState),
    [groupedServices, queryState]
  );

  const hasServices = groupedServices.length > 0;
  const hasFilteredServices = visibleServices.length > 0;

  const handleCreateService = useCallback(() => {
    if (canCreate) {
      setEditingService(null);
      setIsDrawerOpen(true);
    }
  }, [canCreate]);

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

  const handleServiceSubmit = useCallback(
    async (data: CreateServiceFormData) => {
      if (!userId || organizationIds.length === 0) {
        return;
      }

      const organizationId = organizationIds[0];

      try {
        if (editingService) {
          // Update existing service
          const serviceId = editingService.id;

          // Find the raw service to get existing interfaces and dependencies with IDs
          const existingService = rawServices.find((s) => s.id === serviceId);
          if (!existingService) {
            console.error("Service not found for editing");
            return;
          }

          const transactions = createUpdateServiceTransactions(
            db,
            serviceId,
            userId,
            data,
            existingService
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

        setIsDrawerOpen(false);
        setEditingService(null);
      } catch (error) {
        console.error("Failed to save service:", error);
        throw error;
      }
    },
    [userId, organizationIds, editingService, rawServices]
  );

  const handleDrawerOpenChange = useCallback((open: boolean) => {
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
  }, []);

  return (
    <>
      {/* Filter Chips Row - Second row below toolbar */}
      {hasServices && (
        <FilterChipsRow
          availableOwners={availableOwners}
          availableRuntimes={availableRuntimes}
          env={queryState.env}
          match={queryState.match}
          onClearFilters={queryState.clearFilters}
          onEnvChange={queryState.setEnv}
          onMatchChange={queryState.setMatch}
          onOwnerChange={queryState.setOwner}
          onRuntimeChange={queryState.setRuntime}
          owner={queryState.owner}
          runtime={queryState.runtime}
        />
      )}

      {/* Content Area */}
      {hasServices && hasFilteredServices && (
        <ServiceTable
          onDelete={handleDeleteService}
          onEdit={handleEditService}
          services={visibleServices}
          showHeader={false}
          yamlContent=""
        />
      )}

      {hasServices &&
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
                Try adjusting your search query or removing filters to see more
                results.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={queryState.clearFilters} variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        )}

      {!hasServices && (
        <Empty className="border-border/40 border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No services yet</EmptyTitle>
            <EmptyDescription>
              Services represent deployed software in your organization. Create
              your first service to start building your deployment inventory.
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
        onOpenChange={handleDrawerOpenChange}
        onSubmit={handleServiceSubmit}
        open={isDrawerOpen}
      />
    </>
  );
}
