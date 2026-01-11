"use client";

import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  NoResults,
  type TableColumnMeta,
  VirtualRow,
} from "@/components/table/core";
import { DraggableHeader } from "@/components/table/draggable-header";
import { ResizeHandle } from "@/components/table/resize-handle";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import { cn } from "@/lib/utils";
import {
  NON_REORDERABLE_COLUMNS,
  ROW_HEIGHTS,
  STICKY_COLUMNS,
} from "@/utils/table-configs";
import { useServiceTableColumns } from "./columns";
import { NON_CLICKABLE_COLUMNS, TABLE_ID } from "./constants";
import { exportServicesToCsv } from "./export";
import { ServiceTableHeader } from "./header";
import type { GroupedService, ServiceTableProps } from "./types";
import { useServiceData } from "./use-service-data";

const ROW_HEIGHT = ROW_HEIGHTS[TABLE_ID];

/**
 * Main service table component - orchestrates hooks, queries and render
 */
export function ServiceTable({
  yamlContent = "",
  services: providedServices,
  initialSearchQuery = "",
  onSearchChange,
  showHeader = true,
  onEdit,
  onDelete,
}: ServiceTableProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const parentRef = useRef<HTMLDivElement>(null);

  // Use provided services if available, otherwise parse from YAML
  const yamlData = useServiceData(yamlContent, searchTerm);

  const filteredServices = useMemo((): GroupedService[] => {
    if (providedServices) {
      // When services are provided, they're already filtered at the page level
      // Just return them as-is
      return [...providedServices];
    }

    // Fallback to YAML parsing with internal search
    return [...yamlData.filteredServices];
  }, [providedServices, yamlData.filteredServices]);

  const columns = useServiceTableColumns({
    onEdit:
      onEdit ??
      (() => {
        // No-op: default callback when onEdit is not provided
      }),
    onDelete:
      onDelete ??
      (() => {
        // No-op: default callback when onDelete is not provided
      }),
  });

  const {
    columnVisibility,
    setColumnVisibility,
    columnSizing,
    setColumnSizing,
    columnOrder,
    setColumnOrder,
  } = useTableSettings({ tableId: TABLE_ID });

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
            const row = filteredServices.find((s) => s.id === rowId);
            if (row && columnId === "name" && row.repository) {
              window.open(row.repository, "_blank", "noopener,noreferrer");
            }
          },
          [filteredServices]
        ),
      },
    },
  });

  const { getStickyStyle, getStickyClassName } = useStickyColumns({
    columnVisibility,
    table,
    loading: false,
    stickyColumns: STICKY_COLUMNS[TABLE_ID],
  });

  const { sensors, handleDragEnd } = useTableDnd(table);

  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: STICKY_COLUMNS[TABLE_ID].length,
  });

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleCellClick = useCallback(
    (rowId: string, columnId: string) => {
      const row = filteredServices.find((s) => s.id === rowId);
      if (row && columnId === "name" && row.repository) {
        window.open(row.repository, "_blank", "noopener,noreferrer");
      }
    },
    [filteredServices]
  );

  const handleExportCsv = useCallback(() => {
    exportServicesToCsv(filteredServices);
  }, [filteredServices]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  const visibleColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getIsVisible());
  const reorderableColumnIds = visibleColumns
    .map((col) => col.id)
    .filter((id) => !NON_REORDERABLE_COLUMNS[TABLE_ID].has(id));

  return (
    <div className="space-y-3">
      {showHeader && (
        <ServiceTableHeader
          onExportCsv={handleExportCsv}
          onSearchChange={handleSearchChange}
          searchTerm={searchTerm}
          servicesCount={filteredServices.length}
        />
      )}

      {filteredServices.length === 0 ? (
        <NoResults onClear={() => handleSearchChange("")} />
      ) : (
        <DndContext
          collisionDetection={closestCenter}
          id={`services-table-dnd-${TABLE_ID}`}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <div
            className="overflow-auto overscroll-x-none"
            ref={(el) => {
              parentRef.current = el;
              tableScroll.containerRef.current = el;
            }}
          >
            <Table>
              <TableHeader className="sticky top-0 z-20 border-black/10 border-b bg-background dark:border-white/5">
                <TableRow className="flex h-9 items-center hover:bg-transparent">
                  <SortableContext
                    items={reorderableColumnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    {table.getHeaderGroups().map((headerGroup) =>
                      headerGroup.headers.map((header) => {
                        const columnId = header.column.id;
                        const meta = header.column.columnDef.meta as
                          | TableColumnMeta
                          | undefined;
                        const isSticky = meta?.sticky ?? false;
                        const isActions = columnId === "actions";
                        const isReorderable =
                          !NON_REORDERABLE_COLUMNS[TABLE_ID].has(columnId);
                        const headerStyle = {
                          width: header.getSize(),
                          ...getStickyStyle(columnId),
                        };
                        const headerClassName = getStickyClassName(
                          columnId,
                          cn(
                            "group/header relative flex h-full items-center px-4",
                            isActions &&
                              "z-10 justify-center bg-background md:sticky md:right-0",
                            isSticky && "z-10 bg-background"
                          )
                        );

                        return isReorderable ? (
                          <DraggableHeader
                            className={headerClassName}
                            id={columnId}
                            key={header.id}
                            style={headerStyle}
                          >
                            <div className="min-w-0 flex-1 overflow-hidden">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </div>
                            <ResizeHandle header={header} />
                          </DraggableHeader>
                        ) : (
                          <TableHead
                            className={headerClassName}
                            key={header.id}
                            style={headerStyle}
                          >
                            <div className="min-w-0 flex-1 overflow-hidden">
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </div>
                            <ResizeHandle header={header} />
                          </TableHead>
                        );
                      })
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
                {rowVirtualizer
                  .getVirtualItems()
                  .map((virtualRow: { index: number; start: number }) => {
                    const row = rows[virtualRow.index];
                    return (
                      <VirtualRow
                        columnOrder={columnOrder}
                        columnSizing={columnSizing}
                        columnVisibility={columnVisibility}
                        getStickyClassName={getStickyClassName}
                        getStickyStyle={getStickyStyle}
                        isSelected={rowSelection[row.id] === true}
                        key={row.id}
                        nonClickableColumns={NON_CLICKABLE_COLUMNS}
                        onCellClick={handleCellClick}
                        row={row}
                        rowHeight={ROW_HEIGHT}
                        virtualStart={virtualRow.start}
                      />
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </DndContext>
      )}
    </div>
  );
}
