import { LeadField } from '../api/types/leads/getFields'

// Mirrors the backend's template rules (backend/src/utils/messageGenerator.ts) so the composer
// can warn before generating instead of after

type LeadValues = Record<string, unknown>

const VARIABLE = /\{(\w+)\}/g

const isMissing = (value: unknown) => value === null || value === undefined || value === ''

export const templateVariables = (template: string): string[] => [
  ...new Set(Array.from(template.matchAll(VARIABLE), (match) => match[1])),
]

export const findUnknownFields = (template: string, fields: LeadField[]): string[] => {
  const known = new Set(fields.filter((field) => field.templatable).map((field) => field.key as string))
  return templateVariables(template).filter((variable) => !known.has(variable))
}

export type MissingField = { key: string; label: string; missing: number }

export const findMissingFields = (template: string, leads: LeadValues[], fields: LeadField[]): MissingField[] =>
  templateVariables(template).flatMap((variable) => {
    const field = fields.find((f) => f.templatable && f.key === variable)
    if (!field) return []
    const missing = leads.filter((lead) => isMissing(lead[field.key])).length
    return missing > 0 ? [{ key: field.key, label: field.label, missing }] : []
  })

export type PreviewSegment = { text: string; missing?: true }

export const renderPreview = (template: string, lead: LeadValues): PreviewSegment[] => {
  const segments: PreviewSegment[] = []
  let last = 0
  for (const match of template.matchAll(VARIABLE)) {
    if (match.index > last) segments.push({ text: template.slice(last, match.index) })
    const value = lead[match[1]]
    segments.push(isMissing(value) ? { text: match[0], missing: true } : { text: String(value) })
    last = match.index + match[0].length
  }
  if (last < template.length) segments.push({ text: template.slice(last) })
  return segments
}

// An unclosed `{word` ending at the caret, i.e. the user is typing a variable name
export const getAutocompleteMatch = (text: string, caret: number): { start: number; query: string } | null => {
  const match = text.slice(0, caret).match(/\{(\w*)$/)
  if (!match || match.index === undefined) return null
  return { start: match.index, query: match[1] }
}
