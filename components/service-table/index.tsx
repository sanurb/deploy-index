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
import { ArrowDown, ArrowUp } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { NoResults, VirtualRow } from "@/components/table/core";
import { DraggableHeader } from "@/components/table/draggable-header";
import { ResizeHandle } from "@/components/table/resize-handle";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSortQuery } from "@/hooks/use-sort-query";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTableDnd } from "@/hooks/use-table-dnd";
import { useTableScroll } from "@/hooks/use-table-scroll";
import { useTableSettings } from "@/hooks/use-table-settings";
import {
  NON_REORDERABLE_COLUMNS,
  ROW_HEIGHTS,
  SORT_FIELD_MAPS,
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
 * Sort button component for table headers
 * Provides accessible, interactive sorting with visual feedback
 */
function SortButton({
  label,
  sortField,
  currentSortColumn,
  currentSortValue,
  onSort,
}: {
  readonly label: string;
  readonly sortField: string;
  readonly currentSortColumn?: string;
  readonly currentSortValue?: string;
  readonly onSort: (field: string) => void;
}) {
  const isSorted = sortField === currentSortColumn;
  const sortDirection = isSorted ? currentSortValue : undefined;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // Prevent drag when clicking sort
      e.preventDefault();
      onSort(sortField);
    },
    [onSort, sortField]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onSort(sortField);
      }
    },
    [onSort, sortField]
  );

  const ariaLabel = isSorted
    ? `Sort by ${label} (${sortDirection})`
    : `Sort by ${label}`;

  return (
    <Button
      aria-label={ariaLabel}
      className="h-auto min-w-0 max-w-full cursor-pointer space-x-2 p-0 opacity-60 transition-all hover:bg-transparent hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
      variant="ghost"
    >
      <span className="truncate">{label}</span>
      {sortDirection === "asc" && (
        <ArrowDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          role="presentation"
        />
      )}
      {sortDirection === "desc" && (
        <ArrowUp
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
          role="presentation"
        />
      )}
    </Button>
  );
}

/**
 * Renders header content with sorting support
 */
function renderHeaderContent<TData>(
  header: ReturnType<
    ReturnType<typeof useReactTable<TData>>["getHeaderGroups"]
  >[number]["headers"][number],
  columnId: string,
  sortColumn: string | undefined,
  sortValue: string | undefined,
  createSortQuery: (name: string) => void
) {
  const sortFieldMap = SORT_FIELD_MAPS[TABLE_ID];
  const sortField = sortFieldMap?.[columnId];

  // Actions column - static text
  if (columnId === "actions") {
    return (
      <span className="w-full text-center text-muted-foreground text-sm">
        Actions
      </span>
    );
  }

  // Sortable columns
  if (sortField) {
    const meta = header.column.columnDef.meta as
      | { headerLabel?: string }
      | undefined;
    const headerLabel =
      meta?.headerLabel ??
      (typeof header.column.columnDef.header === "string"
        ? header.column.columnDef.header
        : columnId);
    return (
      <div className="w-full overflow-hidden">
        <SortButton
          currentSortColumn={sortColumn}
          currentSortValue={sortValue}
          label={headerLabel}
          onSort={createSortQuery}
          sortField={sortField}
        />
      </div>
    );
  }

  // Fallback - just render the header text with hover effect
  // Non-sortable columns still get visual feedback but no interaction
  return (
    <span className="truncate opacity-60 transition-opacity hover:opacity-100">
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
    </span>
  );
}

/**
 * Renders a table header cell with appropriate styling and behavior
 */
