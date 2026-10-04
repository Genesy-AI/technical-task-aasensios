import { LeadFieldKey } from './getFields'

export interface LeadsBulkImportInput {
  leads: ({
    firstName: string
    lastName: string
    email: string
  } & Partial<Record<LeadFieldKey, string>>)[]
}

export interface LeadsBulkImportOutput {
  success: boolean
  importedCount: number
  duplicatesSkipped: number
  invalidLeads: number
  errors: Array<{
    lead: any
    error: string
  }>
  droppedCountryCodes: Array<{
    lead: any
    countryCode: unknown
  }>
  droppedValues: Array<{
    lead: any
    field: LeadFieldKey
    value: unknown
  }>
}
