import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from '@tanstack/react-store'
import { FC, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useDataTable } from '@/hooks/use-data-table'
import { api } from '../api'
import { getCountryCodesKey, getCountryOptions, getLeadsTableColumns, isPhoneSearchInProgress, Lead } from './leadsTableColumns'
import { MessageTemplateModal } from './MessageTemplateModal'
import { CsvImportModal } from './CsvImportModal'
import { LeadsActionBar } from './LeadsActionBar'

const PHONE_POLL_INTERVAL_MS = 2000

const pluralizeLeads = (count: number) => (count === 1 ? '1 lead' : `${count} leads`)

export const LeadsList: FC = () => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const leads = useQuery({
    queryKey: ['leads', 'getMany'],
    queryFn: async () => api.leads.getMany(),
    retry: false,
    // Phone searches run in the background; poll only while one is in progress
    refetchInterval: (query) =>
      query.state.data?.some(isPhoneSearchInProgress) ? PHONE_POLL_INTERVAL_MS : false,
  })

  const leadsData = useMemo(() => (leads.isError ? [] : leads.data ?? []), [leads.isError, leads.data])
  const countryCodesKey = getCountryCodesKey(leadsData)
  const columns = useMemo(() => getLeadsTableColumns(getCountryOptions(countryCodesKey)), [countryCodesKey])

  const { table } = useDataTable({
    data: leadsData,
    columns,
    mode: 'client',
    getRowId: (lead: Lead) => String(lead.id),
    // useDataTable rebuilds its filters from the URL on every URL change, so TanStack's auto-reset would
    // send each page change back to page 1. The hook already resets the page itself when filters change.
    autoResetPageIndex: false,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: { pageIndex: 0, pageSize: 20 },
    },
  })

  const selectedLeads = useSelector(table.atoms.rowSelection, (rowSelection) =>
    Object.keys(rowSelection)
      .filter((id) => rowSelection[id])
      .map(Number)
  )

  // Bulk actions must not reach leads hidden by a filter, so a filter change clears the selection.
  // `table` gets a new identity on every render, so only the filters key may drive this effect.
  const columnFiltersKey = useSelector(table.atoms.columnFilters, (filters) => JSON.stringify(filters))
  useEffect(() => {
    if (table.getSelectedRowIds().length > 0) table.resetRowSelection(true)
  }, [columnFiltersKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteLeadsMutation = useMutation({
    mutationFn: async (ids: number[]) => api.leads.deleteMany({ ids }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'getMany'] })
      table.resetRowSelection(true)
      
      const message = data.deletedCount === 1 
        ? `Successfully deleted ${data.deletedCount} lead`
        : `Successfully deleted ${data.deletedCount} leads`
      toast.success(message)
    },
    onError: () => {
      toast.error('Failed to delete leads. Please try again.')
    }
  })

  const verifyEmailsMutation = useMutation({
    mutationFn: async (ids: number[]) => api.leads.verifyEmails({ leadIds: ids }),
    onMutate: (ids) => {
      toast.loading(ids.length === 1 ? 'Verifying 1 email...' : `Verifying ${ids.length} emails...`, {
        id: 'verify-emails',
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'getMany'] })
      // verifiedCount counts completed checks, including invalid emails, so split results by outcome
      const validCount = data.results.filter(result => result.emailVerified).length
      const invalidLeadIds = data.results.filter(result => !result.emailVerified).map(result => result.leadId)

      if (validCount > 0) {
        toast.success(validCount === 1 ? '1 valid email' : `${validCount} valid emails`, { id: 'verify-emails' })
      } else {
        toast.dismiss('verify-emails')
      }
      if (invalidLeadIds.length > 0) {
        const names = invalidLeadIds
          .map(leadId => leads.data?.find(lead => lead.id === leadId))
          .map(lead => (lead ? `${lead.firstName} ${lead.lastName || ''}`.trim() : 'unknown lead'))
          .join(', ')
        toast.error(`Invalid ${invalidLeadIds.length === 1 ? 'email' : 'emails'} for: ${names}`)
      }
      if (data.errors.length > 0) {
        const names = data.errors.map(error => error.leadName).join(', ')
        toast.error(`Could not verify ${data.errors.length === 1 ? 'email' : 'emails'} for: ${names}`)
      }
    },
    onError: () => {
      toast.error('Failed to verify emails. Please try again.', { id: 'verify-emails' })
    }
  })

  const enrichPhonesMutation = useMutation({
    mutationFn: async (ids: number[]) => api.leads.enrichPhones({ leadIds: ids }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'getMany'] })

      if (data.started.length > 0) {
        toast.success(`Searching phone for ${pluralizeLeads(data.started.length)}`)
      }
      if (data.alreadyRunning.length > 0) {
        toast(`Phone search already in progress for ${pluralizeLeads(data.alreadyRunning.length)}`)
      }
      if (data.skipped.length > 0) {
        toast(
          data.skipped.length === 1
            ? '1 lead already has a phone'
            : `${data.skipped.length} leads already have a phone`
        )
      }
      if (data.errors.length > 0) {
        const names = data.errors.map(error => error.leadName).join(', ')
        toast.error(`Could not start phone search for: ${names}`)
      }
    },
    onError: () => {
      toast.error('Failed to start phone search. Please try again.')
    }
  })

  const handleDeleteSelected = () => {
    if (selectedLeads.length > 0) {
      deleteLeadsMutation.mutate(selectedLeads)
    }
  }

  if (leads.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import CSV
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        {leads.isError ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-red-800">
                <h3 className="text-lg font-medium mb-2">Error loading leads</h3>
                <div className="text-sm text-red-700">
                  {leads.error?.message || 'An unexpected error occurred'}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        ) : leadsData.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <div className="text-lg font-medium">No leads found</div>
              <div className="text-sm mt-1">Get started by adding your first lead.</div>
            </div>
          </div>
        ) : (
          <DataTable table={table}>
            <DataTableToolbar table={table} />
          </DataTable>
        )}
      </div>

      <LeadsActionBar
        selectedCount={selectedLeads.length}
        onClearSelection={() => table.resetRowSelection(true)}
        onVerifyEmails={() => verifyEmailsMutation.mutate(selectedLeads)}
        onFindPhones={() => enrichPhonesMutation.mutate(selectedLeads)}
        onGuessGender={() => toast.error('Gender guessing feature is not yet implemented')}
        onGenerateMessages={() => setIsMessageModalOpen(true)}
        onDelete={handleDeleteSelected}
        isVerifyingEmails={verifyEmailsMutation.isPending}
        isFindingPhones={enrichPhonesMutation.isPending}
        isDeleting={deleteLeadsMutation.isPending}
      />

      <MessageTemplateModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        selectedLeads={leadsData.filter(lead => selectedLeads.includes(lead.id))}
      />

      <CsvImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  )
}
