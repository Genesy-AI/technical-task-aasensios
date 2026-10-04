import { describe, expect, it } from 'vitest'
import { countryName } from './countryCodes'

describe('countryName', () => {
  it('returns the English name for an ISO code', () => {
    expect(countryName('ES')).toBe('Spain')
    expect(countryName('GB')).toBe('United Kingdom')
    expect(countryName('TV')).toBe('Tuvalu')
  })

  it('falls back to the code when it is not a known country', () => {
    expect(countryName('ZZ')).toBe('ZZ')
    expect(countryName('not-a-code')).toBe('not-a-code')
  })
})
