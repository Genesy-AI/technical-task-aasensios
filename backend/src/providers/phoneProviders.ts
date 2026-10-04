// Adapters that hide each phone provider's input, auth and response shape behind one interface.
// Credentials are the ones given for the take-home; in production they belong in env/secrets.

const BASE_URL = 'https://api.enginy.ai/api/tmp'

export type EnrichableLead = {
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
}

export type ProviderName = 'orion' | 'astra' | 'nimbus'

export type ProviderRequest = {
  url: string
  headers: Record<string, string>
  body: unknown
}

export type PhoneProvider = {
  name: ProviderName
  // False when the lead lacks an input the provider requires; calling it would only return a 400
  canHandle(lead: EnrichableLead): boolean
  buildRequest(lead: EnrichableLead): ProviderRequest
  parse(json: unknown): string | null
}

// Free-mail domains say nothing about the lead's company, so they can't stand in for its website
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'gmx.com',
])

const companyDomain = (email: string): string | null => {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain || !domain.includes('.') || FREE_MAIL_DOMAINS.has(domain)) {
    return null
  }
  return domain
}

const hasText = (value: string | null | undefined): value is string => !!value && value.trim() !== ''

// Providers return phones as strings or numbers; null, undefined and empty values mean "no data"
const toPhone = (value: unknown): string | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim()
  }
  return null
}

const field = (json: unknown, key: string): unknown =>
  json && typeof json === 'object' ? (json as Record<string, unknown>)[key] : undefined

export const orion: PhoneProvider = {
  name: 'orion',
  canHandle: (lead) => companyDomain(lead.email) !== null,
  buildRequest: (lead) => ({
    url: `${BASE_URL}/orionConnect`,
    headers: { 'x-auth-me': 'mySecretKey123' },
    body: { fullName: `${lead.firstName} ${lead.lastName}`.trim(), companyWebsite: companyDomain(lead.email) },
  }),
  parse: (json) => toPhone(field(json, 'phone')),
}

export const astra: PhoneProvider = {
  name: 'astra',
  canHandle: (lead) => hasText(lead.email),
  buildRequest: (lead) => ({
    url: `${BASE_URL}/astraDialer`,
    headers: { apiKey: '1234jhgf' },
    body: { email: lead.email.trim() },
  }),
  parse: (json) => toPhone(field(json, 'phoneNmbr')),
}

export const nimbus: PhoneProvider = {
  name: 'nimbus',
  canHandle: (lead) => hasText(lead.email) && hasText(lead.jobTitle),
  buildRequest: (lead) => ({
    url: `${BASE_URL}/numbusLookup?api=000099998888`,
    headers: {},
    body: { email: lead.email.trim(), jobTitle: lead.jobTitle?.trim() },
  }),
  // Documented as `number`, but the API responds with `phoneNmbr`
  parse: (json) => toPhone(field(json, 'phoneNmbr') ?? field(json, 'number')),
}

export const phoneProviders: PhoneProvider[] = [orion, astra, nimbus]

export const getPhoneProvider = (name: ProviderName): PhoneProvider => {
  const provider = phoneProviders.find((p) => p.name === name)
  if (!provider) {
    throw new Error(`Unknown phone provider: ${name}`)
  }
  return provider
}
