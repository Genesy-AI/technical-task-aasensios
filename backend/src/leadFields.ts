// Single source of truth for the lead data points users can import and use in messages.
// Served to the frontend via GET /leads/fields, so adding a field here makes it available
// to CSV import and message composition without touching the UI.

export type LeadFieldGroup = 'contact' | 'company' | 'social'

export type LeadFieldType = 'text' | 'email' | 'phone' | 'countryCode' | 'integer' | 'url'

export type LeadFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'countryCode'
  | 'companyName'
  | 'jobTitle'
  | 'yearsAtCompany'
  | 'linkedinUrl'

export type LeadField = {
  key: LeadFieldKey
  label: string
  group: LeadFieldGroup
  type: LeadFieldType
  required: boolean
  templatable: boolean
  // Accepted CSV column names; matched case-insensitively, ignoring spaces and punctuation
  csvHeaders: string[]
}

export const LEAD_FIELDS: LeadField[] = [
  { key: 'firstName', label: 'First name', group: 'contact', type: 'text', required: true, templatable: true, csvHeaders: ['firstName'] },
  { key: 'lastName', label: 'Last name', group: 'contact', type: 'text', required: true, templatable: true, csvHeaders: ['lastName'] },
  { key: 'email', label: 'Email', group: 'contact', type: 'email', required: true, templatable: true, csvHeaders: ['email'] },
  { key: 'phone', label: 'Phone', group: 'contact', type: 'phone', required: false, templatable: true, csvHeaders: ['phone', 'phoneNumber'] },
  { key: 'countryCode', label: 'Country', group: 'contact', type: 'countryCode', required: false, templatable: true, csvHeaders: ['countryCode'] },
  { key: 'companyName', label: 'Company', group: 'company', type: 'text', required: false, templatable: true, csvHeaders: ['companyName'] },
  { key: 'jobTitle', label: 'Job title', group: 'company', type: 'text', required: false, templatable: true, csvHeaders: ['jobTitle'] },
  {
    key: 'yearsAtCompany',
    label: 'Years at company',
    group: 'company',
    type: 'integer',
    required: false,
    templatable: true,
    // The sample CSVs call this column yearsInRole. Years in the current role can be fewer than
    // years at the company (internal moves), but it's the closest data the files carry.
    csvHeaders: ['yearsAtCompany', 'yearsInRole'],
  },
  { key: 'linkedinUrl', label: 'LinkedIn', group: 'social', type: 'url', required: false, templatable: true, csvHeaders: ['linkedinUrl', 'linkedin', 'linkedinProfile'] },
]

export type ParsedValue<T> = { value: T | null; invalid?: true }

const isBlank = (value: unknown) => value === null || value === undefined || String(value).trim() === ''

const MAX_YEARS_AT_COMPANY = 80

export function parseYearsAtCompany(input: unknown): ParsedValue<number> {
  if (isBlank(input)) {
    return { value: null }
  }
  const text = String(input).trim()
  if (!/^\d+$/.test(text) || Number(text) > MAX_YEARS_AT_COMPANY) {
    return { value: null, invalid: true }
  }
  return { value: Number(text) }
}

// Profile URLs only (not /company/ pages), on linkedin.com or a country subdomain like es.linkedin.com
const LINKEDIN_PROFILE = /^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]+)\/?(?:[?#].*)?$/i

export function normalizeLinkedinUrl(input: unknown): ParsedValue<string> {
  if (isBlank(input)) {
    return { value: null }
  }
  const match = String(input).trim().match(LINKEDIN_PROFILE)
  if (!match) {
    return { value: null, invalid: true }
  }
  return { value: `https://www.linkedin.com/in/${match[1]}` }
}

export type DroppedValue = { field: LeadFieldKey; value: unknown }

// Optional fields are never a reason to reject a lead: invalid values are dropped and reported
export function sanitizeOptionalFields(input: Record<string, unknown>) {
  const yearsAtCompany = parseYearsAtCompany(input.yearsAtCompany)
  const linkedinUrl = normalizeLinkedinUrl(input.linkedinUrl)
  const phone = isBlank(input.phone) ? null : String(input.phone).trim()

  const dropped: DroppedValue[] = []
  if (yearsAtCompany.invalid) dropped.push({ field: 'yearsAtCompany', value: input.yearsAtCompany })
  if (linkedinUrl.invalid) dropped.push({ field: 'linkedinUrl', value: input.linkedinUrl })

  return {
    data: { yearsAtCompany: yearsAtCompany.value, linkedinUrl: linkedinUrl.value, phone },
    dropped,
  }
}
