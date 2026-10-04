import { LEAD_FIELDS, type LeadFieldKey } from '../leadFields'

export type Lead = { firstName: string } & Partial<Record<LeadFieldKey, string | number | null | undefined>>

const TEMPLATABLE_KEYS = new Set<string>(LEAD_FIELDS.filter((field) => field.templatable).map((field) => field.key))

export function generateMessageFromTemplate(template: string, lead: Lead): string {
  let message = template

  const templateVariables = template.match(/\{(\w+)\}/g) || []

  for (const variable of templateVariables) {
    const fieldName = variable.slice(1, -1)

    if (!TEMPLATABLE_KEYS.has(fieldName)) {
      throw new Error(`Unknown field in template: ${fieldName}`)
    }

    const fieldValue = lead[fieldName as LeadFieldKey]

    // Explicit checks: 0 is a valid value (e.g. yearsAtCompany), not a missing one
    if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
      throw new Error(`Missing required field: ${fieldName}`)
    }

    // Replacer function so `$` in a value isn't read as a replacement pattern
    message = message.replace(new RegExp(`\\{${fieldName}\\}`, 'g'), () => String(fieldValue))
  }

  return message
}
