import { ApplicationFailure, Context } from '@temporalio/activity'
import { prisma } from '../../db'
import { callProvider, ProviderError } from '../../providers/callProvider'
import { astra, nimbus, orion, type EnrichableLead, type PhoneProvider } from '../../providers/phoneProviders'
import type { PhoneEnrichmentResult } from '../phoneEnrichmentTypes'

const findPhoneWith = (provider: PhoneProvider) => async (lead: EnrichableLead) => {
  try {
    // The signal aborts the request when the attempt times out or the workflow is cancelled
    return await callProvider(provider, lead, Context.current().cancellationSignal)
  } catch (error) {
    if (error instanceof ProviderError && !error.retryable) {
      throw ApplicationFailure.nonRetryable(error.message, 'ProviderClientError')
    }
    throw error
  }
}

// One activity per provider so each can have its own timeout (and, later, its own rate limit)
export const findPhoneWithOrion = findPhoneWith(orion)
export const findPhoneWithAstra = findPhoneWith(astra)
export const findPhoneWithNimbus = findPhoneWith(nimbus)

export async function loadLeadForEnrichment(leadId: number): Promise<EnrichableLead | null> {
  return prisma.lead.findUnique({
    where: { id: leadId },
    select: { firstName: true, lastName: true, email: true, jobTitle: true },
  })
}

export async function markPhoneEnrichmentRunning(leadId: number): Promise<void> {
  // updateMany: a lead deleted mid-enrichment is a no-op, not an error to retry
  await prisma.lead.updateMany({
    where: { id: leadId },
    data: { phoneEnrichmentStatus: 'running' },
  })
}

export async function savePhoneEnrichment(leadId: number, result: PhoneEnrichmentResult): Promise<void> {
  await prisma.lead.updateMany({
    where: { id: leadId },
    data:
      result.status === 'found'
        ? { phoneEnrichmentStatus: 'found', phone: result.phone, phoneSource: result.source }
        : { phoneEnrichmentStatus: result.status },
  })
}
