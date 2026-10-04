export type LeadFieldsGetInput = undefined

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
  csvHeaders: string[]
}

export type LeadFieldsGetOutput = LeadField[]
