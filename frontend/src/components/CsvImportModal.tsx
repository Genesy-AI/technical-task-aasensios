import { FC, useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api'
import { CsvLead, parseCsv } from '../utils/csvParser'
import { useLeadFields } from '../hooks/useLeadFields'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CsvImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CsvImportModal: FC<CsvImportModalProps> = ({ isOpen, onClose }) => {
  const [csvData, setCsvData] = useState<CsvLead[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const leadFields = useLeadFields()

  const stats = useMemo(() => {
    const validLeads = csvData.filter((lead) => lead.isValid)
    const invalidLeads = csvData.filter((lead) => !lead.isValid)

    const duplicateGroups = new Map<string, CsvLead[]>()
    validLeads.forEach((lead) => {
      const key = `${lead.firstName.toLowerCase()}_${(lead.lastName || '').toLowerCase()}`
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, [])
      }
      duplicateGroups.get(key)!.push(lead)
    })

    const duplicatesInCsv = Array.from(duplicateGroups.values())
      .filter((group) => group.length > 1)
      .flat()

    return {
      total: csvData.length,
      valid: validLeads.length,
      invalid: invalidLeads.length,
      duplicatesInCsv: duplicatesInCsv.length,
    }
  }, [csvData])

  const handleFileSelect = (file: File) => {
    if (!leadFields.data) {
      toast.error('Lead fields are still loading. Please try again in a moment.')
      return
    }
    const fields = leadFields.data

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file')
      return
    }

    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsed = parseCsv(content, fields)
        setCsvData(parsed)
        setIsProcessing(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file'
        toast.error(errorMessage)
        setIsProcessing(false)
      }
    }
    reader.onerror = () => {
      toast.error('Error reading file')
      setIsProcessing(false)
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const importMutation = useMutation({
    mutationFn: async (leads: CsvLead[]) => {
      const validLeads = leads.filter((lead) => lead.isValid)

      const leadsToImport = validLeads.map((lead) => ({
        ...Object.fromEntries((leadFields.data ?? []).map((field) => [field.key, lead[field.key] || undefined])),
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
      }))

      return api.leads.bulkImport({ leads: leadsToImport })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'getMany'] })

      let message = `Successfully imported ${data.importedCount} leads!`
      if (data.duplicatesSkipped > 0) {
        message += ` (${data.duplicatesSkipped} duplicates skipped)`
      }
      if (data.invalidLeads > 0) {
        message += ` (${data.invalidLeads} invalid leads excluded)`
      }
      if (data.droppedCountryCodes.length > 0) {
        message += ` (${data.droppedCountryCodes.length} unrecognized country codes left empty)`
      }
      if (data.droppedValues.length > 0) {
        message += ` (${data.droppedValues.length} invalid values left empty)`
      }

      toast.success(message)
      onClose()
      setCsvData([])
    },
    onError: () => {
      toast.error('Error importing leads. Please try again.')
    },
  })

  const handleImport = () => {
    if (stats.valid === 0) {
      toast.error('No valid leads to import')
      return
    }
    importMutation.mutate(csvData)
  }

  const handleClose = useCallback(() => {
    if (!importMutation.isPending) {
      setCsvData([])
      onClose()
    }
  }, [importMutation.isPending, onClose])

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        // Only the preview table scrolls; header, summary and footer stay put
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Import leads from CSV</h3>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    aria-label="Close"
                    onClick={handleClose}
                    disabled={importMutation.isPending}
                    className="text-muted-foreground hover:text-foreground focus:outline-none disabled:opacity-50"
                  />
                }
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col flex-1 min-h-0">
          {csvData.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-input'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-muted-foreground">Processing CSV file...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg
                    className="w-12 h-12 text-muted-foreground mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                    />
                  </svg>
                  <p className="text-lg font-medium text-foreground mb-2">
                    Drop your CSV file here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                    >
                      browse
                    </button>
                  </p>
                  {leadFields.data && (
                    <p className="text-sm text-muted-foreground">
                      CSV must include:{' '}
                      {leadFields.data.filter((field) => field.required).map((field) => field.csvHeaders[0]).join(', ')}{' '}
                      (required). Optional:{' '}
                      {leadFields.data.filter((field) => !field.required).map((field) => field.csvHeaders[0]).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 shrink-0">
                <h4 className="text-sm font-medium text-foreground mb-3">Import summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card rounded p-3 text-center">
                    <div className="text-lg font-semibold text-foreground">{stats.total}</div>
                    <div className="text-xs text-muted-foreground">Total rows</div>
                  </div>
                  <div className="bg-card rounded p-3 text-center">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.valid}</div>
                    <div className="text-xs text-muted-foreground">Valid leads</div>
                  </div>
                  <div className="bg-card rounded p-3 text-center">
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">{stats.invalid}</div>
                    <div className="text-xs text-muted-foreground">Invalid leads</div>
                  </div>
                  <div className="bg-card rounded p-3 text-center">
                    <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{stats.duplicatesInCsv}</div>
                    <div className="text-xs text-muted-foreground">Duplicates in CSV</div>
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-lg min-h-0 overflow-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Row</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Company
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {csvData.map((lead, index) => (
                      <tr key={index} className={lead.isValid ? 'bg-card' : 'bg-red-50 dark:bg-red-950/40'}>
                        <td className="px-3 py-2 text-sm text-foreground">{lead.rowIndex - 1}</td>
                        <td className="px-3 py-2">
                          {lead.isValid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/40 rounded-full">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-full">
                              Invalid
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-foreground">
                          {lead.firstName} {lead.lastName || ''}
                        </td>
                        <td className="px-3 py-2 text-sm text-foreground">{lead.email || '-'}</td>
                        <td className="px-3 py-2 text-sm text-foreground">{lead.companyName || '-'}</td>
                        <td className="px-3 py-2 text-sm text-red-600 dark:text-red-400">{lead.errors.join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {csvData.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex justify-between shrink-0">
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setCsvData([])}>
                Clear data
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={stats.valid === 0 || importMutation.isPending}>
                {importMutation.isPending ? 'Importing...' : `Import ${stats.valid} valid leads`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
