import { FC, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api'
import { LeadField, LeadFieldGroup } from '../api/types/leads/getFields'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { useLeadFields } from '../hooks/useLeadFields'
import { findMissingFields, findUnknownFields, getAutocompleteMatch, renderPreview } from '../utils/messageTemplate'
import { Button } from '@/components/ui/button'

const GROUP_LABELS: Record<LeadFieldGroup, string> = {
  contact: 'Contact',
  company: 'Company',
  social: 'Social',
}

const matchesQuery = (field: LeadField, query: string) => {
  const q = query.trim().toLowerCase()
  return field.key.toLowerCase().includes(q) || field.label.toLowerCase().includes(q)
}

// Survives closing the modal (e.g. a stray click outside) and page reloads, until messages are generated
const DRAFT_STORAGE_KEY = 'message-template-draft'

interface MessageTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedLeads: LeadsGetManyOutput
}

export const MessageTemplateModal: FC<MessageTemplateModalProps> = ({
  isOpen,
  onClose,
  selectedLeads,
}) => {
  const selectedLeadIds = selectedLeads.map((lead) => lead.id)
  const selectedLeadsCount = selectedLeads.length
  const [template, setTemplate] = useState(() => localStorage.getItem(DRAFT_STORAGE_KEY) ?? '')
  const [generationResult, setGenerationResult] = useState<{
    success: boolean
    generatedCount: number
    errors: Array<{ leadId: number; leadName: string; error: string }>
  } | null>(null)
  const [caret, setCaret] = useState(0)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false)
  const [isFieldPickerOpen, setIsFieldPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [activePickerOption, setActivePickerOption] = useState(0)
  // Where to insert from the picker: focus moves to its search box, so remember the textarea selection
  const pickerInsertRange = useRef({ start: 0, end: 0 })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const leadFields = useLeadFields()
  const queryClient = useQueryClient()

  const generateMessagesMutation = useMutation({
    mutationFn: async (data: { leadIds: number[]; template: string }) => api.leads.generateMessages(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'getMany'] })
      setGenerationResult(result)

      if (result.errors.length === 0) {
        const message =
          result.generatedCount === 1
            ? `Successfully generated message for ${result.generatedCount} lead`
            : `Successfully generated messages for ${result.generatedCount} leads`
        toast.success(message)
        onClose()
        setTemplate('')
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        setGenerationResult(null)
      } else {
        const successMessage =
          result.generatedCount === 1
            ? `Generated message for ${result.generatedCount} lead`
            : `Generated messages for ${result.generatedCount} leads`
        const errorMessage =
          result.errors.length === 1
            ? `${result.errors.length} lead had errors`
            : `${result.errors.length} leads had errors`
        toast.success(`${successMessage}, but ${errorMessage}. Check details below.`)
      }
    },
    onError: () => {
      toast.error('Failed to generate messages. Please try again.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (template.trim() && selectedLeadIds.length > 0) {
      setGenerationResult(null)

      generateMessagesMutation.mutate({
        leadIds: selectedLeadIds,
        template: template.trim(),
      })
    }
  }

  const handleClose = useCallback(() => {
    if (!generateMessagesMutation.isPending) {
      onClose()
      setGenerationResult(null)
    }
  }, [generateMessagesMutation.isPending, onClose])

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

      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleClose])

  const templatableFields = useMemo(
    () => (leadFields.data ?? []).filter((field) => field.templatable),
    [leadFields.data]
  )

  const pickerGroups = useMemo(
    () =>
      (Object.keys(GROUP_LABELS) as LeadFieldGroup[])
        .map((group) => ({
          group,
          fields: templatableFields.filter((field) => field.group === group && matchesQuery(field, pickerQuery)),
        }))
        .filter(({ fields }) => fields.length > 0),
    [templatableFields, pickerQuery]
  )
  // Keyboard navigation runs over the visible options in display order, across groups
  const pickerOptions = useMemo(() => pickerGroups.flatMap(({ fields }) => fields), [pickerGroups])

  const autocomplete = suggestionsDismissed ? null : getAutocompleteMatch(template, caret)
  const suggestions = useMemo(() => {
    if (!autocomplete) return []
    return templatableFields.filter((field) => matchesQuery(field, autocomplete.query))
  }, [autocomplete, templatableFields])

  const unknownFields = useMemo(
    () => (leadFields.data ? findUnknownFields(template, leadFields.data) : []),
    [template, leadFields.data]
  )
  const missingFields = useMemo(
    () => (leadFields.data ? findMissingFields(template, selectedLeads, leadFields.data) : []),
    [template, selectedLeads, leadFields.data]
  )
  const previewLead = selectedLeads[0]

  const updateTemplate = (value: string, caretPosition: number) => {
    setTemplate(value)
    if (value) localStorage.setItem(DRAFT_STORAGE_KEY, value)
    else localStorage.removeItem(DRAFT_STORAGE_KEY)
    setCaret(caretPosition)
    setActiveSuggestion(0)
    setSuggestionsDismissed(false)
  }

  // Replaces [from, to) with the field placeholder and puts the caret right after it
  const insertField = (field: LeadField, from: number, to: number) => {
    const placeholder = `{${field.key}}`
    const newTemplate = template.substring(0, from) + placeholder + template.substring(to)
    const newCaret = from + placeholder.length
    updateTemplate(newTemplate, newCaret)
    setSuggestionsDismissed(true)

    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCaret, newCaret)
    }, 0)
  }

  const openFieldPicker = () => {
    const textarea = textareaRef.current
    pickerInsertRange.current = {
      start: textarea?.selectionStart ?? template.length,
      end: textarea?.selectionEnd ?? template.length,
    }
    setPickerQuery('')
    setActivePickerOption(0)
    setIsFieldPickerOpen(true)
  }

  const insertFromPicker = (field: LeadField) => {
    insertField(field, pickerInsertRange.current.start, pickerInsertRange.current.end)
    setIsFieldPickerOpen(false)
    setPickerQuery('')
  }

  const handlePickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isFieldPickerOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openFieldPicker()
      }
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (pickerOptions.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActivePickerOption((index) => (index + step + pickerOptions.length) % pickerOptions.length)
    } else if (e.key === 'Enter') {
      // Don't submit the form
      e.preventDefault()
      const field = pickerOptions[activePickerOption]
      if (field) insertFromPicker(field)
    } else if (e.key === 'Escape') {
      // Close the picker, not the modal
      e.preventDefault()
      e.stopPropagation()
      setIsFieldPickerOpen(false)
      setPickerQuery('')
      textareaRef.current?.focus()
    }
  }

  const handleTemplateKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocomplete || suggestions.length === 0) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActiveSuggestion((index) => (index + step + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertField(suggestions[activeSuggestion] ?? suggestions[0], autocomplete.start, caret)
    } else if (e.key === 'Escape') {
      // Close the suggestions, not the modal
      e.preventDefault()
      e.stopPropagation()
      setSuggestionsDismissed(true)
    }
  }

  const syncCaret = (e: React.SyntheticEvent<HTMLTextAreaElement>) => setCaret(e.currentTarget.selectionStart)

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        // Fixed height so the preview, warnings and results appearing don't resize the modal
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 h-[min(90vh,36rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Generate Messages for {selectedLeadsCount} Lead{selectedLeadsCount !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={handleClose}
              disabled={generateMessagesMutation.isPending}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            {/* Pads the scroll area so focus rings aren't clipped */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-6 -mx-1 px-1 -mt-3 pt-3">
            <div>
              <label htmlFor="message-template" className="block text-sm font-medium text-foreground mb-2">
                Message Template
              </label>
              <div className="relative">
                <div
                  className="absolute -top-8 right-0"
                  // Close when focus leaves the picker (click outside, Tab away)
                  onBlur={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget)) return
                    setIsFieldPickerOpen(false)
                    setPickerQuery('')
                  }}
                >
                  <input
                    type="text"
                    value={pickerQuery}
                    onFocus={openFieldPicker}
                    onChange={(e) => {
                      if (!isFieldPickerOpen) openFieldPicker()
                      setPickerQuery(e.target.value)
                      setActivePickerOption(0)
                    }}
                    onKeyDown={handlePickerKeyDown}
                    disabled={templatableFields.length === 0}
                    placeholder="Insert field…"
                    aria-label="Search fields"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isFieldPickerOpen}
                    aria-controls="field-picker-options"
                    aria-activedescendant={
                      isFieldPickerOpen && pickerOptions[activePickerOption]
                        ? `field-picker-${pickerOptions[activePickerOption].key}`
                        : undefined
                    }
                    className="w-44 px-2 py-1 text-xs border border-input rounded placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  />
                  {isFieldPickerOpen && (
                    <div className="absolute right-0 mt-1 w-64 bg-card rounded-md shadow-lg z-10 border border-border">
                      <div
                        id="field-picker-options"
                        role="listbox"
                        aria-label="Insert field"
                        className="max-h-64 overflow-y-auto py-1"
                      >
                        {pickerGroups.map(({ group, fields }) => (
                          <div key={group} role="group" aria-label={GROUP_LABELS[group]}>
                            <div className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase" aria-hidden="true">
                              {GROUP_LABELS[group]}
                            </div>
                            {fields.map((field) => {
                              const isActive = pickerOptions[activePickerOption]?.key === field.key
                              return (
                                <div
                                  key={field.key}
                                  id={`field-picker-${field.key}`}
                                  ref={isActive ? (el) => el?.scrollIntoView?.({ block: 'nearest' }) : undefined}
                                  role="option"
                                  aria-selected={isActive}
                                  // mousedown so the search box doesn't blur (and close the picker) first
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    insertFromPicker(field)
                                  }}
                                  onMouseEnter={() => setActivePickerOption(pickerOptions.indexOf(field))}
                                  className={`flex w-full items-center justify-between px-3 py-1.5 text-sm cursor-pointer ${
                                    isActive ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'text-foreground'
                                  }`}
                                >
                                  {field.label}
                                  <span className="text-xs text-muted-foreground font-mono">{`{${field.key}}`}</span>
                                </div>
                              )
                            })}
                          </div>
                        ))}
                        {pickerOptions.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No matching fields</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  id="message-template"
                  value={template}
                  onChange={(e) => updateTemplate(e.target.value, e.target.selectionStart)}
                  onKeyDown={handleTemplateKeyDown}
                  onSelect={syncCaret}
                  onClick={syncCaret}
                  onBlur={() => setSuggestionsDismissed(true)}
                  placeholder="Enter your message template here. Type { to insert a lead field.&#10;&#10;Example: Hi {firstName}, I noticed you work at {companyName} as a {jobTitle}. Would you be interested in..."
                  rows={6}
                  // Grows with its content, so only the modal body scrolls (no scrollbar inside a scrollbar)
                  className="w-full min-h-32 field-sizing-content px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestions.length > 0}
                  aria-controls="field-suggestions"
                  aria-activedescendant={suggestions.length > 0 ? `field-suggestion-${activeSuggestion}` : undefined}
                  required
                />
                {suggestions.length > 0 && (
                  // Anchored under the textarea rather than at the caret: placing it at the caret needs a mirror element
                  <ul
                    id="field-suggestions"
                    role="listbox"
                    aria-label="Field suggestions"
                    className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card rounded-md shadow-lg z-10 border border-border py-1"
                  >
                    {suggestions.map((field, index) => (
                      <li
                        key={field.key}
                        id={`field-suggestion-${index}`}
                        ref={index === activeSuggestion ? (el) => el?.scrollIntoView?.({ block: 'nearest' }) : undefined}
                        role="option"
                        aria-selected={index === activeSuggestion}
                        // mousedown so the textarea doesn't blur (and close the list) before the click lands
                        onMouseDown={(e) => {
                          e.preventDefault()
                          if (autocomplete) insertField(field, autocomplete.start, caret)
                        }}
                        onMouseEnter={() => setActiveSuggestion(index)}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer ${
                          index === activeSuggestion ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200' : 'text-foreground'
                        }`}
                      >
                        {field.label}
                        <span className="text-xs text-muted-foreground font-mono">{`{${field.key}}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {(unknownFields.length > 0 || missingFields.length > 0) && (
                <ul className="mt-2 space-y-1 text-sm">
                  {unknownFields.map((key) => (
                    <li key={key} className="text-red-600 dark:text-red-400">
                      Unknown field {`{${key}}`}
                    </li>
                  ))}
                  {missingFields.map(({ key, missing }) => (
                    <li key={key} className="text-amber-700 dark:text-amber-400">
                      ⚠ {`{${key}}`} is missing for {missing} of {selectedLeadsCount} lead{selectedLeadsCount !== 1 ? 's' : ''}
                      {' '}— no message will be generated for {missing === 1 ? 'it' : 'them'}
                    </li>
                  ))}
                </ul>
              )}
              {template.trim() && previewLead && (
                <section aria-label="Preview" className="mt-3 rounded-md border border-border bg-muted/50 p-3">
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">
                    Preview — {`${previewLead.firstName} ${previewLead.lastName || ''}`.trim()}
                  </h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {renderPreview(template, previewLead).map((segment, index) =>
                      segment.missing ? (
                        <mark key={index} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded px-0.5">
                          {segment.text}
                        </mark>
                      ) : (
                        <span key={index}>{segment.text}</span>
                      )
                    )}
                  </p>
                </section>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                Type {`{`} or use Insert field to add lead data. Leads missing a field you use won't get a
                message.
              </p>
            </div>

            {generationResult && (
              <div className="space-y-4">
                {generationResult.generatedCount > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg p-4">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-600 dark:text-green-400 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-green-800 dark:text-green-300">
                        Successfully generated messages for {generationResult.generatedCount} lead
                        {generationResult.generatedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {generationResult.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg
                        className="w-5 h-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                          Failed to generate messages for {generationResult.errors.length} lead
                          {generationResult.errors.length !== 1 ? 's' : ''}:
                        </h4>
                        <div className="space-y-1">
                          {generationResult.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-700 dark:text-red-400">
                              <span className="font-medium">{error.leadName}</span>: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" onClick={handleClose} disabled={generateMessagesMutation.isPending}>
                {generationResult ? 'Close' : 'Cancel'}
              </Button>
              {(!generationResult || generationResult.errors.length > 0) && (
                <Button
                  type="submit"
                  disabled={!template.trim() || unknownFields.length > 0 || generateMessagesMutation.isPending}
                >
                  {generateMessagesMutation.isPending ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating...
                    </>
                  ) : generationResult ? (
                    'Try Again'
                  ) : (
                    'Generate Messages'
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
