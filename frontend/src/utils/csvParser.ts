import Papa from 'papaparse'
import { COUNTRY_CODES, COUNTRY_CODE_ALIASES } from './countryCodes'
import { LeadField, LeadFieldKey } from '../api/types/leads/getFields'

// firstName/lastName/email are always present; any other registry field appears when its column does
export type CsvLead = {
  firstName: string
  lastName: string
  email: string
  isValid: boolean
  errors: string[]
  rowIndex: number
} & Partial<Record<Exclude<LeadFieldKey, 'firstName' | 'lastName' | 'email'>, string>>

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidCountryCode = (countryCode: string): boolean => COUNTRY_CODES.has(countryCode)

// Same rules the backend applies on import (backend/src/leadFields.ts); checked here so the preview flags them
const MAX_YEARS_AT_COMPANY = 80
const isValidYears = (value: string) => /^\d+$/.test(value) && Number(value) <= MAX_YEARS_AT_COMPANY
const LINKEDIN_PROFILE = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[^/?#\s]+\/?(?:[?#].*)?$/i

const normalizeHeader = (header: string) => header.toLowerCase().replace(/[^a-z]/g, '')

const normalizeValue = (field: LeadField, value: string): string => {
  if (field.type === 'countryCode') {
    const code = value.toUpperCase()
    return COUNTRY_CODE_ALIASES[code] ?? code
  }
  return value
}

const validationError = (field: LeadField, value: string): string | null => {
  switch (field.type) {
    case 'email':
      return isValidEmail(value) ? null : 'Invalid email format'
    case 'countryCode':
      return isValidCountryCode(value) ? null : 'Invalid country code'
    case 'integer':
      return isValidYears(value) ? null : `Invalid ${field.label.toLowerCase()}`
    case 'url':
      return LINKEDIN_PROFILE.test(value) ? null : `Invalid ${field.label} URL`
    default:
      return null
  }
}

export const parseCsv = (content: string, fields: LeadField[]): CsvLead[] => {
  if (!content?.trim()) {
    throw new Error('CSV content cannot be empty')
  }

  const parseResult = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value.trim(),
    transformHeader: (header) => header.trim().toLowerCase(),
    quoteChar: '"',
  })

  if (parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(
      (error) => error.type === 'Delimiter' || error.type === 'Quotes' || error.type === 'FieldMismatch'
    )
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing failed: ${criticalErrors[0].message}`)
    }
  }

  if (!parseResult.data || parseResult.data.length === 0) {
    throw new Error('CSV file appears to be empty or contains no valid data')
  }

  const fieldsByHeader = new Map(
    fields.flatMap((field) => field.csvHeaders.map((header) => [normalizeHeader(header), field] as const))
  )

  const data: CsvLead[] = []

  parseResult.data.forEach((row, index) => {
    if (Object.values(row).every((value) => !value)) return

    const values: Partial<Record<LeadFieldKey, string>> = {}

    Object.entries(row).forEach(([header, value]) => {
      const field = fieldsByHeader.get(normalizeHeader(header))
      const trimmedValue = value?.trim() || ''
      if (field && trimmedValue) {
        values[field.key] = normalizeValue(field, trimmedValue)
      }
    })

    const errors: string[] = []
    for (const field of fields) {
      const value = values[field.key]
      if (!value) {
        if (field.required) errors.push(`${field.label} is required`)
        continue
      }
      const error = validationError(field, value)
      if (error) errors.push(error)
    }

    data.push({
      ...values,
      firstName: values.firstName || '',
      lastName: values.lastName || '',
      email: values.email || '',
      rowIndex: index + 2,
      isValid: errors.length === 0,
      errors,
    })
  })

  return data
}
