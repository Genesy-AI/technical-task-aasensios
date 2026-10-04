import { describe, expect, it } from 'vitest'
import { astra, nimbus, orion, phoneProviders } from './phoneProviders'

const lead = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@analytical.io',
  jobTitle: 'CTO',
}

describe('phoneProviders', () => {
  it('are queried in the order Orion, Astra, Nimbus', () => {
    expect(phoneProviders.map((provider) => provider.name)).toEqual(['orion', 'astra', 'nimbus'])
  })
})

describe('orion', () => {
  it('derives the company website from the email domain', () => {
    const request = orion.buildRequest(lead)
    expect(request.url).toBe('https://api.enginy.ai/api/tmp/orionConnect')
    expect(request.headers['x-auth-me']).toBe('mySecretKey123')
    expect(request.body).toEqual({ fullName: 'Ada Lovelace', companyWebsite: 'analytical.io' })
  })

  it('skips leads with a free-mail address, which has no company website', () => {
    expect(orion.canHandle({ ...lead, email: 'ada@Gmail.com' })).toBe(false)
    expect(orion.canHandle(lead)).toBe(true)
  })

  it('skips leads without a usable email domain', () => {
    expect(orion.canHandle({ ...lead, email: 'not-an-email' })).toBe(false)
  })

  it('parses the phone field', () => {
    expect(orion.parse({ phone: '8577732848' })).toBe('8577732848')
    expect(orion.parse({ phone: null })).toBeNull()
  })
})

describe('astra', () => {
  it('sends the email with the apiKey header', () => {
    const request = astra.buildRequest(lead)
    expect(request.url).toBe('https://api.enginy.ai/api/tmp/astraDialer')
    expect(request.headers.apiKey).toBe('1234jhgf')
    expect(request.body).toEqual({ email: 'ada@analytical.io' })
  })

  it('handles any lead with an email', () => {
    expect(astra.canHandle({ ...lead, email: 'ada@gmail.com', jobTitle: null })).toBe(true)
    expect(astra.canHandle({ ...lead, email: '  ' })).toBe(false)
  })

  it('parses phoneNmbr, treating null and undefined as no data', () => {
    expect(astra.parse({ phoneNmbr: '2630110166' })).toBe('2630110166')
    expect(astra.parse({ phoneNmbr: null })).toBeNull()
    expect(astra.parse({})).toBeNull()
  })
})

describe('nimbus', () => {
  it('authenticates with the api query parameter', () => {
    const request = nimbus.buildRequest(lead)
    expect(request.url).toBe('https://api.enginy.ai/api/tmp/numbusLookup?api=000099998888')
    expect(request.body).toEqual({ email: 'ada@analytical.io', jobTitle: 'CTO' })
  })

  it('requires a job title', () => {
    expect(nimbus.canHandle({ ...lead, jobTitle: null })).toBe(false)
    expect(nimbus.canHandle({ ...lead, jobTitle: ' ' })).toBe(false)
    expect(nimbus.canHandle(lead)).toBe(true)
  })

  it('parses the numeric phoneNmbr the API actually returns', () => {
    expect(nimbus.parse({ phoneNmbr: 6194513271, countryCode: 'ES' })).toBe('6194513271')
  })

  it('parses the documented number field too', () => {
    expect(nimbus.parse({ number: 6194513271, countryCode: 'ES' })).toBe('6194513271')
  })

  it('treats a missing number as no data', () => {
    expect(nimbus.parse({ countryCode: 'ES' })).toBeNull()
    expect(nimbus.parse(null)).toBeNull()
  })
})
