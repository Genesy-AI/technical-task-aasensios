import { proxyActivities, type ActivityOptions } from '@temporalio/workflow'
import type * as activities from './activities'
import { phoneProviders, type EnrichableLead, type ProviderName } from '../providers/phoneProviders'
import type { PhoneEnrichmentResult } from './phoneEnrichmentTypes'

// Bounded retries: Temporal's default policy retries forever, so a slow provider
// would keep the workflow (and the HTTP request awaiting it) running indefinitely.
const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '3 seconds',
  retry: {
    initialInterval: '1 second',
    maximumAttempts: 3,
  },
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  return await verifyEmail(email)
}

const providerRetry: ActivityOptions['retry'] = {
  initialInterval: '1 second',
  backoffCoefficient: 2,
  maximumAttempts: 3,
}

// Orion answers in ~4s, the others in ~1-2s; timeouts leave headroom without letting a hung call stall the chain
const { findPhoneWithOrion } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: providerRetry,
})

const { findPhoneWithAstra, findPhoneWithNimbus } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 seconds',
  retry: providerRetry,
})

const { loadLeadForEnrichment, markPhoneEnrichmentRunning, savePhoneEnrichment } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: '5 seconds',
  retry: { maximumAttempts: 5 },
})

const findPhone: Record<ProviderName, (lead: EnrichableLead) => Promise<string | null>> = {
  orion: findPhoneWithOrion,
  astra: findPhoneWithAstra,
  nimbus: findPhoneWithNimbus,
}

// Queries providers in order and stops at the first phone found. Start it with
// workflowId `enrich-phone-${leadId}` so a lead never has two enrichments running.
export async function enrichPhoneWorkflow(leadId: number): Promise<PhoneEnrichmentResult> {
  const lead = await loadLeadForEnrichment(leadId)
  if (!lead) {
    return { status: 'failed' }
  }

  await markPhoneEnrichmentRunning(leadId)

  let anyProviderAnswered = false
  for (const provider of phoneProviders) {
    if (!provider.canHandle(lead)) {
      continue
    }

    try {
      const phone = await findPhone[provider.name](lead)
      anyProviderAnswered = true
      if (phone) {
        const result: PhoneEnrichmentResult = { status: 'found', phone, source: provider.name }
        await savePhoneEnrichment(leadId, result)
        return result
      }
    } catch {
      // Out of retries (or the input was rejected): a failing provider shouldn't block the rest of the chain
    }
  }

  // "No data found" only when a provider actually answered; if all errored, the lead is worth retrying
  const result: PhoneEnrichmentResult = { status: anyProviderAnswered ? 'not_found' : 'failed' }
  await savePhoneEnrichment(leadId, result)
  return result
}
