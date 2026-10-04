if (!import.meta.env.VITE_API_URL || typeof import.meta.env.VITE_API_URL !== 'string') {
  throw new Error('VITE_API_URL is not set')
}

const API_URL: string = import.meta.env.VITE_API_URL

type Method = 'get' | 'delete' | 'post' | 'put' | 'patch'

const toQueryString = (params: unknown) => {
  if (!params || typeof params !== 'object') return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    for (const item of Array.isArray(value) ? value : [value]) search.append(key, String(item))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

const parseBody = async (res: Response): Promise<unknown> => {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const getErrorMessage = (body: unknown, status: number) => {
  if (body && typeof body === 'object') {
    const { error, message } = body as { error?: unknown; message?: unknown }
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message
  }
  return `Request failed with status code ${status}`
}

export const request = async (method: Method, path: string, input?: unknown): Promise<unknown> => {
  const isGet = method === 'get'
  const res = await fetch(`${API_URL}${path}${isGet ? toQueryString(input) : ''}`, {
    method: method.toUpperCase(),
    headers: { 'Content-Type': 'application/json' },
    body: isGet || input === undefined ? undefined : JSON.stringify(input),
  })
  const body = await parseBody(res)
  if (!res.ok) throw new Error(getErrorMessage(body, res.status))
  return body
}
