import { afterEach, describe, expect, it, vi } from 'vitest'
import { endpoint } from './utils'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends GET input as query parameters and returns the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]))
    vi.stubGlobal('fetch', fetchMock)

    const result = await endpoint<{ id: number }[], { page: number; q?: string }>(
      'get',
      '/leads'
    )({ page: 2 })

    expect(result).toEqual([{ id: 1 }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${import.meta.env.VITE_API_URL}/leads?page=2`)
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('sends other methods with a JSON body and a built path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ deletedCount: 2 }))
    vi.stubGlobal('fetch', fetchMock)

    await endpoint<unknown, { id: number }>('delete', ({ id }) => `/leads/${id}`)({ id: 7 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe(`${import.meta.env.VITE_API_URL}/leads/7`)
    expect(init.method).toBe('DELETE')
    expect(JSON.parse(init.body)).toEqual({ id: 7 })
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('rejects on error statuses with the server message when there is one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'Lead not found' }, 404)))
    await expect(endpoint('get', '/leads/9')()).rejects.toThrow('Lead not found')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))
    await expect(endpoint('get', '/leads')()).rejects.toThrow('Request failed with status code 500')
  })

  it('resolves to undefined for empty responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(endpoint('delete', '/leads/1')()).resolves.toBeUndefined()
  })
})
