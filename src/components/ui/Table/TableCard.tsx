import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState
} from '@tanstack/react-table';
import { Card } from '@material-tailwind/react';
import { HiSortAscending, HiSortDescending } from 'react-icons/hi';

import { TableRowSkeleton } from '@/components/ui/widgets/Loaders';

type TableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  gridColsClass: string;
  loadingState?: boolean;
  emptyText?: string;
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

function Table<TData>({
  columns,
  data,
  gridColsClass,
  loadingState,
  emptyText
}: TableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
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
                className={
                  header.column.getCanSort()
                    ? 'cursor-pointer select-none flex items-center gap-2 font-bold'
                    : 'flex items-center gap-2 font-semibold'
                }
                onClick={header.column.getToggleSortingHandler()}
              >
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
  emptyText
}: TableProps<TData>) {
  return (
    <Card className="min-h-32 overflow-y-auto">
      <Table
        columns={columns}
        data={data}
        gridColsClass={gridColsClass}
        loadingState={loadingState}
        emptyText={emptyText}
      />
    </Card>
  );
}

export { Table, TableRow, TableCard };
