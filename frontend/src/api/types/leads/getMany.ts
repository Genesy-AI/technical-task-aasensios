export type LeadsGetManyInput = undefined

export type PhoneSource = 'csv' | 'orion' | 'astra' | 'nimbus'

export type PhoneEnrichmentStatus = 'pending' | 'running' | 'found' | 'not_found' | 'failed'

export type LeadsGetManyOutput = {
  id: number
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string | null
  email: string | null
  jobTitle: string | null
  countryCode: string | null
  companyName: string | null
  message: string | null
  emailVerified: boolean | null
  phone: string | null
  phoneSource: PhoneSource | null
  phoneEnrichmentStatus: PhoneEnrichmentStatus | null
  yearsAtCompany: number | null
  linkedinUrl: string | null
}[]
