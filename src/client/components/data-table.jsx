import { useEffect, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftDoubleIcon,
  ArrowRight01Icon,
  ArrowRightDoubleIcon,
  ArrowUp01Icon,
  Search01Icon,
  SlidersHorizontalIcon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

const PAGE_SIZES = [10, 25, 50, 100];

export const DEFAULT_QUERY_STATE = {
  page: 0,
  perPage: 10,
  search: "",
  sortBy: null,
  sortDir: "desc",
};

// ── Column header with sort ───────────────────────────────────
export function DataTableColumnHeader({ column, title, className }) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  const handleSort = () => {
    if (!sorted) column.toggleSorting(false);
    else if (sorted === "asc") column.toggleSorting(true);
    else column.clearSorting();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="ghost" size="sm" className="-ml-2" onClick={handleSort}>
        <span>{title}</span>
        <HugeiconsIcon
          icon={
            sorted === "desc"
              ? ArrowDown01Icon
              : sorted === "asc"
                ? ArrowUp01Icon
                : UnfoldMoreIcon
          }
          strokeWidth={2}
          className="ml-1 size-3 text-muted-foreground"
        />
      </Button>
    </div>
  );
}

// ── Column visibility toggle ──────────────────────────────────
function DataTableViewOptions({ table }) {
  const columns = table
    .getAllColumns()
    .filter((col) => typeof col.accessorFn !== "undefined" && col.getCanHide());

  if (columns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={SlidersHorizontalIcon} strokeWidth={2} />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.id}
            className="capitalize"
            checked={col.getIsVisible()}
            onCheckedChange={(value) => col.toggleVisibility(!!value)}
          >
            {col.columnDef.meta?.label ?? col.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Pagination ────────────────────────────────────────────────
function DataTablePagination({ table }) {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount() || 1;

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <div />
      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger size="sm" className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">First page</span>
            <HugeiconsIcon icon={ArrowLeftDoubleIcon} strokeWidth={2} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Previous page</span>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Next page</span>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Last page</span>
            <HugeiconsIcon icon={ArrowRightDoubleIcon} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main DataTable ────────────────────────────────────────────
export function DataTable({
  columns,
  data,
  total,
  state,
  onStateChange,
  loading = false,
  searchPlaceholder = "Search...",
  toolbar,
  emptyText = "No results.",
  initialColumnVisibility = {},
  className,
}) {
  const [columnVisibility, setColumnVisibility] = useState(initialColumnVisibility);
  const [searchInput, setSearchInput] = useState(state.search ?? "");

  useEffect(() => {
    setSearchInput(state.search ?? "");
  }, [state.search]);

  useEffect(() => {
    if (searchInput === (state.search ?? "")) return;
    const t = setTimeout(() => {
      onStateChange({ ...state, search: searchInput, page: 0 });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageCount = Math.max(1, Math.ceil(total / Math.max(1, state.perPage)));

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    state: {
      sorting: state.sortBy
        ? [{ id: state.sortBy, desc: state.sortDir === "desc" }]
        : [],
      pagination: { pageIndex: state.page, pageSize: state.perPage },
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater(
              state.sortBy
                ? [{ id: state.sortBy, desc: state.sortDir === "desc" }]
                : [],
            )
          : updater;
      const s = next[0];
      onStateChange({
        ...state,
        sortBy: s?.id ?? null,
        sortDir: s?.desc ? "desc" : "asc",
        page: 0,
      });
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: state.page, pageSize: state.perPage })
          : updater;
      onStateChange({ ...state, page: next.pageIndex, perPage: next.pageSize });
    },
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search + toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-7"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {toolbar}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width:
                        header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(state.perPage, 5) }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={table.getVisibleLeafColumns().length}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
