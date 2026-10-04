import { LeadField } from '../api/types/leads/getFields'

// Mirrors GET /leads/fields (backend/src/leadFields.ts) for tests
export const leadFieldsFixture: LeadField[] = [
  { key: 'firstName', label: 'First name', group: 'contact', type: 'text', required: true, templatable: true, csvHeaders: ['firstName'] },
  { key: 'lastName', label: 'Last name', group: 'contact', type: 'text', required: true, templatable: true, csvHeaders: ['lastName'] },
  { key: 'email', label: 'Email', group: 'contact', type: 'email', required: true, templatable: true, csvHeaders: ['email'] },
  { key: 'phone', label: 'Phone', group: 'contact', type: 'phone', required: false, templatable: true, csvHeaders: ['phone', 'phoneNumber'] },
  { key: 'countryCode', label: 'Country', group: 'contact', type: 'countryCode', required: false, templatable: true, csvHeaders: ['countryCode'] },
  { key: 'companyName', label: 'Company', group: 'company', type: 'text', required: false, templatable: true, csvHeaders: ['companyName'] },
  { key: 'jobTitle', label: 'Job title', group: 'company', type: 'text', required: false, templatable: true, csvHeaders: ['jobTitle'] },
  { key: 'yearsAtCompany', label: 'Years at company', group: 'company', type: 'integer', required: false, templatable: true, csvHeaders: ['yearsAtCompany', 'yearsInRole'] },
  { key: 'linkedinUrl', label: 'LinkedIn', group: 'social', type: 'url', required: false, templatable: true, csvHeaders: ['linkedinUrl', 'linkedin', 'linkedinProfile'] },
]
