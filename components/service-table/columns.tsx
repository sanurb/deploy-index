"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { EnvBadges, DomainsAffordance, RuntimeFootprint, RowActions } from "./cells"
import type { GroupedService } from "./types"
import type { TableColumnMeta } from "@/components/table/core"

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
          <div className="flex items-center h-5">
            <span className="text-[13px] font-medium text-foreground leading-none truncate">
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
        cell: ({ row }) => <EnvBadges environments={row.original.environments} />,
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
            environments={row.original.environments}
            domainsCount={row.original.domainsCount}
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
        cell: ({ row }) => <RuntimeFootprint runtimeFootprint={row.original.runtimeFootprint} />,
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
          <div className="flex items-center h-5">
            <span className="text-[11px] text-muted-foreground/80 truncate leading-none">
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
    [],
  )
}

