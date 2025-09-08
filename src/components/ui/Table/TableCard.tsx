import React from 'react';
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { Card, Input } from '@material-tailwind/react';
import {
  HiSortAscending,
  HiSortDescending,
  HiOutlineSwitchVertical
} from 'react-icons/hi';

import { TableRowSkeleton } from '@/components/ui/widgets/Loaders';

type TableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  gridColsClass: string;
  loadingState?: boolean;
  emptyText?: string;
  enableColumnSearch?: boolean;
};

function TableRow({
  gridColsClass,
  children
}: {
  gridColsClass: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid ${gridColsClass} justify-items-start gap-4 px-4 py-4 border-b border-surface last:border-0 items-start`}
    >
      {children}
    </div>
  );
}

// Follows example here: https://tanstack.com/table/latest/docs/framework/react/examples/filters
function DebouncedInput({
  column,
  debounce = 500
}: {
  column: Column<any, unknown>;
  debounce?: number;
}) {
  const initialValue = (column.getFilterValue() as string) || '';
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      column.setFilterValue(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [value, debounce, column]);

  return (
    <div onClick={e => e.stopPropagation()}>
      <Input
        type="search"
        placeholder="Search..."
        value={value}
        onChange={e => setValue(e.target.value)}
        className={`w-36 border shadow rounded hidden hover:block focus:block group-hover/filter:block group-focus/filter:block ${value ? 'block' : ''}`}
      />
    </div>
  );
}

function Table<TData>({
  columns,
  data,
  gridColsClass,
  loadingState,
  emptyText,
  enableColumnSearch
}: TableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters
    },
    enableColumnFilters: enableColumnSearch || false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <>
      <div
        className={`grid ${gridColsClass} gap-4 px-4 py-2 border-b border-surface dark:border-foreground`}
      >
        {table.getHeaderGroups().map(headerGroup =>
          headerGroup.headers.map(header =>
            header.isPlaceholder ? null : (
              <div
                className={`flex flex-col
                    ${
                      header.column.getCanSort()
                        ? 'cursor-pointer group/sort'
                        : ''
                    } ${header.column.getCanFilter() ? 'group/filter' : ''}`}
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
              >
                <div className="flex items-center gap-2 font-semibold select-none">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  {{
                    asc: (
                      <HiSortAscending className="icon-default text-foreground" />
                    ),
                    desc: (
                      <HiSortDescending className="icon-default text-foreground" />
                    )
                  }[header.column.getIsSorted() as string] ?? null}
                  <HiOutlineSwitchVertical
                    className={`icon-default text-foreground opacity-0 group-hover/sort:opacity-60 group-focus/sort:opacity-80 ${(header.column.getIsSorted() as string) ? 'hidden' : ''}`}
                  />
                </div>
                {header.column.getCanFilter() ? (
                  <DebouncedInput column={header.column} />
                ) : null}
              </div>
            )
          )
        )}
      </div>

      {/* Body */}
      {loadingState ? (
        <TableRowSkeleton gridColsClass={gridColsClass} />
      ) : data && data.length > 0 ? (
        table.getRowModel().rows.map(row => (
          <TableRow key={row.id} gridColsClass={gridColsClass}>
            {row
              .getVisibleCells()
              .map(cell =>
                flexRender(cell.column.columnDef.cell, cell.getContext())
              )}
          </TableRow>
        ))
      ) : !data || data.length === 0 ? (
        <div className="px-4 py-8 text-center text-foreground">
          {emptyText || 'No data available'}
        </div>
      ) : (
        <div className="px-4 py-8 text-center text-foreground">
          There was an error loading the data.
        </div>
      )}
    </>
  );
}

function TableCard<TData>({
  columns,
  data,
  gridColsClass,
  loadingState,
  emptyText,
  enableColumnSearch
}: TableProps<TData>) {
  return (
    <Card className="min-h-32 overflow-y-auto">
      <Table
        columns={columns}
        data={data}
        gridColsClass={gridColsClass}
        loadingState={loadingState}
        emptyText={emptyText}
        enableColumnSearch={enableColumnSearch}
      />
    </Card>
  );
}

export { Table, TableRow, TableCard };
