"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { TableColumnMeta } from "@/components/table/core";
import {
  DomainsAffordance,
  EnvBadges,
  RowActions,
  RuntimeFootprint,
} from "./cells";
import type { GroupedService } from "./types";

/**
 * Creates column definitions for the service table
 */
export function useServiceTableColumns(): ColumnDef<GroupedService>[] {
  return useMemo<ColumnDef<GroupedService>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: () => <span>Service</span>,
        cell: ({ row }) => (
          <div className="flex h-5 items-center">
            <span className="truncate font-medium text-[13px] text-foreground leading-none">
              {row.original.name}
            </span>
          </div>
        ),
        size: 180,
        minSize: 120,
        maxSize: 400,
        meta: {
          sticky: true,
          headerLabel: "Service",
        } as TableColumnMeta,
      },
      {
        id: "environments",
        header: () => <span>Env</span>,
        cell: ({ row }) => (
          <EnvBadges environments={row.original.environments} />
        ),
        size: 140,
        minSize: 100,
        maxSize: 200,
        meta: {
          headerLabel: "Env",
        } as TableColumnMeta,
      },
      {
        id: "domains",
        header: () => <span>Domains</span>,
        cell: ({ row }) => (
          <DomainsAffordance
            domainsCount={row.original.domainsCount}
            environments={row.original.environments}
          />
        ),
        size: 110,
        minSize: 80,
        maxSize: 150,
        meta: {
          headerLabel: "Domains",
        } as TableColumnMeta,
      },
      {
        id: "runtime",
        header: () => <span>Runtime</span>,
        cell: ({ row }) => (
          <RuntimeFootprint runtimeFootprint={row.original.runtimeFootprint} />
        ),
        size: 90,
        minSize: 70,
        maxSize: 120,
        meta: {
          headerLabel: "Runtime",
        } as TableColumnMeta,
      },
      {
        id: "owner",
        accessorKey: "owner",
        header: () => <span>Owner</span>,
        cell: ({ row }) => (
          <div className="flex h-5 items-center">
            <span className="truncate text-[11px] text-muted-foreground/80 leading-none">
              {row.original.owner}
            </span>
          </div>
        ),
        size: 150,
        minSize: 120,
        maxSize: 200,
        meta: {
          headerLabel: "Owner",
        } as TableColumnMeta,
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => <RowActions service={row.original} />,
        size: 72,
        enableResizing: false,
        meta: {
          headerLabel: "",
        } as TableColumnMeta,
      },
    ],
    []
  );
}
