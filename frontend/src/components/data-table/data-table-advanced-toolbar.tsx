'use client'

import type { RowData, Table } from '@tanstack/react-table'
import type * as React from 'react'

import { cn } from '@/lib/utils'

import type { DataTableFeatures } from '@/lib/data-table-features'

import { DataTableViewOptions } from '@/components/data-table/data-table-view-options'

interface DataTableAdvancedToolbarProps<TData extends RowData> extends React.ComponentProps<'div'> {
  table: Table<DataTableFeatures, TData>
  actions?: React.ReactNode
}

export function DataTableAdvancedToolbar<TData extends RowData>({
  table,
  actions,
  children,
  className,
  ...props
}: DataTableAdvancedToolbarProps<TData>) {
  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn('flex w-full items-start justify-between gap-2 p-1', className)}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {children}
        <DataTableViewOptions table={table} align="start" />
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}
