"use client";

import type {
  Cell,
  Column,
  ColumnDef,
  Header,
  HeaderGroup,
  Row,
  RowSelectionState,
  SortingState,
  Table,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { atom, useAtom } from "jotai";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import {
  createContext,
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type { ColumnDef } from "@tanstack/react-table";

const sortingAtom = atom<SortingState>([]);
const rowSelectionAtom = atom<RowSelectionState>({});
const selectedIndexAtom = atom<number | null>(null);

interface TableContextValue<TData = unknown> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  table: Table<TData> | null;
  selectedIndex: number | null;
  setSelectedIndex: (index: number | null) => void;
  onRowAction?: (row: TData) => void;
  gridTemplate: string;
}

export const TableContext = createContext<TableContextValue>({
  data: [],
  columns: [],
  table: null,
  selectedIndex: null,
  setSelectedIndex: () => {},
  onRowAction: undefined,
  gridTemplate: "",
});

export interface TableProviderProps<TData, TValue> {
  readonly columns: ColumnDef<TData, TValue>[];
  readonly data: TData[];
  readonly children: ReactNode;
  readonly className?: string;
  readonly onRowAction?: (row: TData) => void;
  readonly gridTemplate?: string;
}

export function TableProvider<TData, TValue>({
  columns,
  data,
  children,
  className,
  onRowAction,
  gridTemplate = "1fr",
}: TableProviderProps<TData, TValue>) {
  const [sorting, setSorting] = useAtom(sortingAtom);
  const [rowSelection, setRowSelection] = useAtom(rowSelectionAtom);
  const [selectedIndex, setSelectedIndex] = useAtom(selectedIndexAtom);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
    },
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      rowSelection,
    },
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const rowCount = data.length;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev === null) return 0;
          return Math.min(prev + 1, rowCount - 1);
        });
      }

      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev === null) return 0;
          return Math.max(prev - 1, 0);
        });
      }

      if (e.key === "Enter" && selectedIndex !== null && onRowAction) {
        e.preventDefault();
        const row = data[selectedIndex];
        if (row) {
          onRowAction(row);
        }
      }
    },
    [data, selectedIndex, setSelectedIndex, onRowAction]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (data.length > 0 && selectedIndex === null) {
      setSelectedIndex(0);
    } else if (selectedIndex !== null && selectedIndex >= data.length) {
      setSelectedIndex(Math.max(0, data.length - 1));
    }
  }, [data.length, selectedIndex, setSelectedIndex]);

  return (
    <TableContext.Provider
      value={{
        data: data as unknown[],
        columns: columns as ColumnDef<unknown, unknown>[],
        table: table as Table<unknown>,
        selectedIndex,
        setSelectedIndex,
        onRowAction: onRowAction as ((row: unknown) => void) | undefined,
        gridTemplate,
      }}
    >
      <div
        aria-label="Data table"
        className={cn("w-full", className)}
        role="table"
      >
        {children}
      </div>
    </TableContext.Provider>
  );
}

export interface TableHeadProps {
  readonly header: Header<unknown, unknown>;
  readonly className?: string;
}

export const TableHead = memo(({ header, className }: TableHeadProps) => (
  <div
    className={cn(
      "flex items-center px-4",
      "font-medium text-[11px] text-muted-foreground/60 uppercase tracking-wide",
      className
    )}
    role="columnheader"
  >
    {header.isPlaceholder
      ? null
      : flexRender(header.column.columnDef.header, header.getContext())}
  </div>
));

TableHead.displayName = "TableHead";

export interface TableHeaderGroupProps {
  readonly headerGroup: HeaderGroup<unknown>;
  readonly children: (props: { header: Header<unknown, unknown> }) => ReactNode;
}

export const TableHeaderGroup = ({
  headerGroup,
  children,
}: TableHeaderGroupProps) => {
  const { gridTemplate } = useContext(TableContext);

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: gridTemplate,
  };

  return (
    <div
      className="h-9 border-black/10 border-b dark:border-white/5"
      role="row"
      style={gridStyle}
    >
      {headerGroup.headers.map((header) => (
        <Fragment key={header.id}>{children({ header })}</Fragment>
      ))}
    </div>
  );
};

export interface TableHeaderProps {
  readonly className?: string;
  readonly children: (props: {
    headerGroup: HeaderGroup<unknown>;
  }) => ReactNode;
}

export const TableHeader = ({ className, children }: TableHeaderProps) => {
  const { table } = useContext(TableContext);

  return (
    <div className={cn(className)} role="rowgroup">
      {table?.getHeaderGroups().map((headerGroup) => (
        <Fragment key={headerGroup.id}>{children({ headerGroup })}</Fragment>
      ))}
    </div>
  );
};

