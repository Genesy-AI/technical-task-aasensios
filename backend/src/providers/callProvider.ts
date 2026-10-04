import type { EnrichableLead, PhoneProvider } from './phoneProviders'

// Carries whether retrying can help: client errors (bad input/credentials) won't fix themselves,
// server errors, rate limiting and network failures might
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export async function callProvider(
  provider: PhoneProvider,
  lead: EnrichableLead,
  signal?: AbortSignal
): Promise<string | null> {
  const { url, headers, body } = provider.buildRequest(lead)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    })
  } catch (error) {
    throw new ProviderError(`${provider.name}: request failed: ${(error as Error).message}`, true)
  }

  if (!response.ok) {
    const retryable = response.status >= 500 || response.status === 429
    throw new ProviderError(`${provider.name}: HTTP ${response.status}`, retryable)
  }

  return provider.parse(await response.json().catch(() => null))
}
