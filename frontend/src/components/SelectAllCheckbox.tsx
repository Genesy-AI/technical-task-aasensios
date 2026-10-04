import { useState } from 'react'
import type { RowData, Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { DataTableFeatures } from '@/lib/data-table-features'

const pluralizeLeads = (count: number) => (count === 1 ? '1 lead' : `${count} leads`)

// Header checkbox: clears an existing selection, otherwise asks whether to select the page or every lead
export function SelectAllCheckbox<TData extends RowData>({
  table,
}: {
  table: Table<DataTableFeatures, TData>
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const isAllSelected = table.getIsAllRowsSelected()
  // TanStack also reports "some" when every row is selected, so only show the dash for a partial selection
  const isSomeSelected = table.getIsSomeRowsSelected() && !isAllSelected
  const pageCount = table.getRowModel().rows.length
  const totalCount = table.getFilteredRowModel().rows.length

  const onCheckedChange = () => {
    if (isAllSelected || isSomeSelected) {
      table.resetRowSelection(true)
    } else if (table.getPageCount() > 1) {
      setIsDialogOpen(true)
    } else {
      table.toggleAllRowsSelected(true)
    }
  }

  const select = (scope: 'page' | 'all') => {
    if (scope === 'page') table.toggleAllPageRowsSelected(true)
    else table.toggleAllRowsSelected(true)
    setIsDialogOpen(false)
  }

  return (
    <>
      <Checkbox
        aria-label="Select all leads"
        checked={isAllSelected}
        indeterminate={isSomeSelected}
        onCheckedChange={onCheckedChange}
      />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select leads</DialogTitle>
            <DialogDescription>
              Select the {pluralizeLeads(pageCount)} on this page, or all {pluralizeLeads(totalCount)} across
              every page?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => select('page')}>
              This page ({pageCount})
            </Button>
            <Button onClick={() => select('all')}>All {pluralizeLeads(totalCount)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
