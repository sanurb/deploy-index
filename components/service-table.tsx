"use client"

import { memo, useState, useMemo, useEffect, useCallback, useRef } from "react"
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { Copy, Download, ExternalLink, Search, Terminal } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DraggableHeader } from "@/components/table/draggable-header"
import { ResizeHandle } from "@/components/table/resize-handle"
import { VirtualRow, TableSkeleton, EmptyState, NoResults, type TableColumnMeta } from "@/components/table/core"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { STICKY_COLUMNS, SORT_FIELD_MAPS, NON_REORDERABLE_COLUMNS, ROW_HEIGHTS } from "@/utils/table-configs"
import { parseYaml, type Service } from "@/lib/yaml-utils"
import { cn } from "@/lib/utils"

const TABLE_ID = "services" as const
const ROW_HEIGHT = ROW_HEIGHTS[TABLE_ID]
const NON_CLICKABLE_COLUMNS = new Set(["actions"])

interface ServiceTableProps {
  readonly yamlContent: string
  readonly initialSearchQuery: string | undefined
}

interface EnvironmentInfo {
  readonly env: "production" | "staging" | "development"
  readonly domain: string
  readonly branch: string | null
  readonly runtimeType: string | null
  readonly runtimeId: string | null
}

interface GroupedService {
  readonly id: string
  readonly serviceIndex: number
  readonly name: string
  readonly owner: string
  readonly repository: string
  readonly dependencies: readonly string[]
  readonly environments: readonly EnvironmentInfo[]
  readonly domainsCount: number
  readonly runtimeFootprint: readonly string[]
}

const ENV_ORDER: readonly ["production", "staging", "development"] = ["production", "staging", "development"]

const ENV_LABELS = {
  production: "PROD",
  staging: "STAGE",
  development: "DEV",
} as const

const RUNTIME_LABELS: Record<string, string> = {
  ec2: "EC2",
  vm: "VM",
  k8s: "K8S",
  lambda: "λ",
  container: "CTR",
  paas: "PAAS",
} as const

function normalizeEnv(env: string | null): "production" | "staging" | "development" | null {
  if (!env) return null
  const normalized = env.toLowerCase()
  if (normalized === "production" || normalized === "prod") return "production"
  if (normalized === "staging" || normalized === "stage") return "staging"
  if (normalized === "development" || normalized === "dev") return "development"
  return null
}

function sortEnvironments(envs: readonly EnvironmentInfo[]): readonly EnvironmentInfo[] {
  return [...envs].sort((a, b) => ENV_ORDER.indexOf(a.env) - ENV_ORDER.indexOf(b.env))
}

function computeRuntimeFootprint(environments: readonly EnvironmentInfo[]): readonly string[] {
  const types = new Set<string>()
  for (const env of environments) {
    if (env.runtimeType) types.add(env.runtimeType)
  }
  return Array.from(types).sort()
}

function groupServicesByService(services: readonly Service[]): readonly GroupedService[] {
  return services.map((service, serviceIndex) => {
    const environments: EnvironmentInfo[] = []

    // Process all interfaces that have a domain
    // This ensures we capture all domains regardless of env validity
    if (service.interfaces && service.interfaces.length > 0) {
      for (const iface of service.interfaces) {
          
          environments.push({
            env,
            domain: iface.domain.trim(),
            branch: iface.branch?.trim() ?? null,
            runtimeType: iface.runtime?.type ?? null,
            runtimeId: iface.runtime?.id ?? null,
          })
        }
      }
    }

    const sortedEnvs = sortEnvironments(environments)

    return {
      id: `service-${serviceIndex}`,
      serviceIndex,
      name: service.name,
      owner: service.owner,
      repository: service.repository,
      dependencies: service.dependencies ?? [],
      environments: sortedEnvs,
      domainsCount: sortedEnvs.length,
      runtimeFootprint: computeRuntimeFootprint(sortedEnvs),
    }
  })
}

function calculateSearchScore(service: GroupedService, query: string): number {
  const lowerQuery = query.toLowerCase()
  let score = 0

  if (service.name.toLowerCase().includes(lowerQuery)) score += 100
  if (service.owner.toLowerCase().includes(lowerQuery)) score += 50

  for (const env of service.environments) {
    if (env.domain.toLowerCase().includes(lowerQuery)) score += 150
    if (env.branch?.toLowerCase().includes(lowerQuery)) score += 30
    if (env.env === lowerQuery || ENV_LABELS[env.env].toLowerCase() === lowerQuery) score += 20
    if (env.runtimeType?.toLowerCase().includes(lowerQuery)) score += 25
  }

  return score
}

