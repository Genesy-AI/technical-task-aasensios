import { describe, it, expect } from 'vitest'
import { isValidCountryCode, normalizeCountryCode } from './countryCodes'

describe('isValidCountryCode', () => {
  it('accepts ISO 3166-1 alpha-2 codes', () => {
    expect(isValidCountryCode('US')).toBe(true)
    expect(isValidCountryCode('GB')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidCountryCode('XXX')).toBe(false)
    expect(isValidCountryCode('12')).toBe(false)
    expect(isValidCountryCode('UK')).toBe(false)
    expect(isValidCountryCode('us')).toBe(false)
  })
})

describe('normalizeCountryCode', () => {
  it('keeps valid codes, trimmed and uppercased', () => {
    expect(normalizeCountryCode('US')).toEqual({ countryCode: 'US', dropped: false })
    expect(normalizeCountryCode(' us ')).toEqual({ countryCode: 'US', dropped: false })
  })

  it('maps UK to GB', () => {
    expect(normalizeCountryCode('UK')).toEqual({ countryCode: 'GB', dropped: false })
    expect(normalizeCountryCode('uk')).toEqual({ countryCode: 'GB', dropped: false })
  })

  it('turns missing or empty values into null without dropping anything', () => {
    expect(normalizeCountryCode(undefined)).toEqual({ countryCode: null, dropped: false })
    expect(normalizeCountryCode(null)).toEqual({ countryCode: null, dropped: false })
    expect(normalizeCountryCode('  ')).toEqual({ countryCode: null, dropped: false })
  })

  it('drops unrecognized codes and non-strings', () => {
    expect(normalizeCountryCode('XXX')).toEqual({ countryCode: null, dropped: true })
    expect(normalizeCountryCode('12')).toEqual({ countryCode: null, dropped: true })
    expect(normalizeCountryCode('United Kingdom')).toEqual({ countryCode: null, dropped: true })
    expect(normalizeCountryCode(12)).toEqual({ countryCode: null, dropped: true })
  })
})