function renderTableHeader<TData>({
  header,
  headerIndex,
  headers,
  getStickyStyle,
  getStickyClassName,
  sortColumn,
  sortValue,
  createSortQuery,
}: {
  header: ReturnType<
    ReturnType<typeof useReactTable<TData>>["getHeaderGroups"]
  >[number]["headers"][number];
  headerIndex: number;
  headers: ReturnType<
    ReturnType<typeof useReactTable<TData>>["getHeaderGroups"]
  >[number]["headers"];
  getStickyStyle: (columnId: string) => React.CSSProperties;
  getStickyClassName: (columnId: string, baseClassName?: string) => string;
  sortColumn: string | undefined;
  sortValue: string | undefined;
  createSortQuery: (name: string) => void;
}) {
  const columnId = header.column.id;
  const meta = header.column.columnDef.meta as
    | { sticky?: boolean; className?: string }
    | undefined;
  const isSticky = meta?.sticky ?? false;
  const isActions = columnId === "actions";
  const isReorderable = !NON_REORDERABLE_COLUMNS[TABLE_ID].has(columnId);

  // Check if this is the last column before actions (should flex to fill space)
  const lastHeader = headers.at(-1);
  const isLastBeforeActions =
    headerIndex === headers.length - 2 && lastHeader?.column.id === "actions";

  const headerStyle = {
    width: header.getSize(),
    minWidth: isSticky ? header.getSize() : header.column.columnDef.minSize,
    maxWidth: isSticky ? header.getSize() : undefined,
    ...getStickyStyle(columnId),
    // Only apply flex: 1 to non-sticky columns
    ...(isLastBeforeActions && !isSticky && { flex: 1 }),
  };

  // Get sort field for ARIA attributes
  const sortFieldMap = SORT_FIELD_MAPS[TABLE_ID];
  const sortField = sortFieldMap?.[columnId];
  const isSorted = sortField !== undefined && sortColumn === sortField;

  // Determine ARIA sort value for accessibility
  let ariaSortValue: "ascending" | "descending" | undefined;
  if (isSorted && sortValue === "asc") {
    ariaSortValue = "ascending";
  } else if (isSorted && sortValue === "desc") {
    ariaSortValue = "descending";
  }

  // Actions column - special styling with visible text
  if (isActions) {
    return (
      <TableHead
        className="group/header relative z-10 flex h-full items-center justify-center bg-background px-4 md:sticky md:right-0"
        key={header.id}
        scope="col"
        style={headerStyle}
      >
        {renderHeaderContent(
          header,
          columnId,
          sortColumn,
          sortValue,
          createSortQuery
        )}
        <ResizeHandle header={header} />
      </TableHead>
    );
  }

  // Sticky columns use regular TableHead (not draggable)
  if (!isReorderable) {
    const stickyClass = getStickyClassName(
      columnId,
      "group/header relative h-full px-4 border-t border-border flex items-center"
    );
    const finalClassName = `${stickyClass} bg-background z-10`;

    return (
      <TableHead
        aria-sort={ariaSortValue}
        className={finalClassName}
        key={header.id}
        scope="col"
        style={headerStyle}
      >
        <div className="min-w-0 flex-1 overflow-hidden">
          {renderHeaderContent(
            header,
            columnId,
            sortColumn,
            sortValue,
            createSortQuery
          )}
        </div>
        <ResizeHandle header={header} />
      </TableHead>
    );
  }

  // Draggable columns
  return (
    <DraggableHeader
      aria-sort={ariaSortValue}
      className={getStickyClassName(
        columnId,
        "group/header relative flex h-full items-center border-border border-t px-4"
      )}
      id={columnId}
      key={header.id}
      scope="col"
      style={headerStyle}
    >
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {renderHeaderContent(
          header,
          columnId,
          sortColumn,
          sortValue,
          createSortQuery
        )}
      </div>
      <ResizeHandle header={header} />
    </DraggableHeader>
  );
}

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
  const { sortColumn, sortValue, createSortQuery } = useSortQuery();

  // Use provided services if available, otherwise parse from YAML
  const yamlData = useServiceData(yamlContent, searchTerm);

  const filteredServices = useMemo((): GroupedService[] => {
    let services: GroupedService[];
    if (providedServices) {
      // When services are provided, they're already filtered at the page level
      services = [...providedServices];
    } else {
      // Fallback to YAML parsing with internal search
      services = [...yamlData.filteredServices];
    }

    // Apply sorting if sort query is set
    if (sortColumn && sortValue) {
      const sorted = [...services].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        // Map sort field to service property
        if (sortColumn === "name") {
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
        } else if (sortColumn === "owner") {
          aValue = a.owner.toLowerCase();
          bValue = b.owner.toLowerCase();
        } else {
          return 0;
        }

        if (aValue < bValue) {
          return sortValue === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortValue === "asc" ? 1 : -1;
        }
        return 0;
      });
      return sorted;
    }

    return services;
  }, [providedServices, yamlData.filteredServices, sortColumn, sortValue]);

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
      if (!row) {
        return;
      }

      // Open edit drawer for any column click (except actions)
      if (columnId !== "actions" && onEdit) {
        onEdit(row);
      }
    },
    [filteredServices, onEdit]
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
            data-slot="table-container"
            ref={(el) => {
              parentRef.current = el;
              tableScroll.containerRef.current = el;
            }}
            tabIndex={-1}
          >
            <Table>
              <TableHeader className="sticky top-0 z-20 border-black/10 border-b bg-background dark:border-white/5">
                <TableRow className="flex h-9 items-center hover:bg-transparent">
                  <SortableContext
                    items={reorderableColumnIds}
                    strategy={horizontalListSortingStrategy}
                  >
                    {table.getHeaderGroups().map((headerGroup) =>
                      headerGroup.headers.map((header, headerIndex, headers) =>
                        renderTableHeader({
                          createSortQuery,
                          getStickyClassName,
                          getStickyStyle,
                          header,
                          headerIndex,
                          headers,
                          sortColumn,
                          sortValue,
                        })
                      )
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