export interface TableColumnHeaderProps<TData, TValue>
  extends HTMLAttributes<HTMLDivElement> {
  readonly column: Column<TData, TValue>;
  readonly title: string;
}

export function TableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: TableColumnHeaderProps<TData, TValue>) {
  const handleSortAsc = useCallback(() => {
    column.toggleSorting(false);
  }, [column]);

  const handleSortDesc = useCallback(() => {
    column.toggleSorting(true);
  }, [column]);

  if (!column.getCanSort()) {
    return (
      <span
        className={cn(
          "font-medium text-[11px] text-muted-foreground/60 uppercase tracking-wide",
          className
        )}
      >
        {title}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="-ml-3 h-7 font-medium text-[11px] text-muted-foreground/60 uppercase tracking-wide hover:text-muted-foreground data-[state=open]:bg-accent/50"
          size="sm"
          variant="ghost"
        >
          <span>{title}</span>
          {column.getIsSorted() === "desc" ? (
            <ArrowDownIcon className="ml-1.5 h-3 w-3" />
          ) : column.getIsSorted() === "asc" ? (
            <ArrowUpIcon className="ml-1.5 h-3 w-3" />
          ) : (
            <ChevronsUpDownIcon className="ml-1.5 h-3 w-3 opacity-50" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[120px]">
        <DropdownMenuItem className="text-xs" onClick={handleSortAsc}>
          <ArrowUpIcon className="mr-2 h-3 w-3 text-muted-foreground/70" />
          Ascending
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={handleSortDesc}>
          <ArrowDownIcon className="mr-2 h-3 w-3 text-muted-foreground/70" />
          Descending
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface TableCellProps {
  readonly cell: Cell<unknown, unknown>;
  readonly className?: string;
}

export const TableCell = memo(({ cell, className }: TableCellProps) => (
  <div className={cn("flex min-w-0 items-center px-4", className)} role="cell">
    {flexRender(cell.column.columnDef.cell, cell.getContext())}
  </div>
));

TableCell.displayName = "TableCell";

export interface TableRowProps {
  readonly row: Row<unknown>;
  readonly rowIndex: number;
  readonly children: (props: { cell: Cell<unknown, unknown> }) => ReactNode;
  readonly className?: string;
}

export const TableRow = memo(
  ({ row, rowIndex, children, className }: TableRowProps) => {
    const { selectedIndex, setSelectedIndex, onRowAction, gridTemplate } =
      useContext(TableContext);
    const rowRef = useRef<HTMLDivElement>(null);
    const isSelected = selectedIndex === rowIndex;

    useEffect(() => {
      if (isSelected && rowRef.current) {
        rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, [isSelected]);

    const handleClick = useCallback(() => {
      setSelectedIndex(rowIndex);
    }, [rowIndex, setSelectedIndex]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && onRowAction) {
          e.preventDefault();
          onRowAction(row.original);
        }
      },
      [onRowAction, row.original]
    );

    const gridStyle: CSSProperties = {
      display: "grid",
      gridTemplateColumns: gridTemplate,
    };

    return (
      <div
        aria-rowindex={rowIndex + 2}
        aria-selected={isSelected}
        className={cn(
          "group relative h-9 transition-colors duration-100",
          "border-black/10 border-b dark:border-white/5",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset",
          isSelected
            ? "bg-black/2 dark:bg-white/3"
            : "hover:bg-black/2 dark:hover:bg-white/2",
          className
        )}
        data-state={row.getIsSelected() ? "selected" : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={rowRef}
        role="row"
        style={gridStyle}
        tabIndex={0}
      >
        {/* Active indicator - outside flow */}
        {isSelected && (
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 w-0.5 bg-primary"
          />
        )}
        {row.getVisibleCells().map((cell) => (
          <Fragment key={cell.id}>{children({ cell })}</Fragment>
        ))}
      </div>
    );
  }
);

TableRow.displayName = "TableRow";

export interface TableBodyProps {
  readonly children: (props: {
    row: Row<unknown>;
    rowIndex: number;
  }) => ReactNode;
  readonly className?: string;
}

export const TableBody = ({ children, className }: TableBodyProps) => {
  const { table } = useContext(TableContext);
  const rows = table?.getRowModel().rows;

  return (
    <div className={cn(className)} role="rowgroup">
      {rows?.length ? (
        rows.map((row, index) => (
          <Fragment key={row.id}>{children({ row, rowIndex: index })}</Fragment>
        ))
      ) : (
        <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">
          No results.
        </div>
      )}
    </div>
  );
};
