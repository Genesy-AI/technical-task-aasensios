import type { ProviderName } from '../providers/phoneProviders'

export type PhoneEnrichmentStatus = 'pending' | 'running' | 'found' | 'not_found' | 'failed'

export type PhoneEnrichmentResult =
  | { status: 'found'; phone: string; source: ProviderName }
  | { status: 'not_found' | 'failed' }
