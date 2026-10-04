import { afterEach, describe, expect, it, vi } from 'vitest'
import { callProvider, ProviderError } from './callProvider'
import { astra } from './phoneProviders'

const lead = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@analytical.io', jobTitle: 'CTO' }

const mockFetch = (status: number, body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
  )

describe('callProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the provider request and returns the parsed phone', async () => {
    mockFetch(200, { phoneNmbr: '2630110166' })

    await expect(callProvider(astra, lead)).resolves.toBe('2630110166')

    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.enginy.ai/api/tmp/astraDialer')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('apiKey')).toBe('1234jhgf')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@analytical.io' })
  })

  it('returns null when the provider has no phone', async () => {
    mockFetch(200, { phoneNmbr: null })
    await expect(callProvider(astra, lead)).resolves.toBeNull()
  })

  it.each([400, 401, 403, 404])('fails without retry on a %i client error', async (status) => {
    mockFetch(status, { message: 'Missing required input' })
    await expect(callProvider(astra, lead)).rejects.toMatchObject({ retryable: false })
  })

  it.each([429, 500, 503])('fails with retry on a %i response', async (status) => {
    mockFetch(status, { message: 'Internal server error' })
    await expect(callProvider(astra, lead)).rejects.toMatchObject({ retryable: true })
  })

  it('fails with retry on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))
    const error = await callProvider(astra, lead).catch((e) => e)
    expect(error).toBeInstanceOf(ProviderError)
    expect(error.retryable).toBe(true)
  })
})