/**
 * ENV badges - stable wrapper with consistent height
 */
interface EnvBadgesProps {
  readonly environments: readonly EnvironmentInfo[]
}

const EnvBadges = memo(function EnvBadges({ environments }: EnvBadgesProps) {
  const uniqueEnvs = [...new Set(environments.map((e) => e.env))]
  const sortedEnvs = uniqueEnvs.sort((a, b) => ENV_ORDER.indexOf(a) - ENV_ORDER.indexOf(b))

  return (
    <div className="flex items-center gap-1.5 h-5">
      {sortedEnvs.length === 0 ? (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      ) : (
        sortedEnvs.map((env) => (
          <div key={env} className="inline-flex items-center gap-1">
            {env === "production" && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" aria-label="Production" />
            )}
            <span className="text-[11px] font-mono text-muted-foreground/80 uppercase tracking-wide leading-none">
              {ENV_LABELS[env]}
            </span>
          </div>
        ))
      )}
    </div>
  )
})

/**
 * Domains affordance - clickable with popover
 */
interface DomainsAffordanceProps {
  readonly environments: readonly EnvironmentInfo[]
  readonly domainsCount: number
}

const DomainsAffordance = memo(function DomainsAffordance({ environments, domainsCount }: DomainsAffordanceProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyDomain = useCallback((domain: string) => {
    void navigator.clipboard.writeText(domain)
    setIsOpen(false)
  }, [])

  return (
    <div className="flex items-center h-5">
      {domainsCount === 0 ? (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      ) : (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground hover:underline underline-offset-2 decoration-muted-foreground/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm leading-none"
              onClick={(e) => e.stopPropagation()}
            >
              {domainsCount} {domainsCount === 1 ? "domain" : "domains"}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 p-3 dark:border-white/10 border-black/10 shadow-lg"
            side="bottom"
            align="start"
            sideOffset={4}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <div className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wide mb-2 px-1">
                Domains ({environments.length})
              </div>
              {environments.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 py-2 px-1">No domains configured</div>
              ) : (
                environments.map((env, idx) => (
                  <div
                    key={`${env.domain}-${env.env}-${idx}`}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group/item"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="inline-flex items-center gap-1.5 shrink-0">
                        {env.env === "production" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" aria-label="Production" />
                        )}
                        <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wide min-w-12">
                          {ENV_LABELS[env.env]}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-mono text-foreground truncate font-medium">
                          {env.domain}
                        </span>
                        {env.branch && (
                          <span className="text-[10px] font-mono text-muted-foreground/50 truncate">
                            branch: {env.branch}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDomain(env.domain)}
                      className="p-1.5 hover:bg-muted rounded transition-colors shrink-0 opacity-0 group-hover/item:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      aria-label={`Copy ${env.domain}`}
                      title="Copy domain"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
})

/**
 * Runtime footprint - stable wrapper
 */
interface RuntimeFootprintProps {
  readonly runtimeFootprint: readonly string[]
}

const RuntimeFootprint = memo(function RuntimeFootprint({ runtimeFootprint }: RuntimeFootprintProps) {
  const display = runtimeFootprint.length > 0
    ? runtimeFootprint.map((rt) => RUNTIME_LABELS[rt] ?? rt.toUpperCase()).join("·")
    : null

  return (
    <div className="flex items-center h-5">
      {display ? (
        <span className="text-[11px] font-mono text-muted-foreground/70 leading-none">{display}</span>
      ) : (
        <span className="text-[11px] font-mono text-muted-foreground/40">—</span>
      )}
    </div>
  )
})

/**
 * Row actions - always present, opacity changes on hover
 */
interface RowActionsProps {
  readonly service: GroupedService
}

const RowActions = memo(function RowActions({ service }: RowActionsProps) {
  const handleCopyPrimaryDomain = useCallback(() => {
    const primaryEnv = service.environments.find((e) => e.env === "production") ?? service.environments[0]
    if (primaryEnv) {
      void navigator.clipboard.writeText(primaryEnv.domain)
    }
  }, [service.environments])

  const handleOpenRepository = useCallback(() => {
    if (service.repository) {
      window.open(service.repository, "_blank", "noopener,noreferrer")
    }
  }, [service.repository])

  const handleRuntimeAction = useCallback(() => {
    const runtimeEnv = service.environments.find((e) => e.runtimeType && e.runtimeId)
    if (!runtimeEnv || !runtimeEnv.runtimeId) return

    if (runtimeEnv.runtimeType === "ec2" && runtimeEnv.runtimeId.startsWith("i-")) {
      const url = `https://console.aws.amazon.com/systems-manager/session-manager/${runtimeEnv.runtimeId}`
      window.open(url, "_blank", "noopener,noreferrer")
    } else if (runtimeEnv.runtimeType === "k8s" && runtimeEnv.runtimeId.includes("/")) {
      const [cluster, namespace] = runtimeEnv.runtimeId.split("/")
      const hint = `kubectl --context ${cluster} -n ${namespace} get pods`
      void navigator.clipboard.writeText(hint)
    }
  }, [service.environments])

  const hasRuntimeAction = service.environments.some(
    (e) =>
      e.runtimeType &&
      e.runtimeId &&
      ((e.runtimeType === "ec2" && e.runtimeId.startsWith("i-")) ||
        (e.runtimeType === "k8s" && e.runtimeId.includes("/"))),
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-0.5 h-5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
        {service.repository && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenRepository()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="View repository"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">View</TooltipContent>
          </Tooltip>
        )}
        {service.domainsCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyPrimaryDomain()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Copy primary domain"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Copy</TooltipContent>
          </Tooltip>
        )}
        {hasRuntimeAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRuntimeAction()
                }}
                className="p-1 rounded transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Open runtime"
              >
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Runtime</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
})

export function ServiceTable({ yamlContent, initialSearchQuery = "" }: ServiceTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [loading, setLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  // Table settings
  const {
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
  } = useTableSettings({ tableId: TABLE_ID })

  // Parse and group services
  const groupedServices = useMemo(() => {
    try {
      const parsed = parseYaml(yamlContent)
      return groupServicesByService(parsed.services)
    } catch {
      return []
    }
  }, [yamlContent])

  // Filter services
  const filteredServices = useMemo((): GroupedService[] => {
    if (!searchTerm.trim()) return [...groupedServices]

    return groupedServices
      .map((service) => ({ service, score: calculateSearchScore(service, searchTerm) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ service }) => service)
  }, [groupedServices, searchTerm])

  // Column definitions with meta
  const columns = useMemo<ColumnDef<GroupedService>[]>(
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

  // Table instance
  const table = useReactTable({
    getRowId: (row) => row.id,
    data: filteredServices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      rowSelection,
      columnVisibility,
      columnSizing,
      columnOrder,
    },
    meta: {
      callbacks: {
        onCellClick: useCallback((rowId: string, columnId: string) => {
          const row = filteredServices.find((s) => s.id === rowId)
          if (row && columnId === "name" && row.repository) {
            window.open(row.repository, "_blank", "noopener,noreferrer")
          }
        }, [filteredServices]),
      },
    },
  })

  // Sticky columns
  const { getStickyStyle, getStickyClassName } = useStickyColumns({
    columnVisibility,
    table,
    loading,
    stickyColumns: STICKY_COLUMNS[TABLE_ID],
  })

  // Drag and drop
  const { sensors, handleDragEnd } = useTableDnd(table)

  // Table scroll
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: STICKY_COLUMNS[TABLE_ID].length,
  })

  // Virtualizer
  const { rows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault()
      searchInputRef.current?.focus()
    }
    if (e.key === "Escape") {
      searchInputRef.current?.blur()
    }
  }, [])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  // CSV export
  const exportToCsv = useCallback(() => {
    const csvRows: string[][] = []
    for (const service of filteredServices) {
      if (service.environments.length === 0) {
        csvRows.push([service.name, service.owner, service.repository, "—", "—", "—", "—", "—"])
      } else {
        for (const env of service.environments) {
          csvRows.push([
            service.name,
            service.owner,
            service.repository,
            env.domain,
            ENV_LABELS[env.env],
            env.branch ?? "—",
            env.runtimeType ?? "—",
            env.runtimeId ?? "—",
          ])
        }
      }
    }

    const csvContent = [
      ["Service", "Owner", "Repository", "Domain", "Environment", "Branch", "Runtime Type", "Runtime ID"].join(","),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "services-export.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }, [filteredServices])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleCellClick = useCallback(
    (rowId: string, columnId: string) => {
      const row = filteredServices.find((s) => s.id === rowId)
      if (row && columnId === "name" && row.repository) {
        window.open(row.repository, "_blank", "noopener,noreferrer")
      }
    },
    [filteredServices],
  )

  const visibleColumns = table.getAllLeafColumns().filter((col) => col.getIsVisible())
  const reorderableColumnIds = visibleColumns
    .map((col) => col.id)
    .filter((id) => !NON_REORDERABLE_COLUMNS[TABLE_ID].has(id))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
            <Input
              ref={searchInputRef}
              placeholder="Search... (Press / to focus)"
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-8 h-9 text-sm dark:border-white/5 border-black/10"
              aria-label="Search services"
              disabled
            />
          </div>
          <button
            type="button"
            disabled
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-white/5 border-black/10 border"
          >
            <Download className="h-3.5 w-3.5 inline mr-1.5" />
            CSV
          </button>
        </div>
        <TableSkeleton
          columns={columns}
          columnVisibility={columnVisibility}
          columnSizing={columnSizing}
          columnOrder={columnOrder}
          stickyColumnIds={STICKY_COLUMNS[TABLE_ID].map((c) => c.id)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
          <Input
            ref={searchInputRef}
            placeholder="Search... (Press / to focus)"
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-8 h-9 text-sm dark:border-white/5 border-black/10"
            aria-label="Search services"
          />
        </div>
        <button
          type="button"
          onClick={exportToCsv}
          className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-white/5 border-black/10 border"
          aria-label="Export to CSV"
        >
          <Download className="h-3.5 w-3.5 inline mr-1.5" />
          CSV
        </button>
      </div>

      {/* Count */}
      <div className="text-[11px] text-muted-foreground/60" aria-live="polite" aria-atomic="true">
        {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"}
      </div>

      {/* Table */}
      {filteredServices.length === 0 ? (
        <NoResults onClear={() => setSearchTerm("")} />
      ) : (
        <DndContext
          id={`services-table-dnd-${TABLE_ID}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={(el) => {
              parentRef.current = el
              tableScroll.containerRef.current = el
            }}
            className="overflow-auto overscroll-x-none"
          >
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background border-b dark:border-white/5 border-black/10">
                <TableRow className="h-9 hover:bg-transparent flex items-center">
                  <SortableContext items={reorderableColumnIds} strategy={horizontalListSortingStrategy}>
                    {table.getHeaderGroups().map((headerGroup) =>
                      headerGroup.headers.map((header) => {
                        const columnId = header.column.id
                        const meta = header.column.columnDef.meta as TableColumnMeta | undefined
                        const isSticky = meta?.sticky ?? false
                        const isActions = columnId === "actions"
                        const isReorderable = !NON_REORDERABLE_COLUMNS[TABLE_ID].has(columnId)
                        const headerStyle = {
                          width: header.getSize(),
                          ...getStickyStyle(columnId),
                        }
                        const headerClassName = getStickyClassName(
                          columnId,
                          cn(
                            "group/header relative h-full px-4 flex items-center",
                            isActions && "justify-center md:sticky md:right-0 bg-background z-10",
                            isSticky && "bg-background z-10",
                          ),
                        )

                        return isReorderable ? (
                          <DraggableHeader
                            key={header.id}
                            id={columnId}
                            style={headerStyle}
                            className={headerClassName}
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                            <ResizeHandle header={header} />
                          </DraggableHeader>
                        ) : (
                          <TableHead
                            key={header.id}
                            style={headerStyle}
                            className={headerClassName}
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </div>
                            <ResizeHandle header={header} />
                          </TableHead>
                        )
                      }),
                    )}
                  </SortableContext>
                </TableRow>
              </TableHeader>
              <TableBody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow: { index: number; start: number }) => {
                  const row = rows[virtualRow.index]
                  return (
                    <VirtualRow
                      key={row.id}
                      row={row}
                      virtualStart={virtualRow.start}
                      rowHeight={ROW_HEIGHT}
                      getStickyStyle={getStickyStyle}
                      getStickyClassName={getStickyClassName}
                      nonClickableColumns={NON_CLICKABLE_COLUMNS}
                      onCellClick={handleCellClick}
                      columnSizing={columnSizing}
                      columnOrder={columnOrder}
                      columnVisibility={columnVisibility}
                      isSelected={rowSelection[row.id] === true}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </DndContext>
      )}
    </div>
  )
}
