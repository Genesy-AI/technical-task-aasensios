import { describe, expect, it } from 'vitest'
import { LEAD_FIELDS, normalizeLinkedinUrl, parseYearsAtCompany, sanitizeOptionalFields } from './leadFields'

describe('LEAD_FIELDS', () => {
  it('lists every templatable field with a label and group', () => {
    const keys = LEAD_FIELDS.filter((field) => field.templatable).map((field) => field.key)
    expect(keys).toEqual([
      'firstName',
      'lastName',
      'email',
      'phone',
      'countryCode',
      'companyName',
      'jobTitle',
      'yearsAtCompany',
      'linkedinUrl',
    ])
    for (const field of LEAD_FIELDS) {
      expect(field.label).toBeTruthy()
      expect(['contact', 'company', 'social']).toContain(field.group)
    }
  })

  it('accepts the sample files yearsInRole header for yearsAtCompany', () => {
    const field = LEAD_FIELDS.find((f) => f.key === 'yearsAtCompany')
    expect(field?.csvHeaders).toContain('yearsInRole')
  })
})

describe('parseYearsAtCompany', () => {
  it.each([
    ['5', 5],
    [' 10 ', 10],
    ['0', 0],
    [7, 7],
  ])('parses %j as %i', (input, expected) => {
    expect(parseYearsAtCompany(input)).toEqual({ value: expected })
  })

  it.each(['', '  ', null, undefined])('treats %j as empty', (input) => {
    expect(parseYearsAtCompany(input)).toEqual({ value: null })
  })

  it.each(['2.5', '-1', '81', 'ten', '5 years'])('rejects %j', (input) => {
    expect(parseYearsAtCompany(input)).toEqual({ value: null, invalid: true })
  })
})

describe('normalizeLinkedinUrl', () => {
  it.each([
    ['https://www.linkedin.com/in/ada-lovelace', 'https://www.linkedin.com/in/ada-lovelace'],
    ['http://linkedin.com/in/ada-lovelace/', 'https://www.linkedin.com/in/ada-lovelace'],
    ['linkedin.com/in/ada-lovelace?trk=abc', 'https://www.linkedin.com/in/ada-lovelace'],
    ['https://es.linkedin.com/in/Ada-Lovelace-123/', 'https://www.linkedin.com/in/Ada-Lovelace-123'],
    ['  www.linkedin.com/in/ada  ', 'https://www.linkedin.com/in/ada'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeLinkedinUrl(input)).toEqual({ value: expected })
  })

  it.each(['', null, undefined])('treats %j as empty', (input) => {
    expect(normalizeLinkedinUrl(input)).toEqual({ value: null })
  })

  it.each([
    'https://www.linkedin.com/company/enginy',
    'https://evil.com/in/ada',
    'https://linkedin.com.evil.com/in/ada',
    'ada lovelace',
  ])('rejects %s', (input) => {
    expect(normalizeLinkedinUrl(input)).toEqual({ value: null, invalid: true })
  })
})

describe('sanitizeOptionalFields', () => {
  it('cleans the new fields and reports values it had to drop', () => {
    expect(
      sanitizeOptionalFields({ yearsAtCompany: '4', linkedinUrl: 'linkedin.com/in/ada/', phone: ' 555 ' })
    ).toEqual({
      data: { yearsAtCompany: 4, linkedinUrl: 'https://www.linkedin.com/in/ada', phone: '555' },
      dropped: [],
    })

    expect(sanitizeOptionalFields({ yearsAtCompany: 'many', linkedinUrl: 'ada' })).toEqual({
      data: { yearsAtCompany: null, linkedinUrl: null, phone: null },
      dropped: [
        { field: 'yearsAtCompany', value: 'many' },
        { field: 'linkedinUrl', value: 'ada' },
      ],
    })
  })
})
