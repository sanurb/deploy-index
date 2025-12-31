"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import type { RowSelectionState } from "@tanstack/react-table"
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable"

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DraggableHeader } from "@/components/table/draggable-header"
import { ResizeHandle } from "@/components/table/resize-handle"
import { VirtualRow, TableSkeleton, NoResults, type TableColumnMeta } from "@/components/table/core"
import { useTableSettings } from "@/hooks/use-table-settings"
import { useStickyColumns } from "@/hooks/use-sticky-columns"
import { useTableDnd } from "@/hooks/use-table-dnd"
import { useTableScroll } from "@/hooks/use-table-scroll"
import { STICKY_COLUMNS, NON_REORDERABLE_COLUMNS, ROW_HEIGHTS } from "@/utils/table-configs"
import { cn } from "@/lib/utils"

import { ServiceTableHeader } from "./header"
import { useServiceTableColumns } from "./columns"
import { useServiceData } from "./use-service-data"
import { exportServicesToCsv } from "./export"
import type { ServiceTableProps } from "./types"
import { TABLE_ID, NON_CLICKABLE_COLUMNS } from "./constants"

const ROW_HEIGHT = ROW_HEIGHTS[TABLE_ID]

/**
 * Main service table component - orchestrates hooks, queries and render
 */
export function ServiceTable({ yamlContent, initialSearchQuery = "" }: ServiceTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const parentRef = useRef<HTMLDivElement>(null)

  const { filteredServices } = useServiceData(yamlContent, searchTerm)
  const columns = useServiceTableColumns()

  const {
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
  } = useTableSettings({ tableId: TABLE_ID })

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
        onCellClick: useCallback(
          (rowId: string, columnId: string) => {
            const row = filteredServices.find((s) => s.id === rowId)
            if (row && columnId === "name" && row.repository) {
              window.open(row.repository, "_blank", "noopener,noreferrer")
            }
          },
          [filteredServices],
        ),
      },
    },
  })

  const { getStickyStyle, getStickyClassName } = useStickyColumns({
    columnVisibility,
    table,
    loading: false,
    stickyColumns: STICKY_COLUMNS[TABLE_ID],
  })

  const { sensors, handleDragEnd } = useTableDnd(table)

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: STICKY_COLUMNS[TABLE_ID].length,
  })

  const { rows } = table.getRowModel()
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  const handleCellClick = useCallback(
    (rowId: string, columnId: string) => {
      const row = filteredServices.find((s) => s.id === rowId)
      if (row && columnId === "name" && row.repository) {
        window.open(row.repository, "_blank", "noopener,noreferrer")
      }
    },
    [filteredServices],
  )

  const handleExportCsv = useCallback(() => {
    exportServicesToCsv(filteredServices)
  }, [filteredServices])

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const visibleColumns = table.getAllLeafColumns().filter((col) => col.getIsVisible())
  const reorderableColumnIds = visibleColumns
    .map((col) => col.id)
    .filter((id) => !NON_REORDERABLE_COLUMNS[TABLE_ID].has(id))

  return (
    <div className="space-y-3">
      <ServiceTableHeader
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onExportCsv={handleExportCsv}
        servicesCount={filteredServices.length}
      />

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
                          <TableHead key={header.id} style={headerStyle} className={headerClassName}>
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

