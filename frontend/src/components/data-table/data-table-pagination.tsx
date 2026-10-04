'use client'

import type * as React from 'react'

import { type RowData, Subscribe, type Table } from '@tanstack/react-table'
import { cn } from '@/lib/utils'

import type { DataTableFeatures } from '@/lib/data-table-features'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconChevronsLeft, IconChevronLeft, IconChevronRight, IconChevronsRight } from '@tabler/icons-react'

interface DataTablePaginationProps<TData extends RowData> extends React.ComponentProps<'div'> {
  table: Table<DataTableFeatures, TData>
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData extends RowData>({
  table,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  return (
    <Subscribe
      source={table.store}
      selector={(state) => ({
        pageIndex: state.pagination.pageIndex,
        pageSize: state.pagination.pageSize,
      })}
    >
      {({ pageIndex, pageSize }) => (
        <DataTablePaginationContent
          table={table}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          className={className}
          {...props}
        />
      )}
    </Subscribe>
  )
}

interface DataTablePaginationContentProps<TData extends RowData> extends React.ComponentProps<'div'> {
  table: Table<DataTableFeatures, TData>
  pageIndex: number
  pageSize: number
  pageSizeOptions: number[]
}

function DataTablePaginationContent<TData extends RowData>({
  table,
  pageIndex,
  pageSize,
  pageSizeOptions,
  className,
  ...props
}: DataTablePaginationContentProps<TData>) {
  const pageCount = table.getPageCount()
  const canPreviousPage = table.getCanPreviousPage()
  const canNextPage = table.getCanNextPage()

  return (
    <div
      className={cn(
        'flex w-full flex-col-reverse items-center justify-end gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
        className
      )}
      {...props}
    >
      <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              if (value == null) return
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="w-18">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Go to first page"
                  variant="outline"
                  size="icon"
                  className="hidden lg:flex"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!canPreviousPage}
                />
              }
            >
              <IconChevronsLeft />
            </TooltipTrigger>
            <TooltipContent>First page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Go to previous page"
                  variant="outline"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!canPreviousPage}
                />
              }
            >
              <IconChevronLeft />
            </TooltipTrigger>
            <TooltipContent>Previous page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Go to next page"
                  variant="outline"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!canNextPage}
                />
              }
            >
              <IconChevronRight />
            </TooltipTrigger>
            <TooltipContent>Next page</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Go to last page"
                  variant="outline"
                  size="icon"
                  className="hidden lg:flex"
                  onClick={() => table.setPageIndex(pageCount - 1)}
                  disabled={!canNextPage}
                />
              }
            >
              <IconChevronsRight />
            </TooltipTrigger>
            <TooltipContent>Last page</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
