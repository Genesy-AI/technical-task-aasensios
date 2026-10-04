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

const PHONE_POLL_INTERVAL_MS = 2000

const pluralizeLeads = (count: number) => (count === 1 ? '1 lead' : `${count} leads`)

export const LeadsList: FC = () => {
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [isEnrichDropdownOpen, setIsEnrichDropdownOpen] = useState(false)
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
      setIsEnrichDropdownOpen(false)
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
    onMutate: () => {
      setIsEnrichDropdownOpen(false)
    },
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
            {selectedLeads.length > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium text-sm">
                {selectedLeads.length} selected
              </span>
            )}
            
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Import CSV
            </button>
            
            <div className="relative">
              <button
                onClick={() => selectedLeads.length > 0 && setIsEnrichDropdownOpen(!isEnrichDropdownOpen)}
                disabled={selectedLeads.length === 0}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Enrich
                <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isEnrichDropdownOpen && selectedLeads.length > 0 && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsMessageModalOpen(true)
                        setIsEnrichDropdownOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Generate Messages
                      </div>
                    </button>
                    <button
                      onClick={() => verifyEmailsMutation.mutate(selectedLeads)}
                      disabled={verifyEmailsMutation.isPending}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Verify Email
                      </div>
                    </button>
                    <button
                      onClick={() => enrichPhonesMutation.mutate(selectedLeads)}
                      disabled={enrichPhonesMutation.isPending}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Find Phone
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        toast.error('Gender guessing feature is not yet implemented')
                        setIsEnrichDropdownOpen(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Guess Gender
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleDeleteSelected}
              disabled={selectedLeads.length === 0 || deleteLeadsMutation.isPending}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleteLeadsMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </>
              )}
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
