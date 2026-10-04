'use client'

import {
  FlexRender,
  type Row,
  type RowData,
  Subscribe,
  type Table as TanstackTable,
} from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import * as React from 'react'

import type { DataTableFeatures } from '@/lib/data-table-features'

import { getColumnPinningStyle, getColumnSizingStyle } from '@/lib/data-table-utils'
import { DataTablePagination } from '@/components/data-table/data-table-pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Every body row gets the same height so paging never shifts the layout; cells must fit within it
const ROW_HEIGHT_CLASS_NAME = 'h-12'

const PINNED_CELL_CLASS_NAME = cn(
  'bg-card transition-colors',
  'group-hover/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]',
  'group-has-aria-expanded/row:bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]',
  'group-data-[state=selected]/row:bg-muted'
)

interface DataTableProps<TData extends RowData> extends React.ComponentProps<'div'> {
  table: TanstackTable<DataTableFeatures, TData>
  actionBar?: React.ReactNode
}

export function DataTable<TData extends RowData>({
  table,
  actionBar,
  children,
  className,
  ...props
}: DataTableProps<TData>) {
  return (
    <div className={cn('flex w-full flex-col gap-2.5 overflow-auto', className)} {...props}>
      {children}
      <div className="overflow-hidden rounded-lg border">
        <DataTableLayout table={table}>
          <DataTableHeader table={table} />
          <DataTableBody table={table} />
        </DataTableLayout>
      </div>
      <div className="flex flex-col gap-2.5">
        <DataTablePagination table={table} />
        {actionBar ? <DataTableActionBar table={table} actionBar={actionBar} /> : null}
      </div>
    </div>
  )
}

interface DataTableLayoutProps<TData extends RowData> {
  table: TanstackTable<DataTableFeatures, TData>
  children: React.ReactNode
}

function DataTableLayout<TData extends RowData>({ table, children }: DataTableLayoutProps<TData>) {
  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnSizing: state.columnSizing,
        columnVisibility: state.columnVisibility,
      })}
    >
      {() => (
        <Table className="table-fixed" style={getColumnSizingStyle(table)} scrollFadeStart={table.getStartTotalSize()}>
          {children}
        </Table>
      )}
    </Subscribe>
  )
}

interface DataTableHeaderProps<TData extends RowData> {
  table: TanstackTable<DataTableFeatures, TData>
}

function DataTableHeader<TData extends RowData>({ table }: DataTableHeaderProps<TData>) {
  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnVisibility: state.columnVisibility,
        rowSelection: state.rowSelection,
        sorting: state.sorting,
      })}
    >
      {() => (
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="group/row">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn('overflow-hidden', header.column.getIsPinned() && PINNED_CELL_CLASS_NAME)}
                  style={getColumnPinningStyle(header.column)}
                >
                  {header.isPlaceholder ? null : <FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
      )}
    </Subscribe>
  )
}

interface DataTableBodyProps<TData extends RowData> {
  table: TanstackTable<DataTableFeatures, TData>
}

function DataTableBody<TData extends RowData>({ table }: DataTableBodyProps<TData>) {
  const rows = table.getRowModel().rows

  if (!rows.length) {
    return (
      <Subscribe source={table.atoms.columnVisibility}>
        {() => (
          <TableBody>
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length || 1} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          </TableBody>
        )}
      </Subscribe>
    )
  }

  // Pad a short last page so the table, and the pagination below it, keep their height across pages
  const fillerRowCount = table.getPageCount() > 1 ? table.store.state.pagination.pageSize - rows.length : 0

  return (
    <TableBody>
      {rows.map((row) => (
        <MemoizedDataTableRow key={row.id} row={row} />
      ))}
      {Array.from({ length: fillerRowCount }, (_, index) => (
        <TableRow
          key={`filler-${index}`}
          aria-hidden
          className={cn(ROW_HEIGHT_CLASS_NAME, 'border-0 hover:bg-transparent')}
        >
          <TableCell colSpan={table.getVisibleLeafColumns().length || 1} />
        </TableRow>
      ))}
    </TableBody>
  )
}

interface DataTableRowProps<TData extends RowData> {
  row: Row<DataTableFeatures, TData>
}

function DataTableRow<TData extends RowData>({ row }: DataTableRowProps<TData>) {
  return (
    <Subscribe
      source={row.table.store}
      selector={(state) => ({
        columnOrder: state.columnOrder,
        columnPinning: state.columnPinning,
        columnVisibility: state.columnVisibility,
      })}
    >
      {() => {
        const cells = row.getVisibleCells().map((cell) => ({
          cell,
          className: cn('overflow-hidden py-1.5', cell.column.getIsPinned() && PINNED_CELL_CLASS_NAME),
          style: getColumnPinningStyle(cell.column),
        }))

        return (
          <Subscribe
            source={row.table.atoms.rowSelection}
            selector={(selection) => selection[row.id] === true}
          >
            {(isSelected) => (
              <TableRow
                data-state={isSelected ? 'selected' : undefined}
                className={cn('group/row', ROW_HEIGHT_CLASS_NAME)}
              >
                {cells.map(({ cell, className, style }) => (
                  <TableCell key={cell.id} className={className} style={style}>
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            )}
          </Subscribe>
        )
      }}
    </Subscribe>
  )
}

const MemoizedDataTableRow = React.memo(DataTableRow) as typeof DataTableRow

interface DataTableActionBarProps<TData extends RowData> {
  table: TanstackTable<DataTableFeatures, TData>
  actionBar: React.ReactNode
}

function DataTableActionBar<TData extends RowData>({ table, actionBar }: DataTableActionBarProps<TData>) {
  return (
    <Subscribe source={table.atoms.rowSelection} selector={() => table.getSelectedRowIds().length > 0}>
      {(hasSelectedRows) => (hasSelectedRows ? actionBar : null)}
    </Subscribe>
  )
}
