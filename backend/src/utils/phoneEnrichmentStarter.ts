export interface LeadToEnrich {
  id: number
  firstName: string
  lastName: string
  phone: string | null
}

export interface PhoneEnrichmentStarterDeps {
  start: (leadId: number) => Promise<unknown>
  isAlreadyStarted: (error: unknown) => boolean
  // Must not overwrite a pending/running status, or a re-click would hide a live enrichment's progress
  markPending: (leadId: number) => Promise<unknown>
  markFailed: (leadId: number) => Promise<unknown>
}

export interface PhoneEnrichmentStartOutcome {
  started: number[]
  skipped: number[]
  alreadyRunning: number[]
  errors: Array<{ leadId: number; leadName: string; error: string }>
}

// Starts enrichment without waiting for it: a lead can take a minute across three providers,
// so the workflow reports progress on the lead itself and the UI polls for it
export async function startPhoneEnrichment(
  leads: LeadToEnrich[],
  { start, isAlreadyStarted, markPending, markFailed }: PhoneEnrichmentStarterDeps
): Promise<PhoneEnrichmentStartOutcome> {
  const outcome: PhoneEnrichmentStartOutcome = { started: [], skipped: [], alreadyRunning: [], errors: [] }

  await Promise.all(
    leads.map(async (lead) => {
      // Never overwrite a phone the user imported
      if (lead.phone) {
        outcome.skipped.push(lead.id)
        return
      }

      try {
        await markPending(lead.id)
        await start(lead.id)
        outcome.started.push(lead.id)
      } catch (error) {
        if (isAlreadyStarted(error)) {
          outcome.alreadyRunning.push(lead.id)
          return
        }
        await markFailed(lead.id).catch((markError) =>
          console.error(`Failed to mark phone enrichment failed for lead ${lead.id}:`, markError)
        )
        outcome.errors.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`.trim(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  )

  for (const ids of [outcome.started, outcome.skipped, outcome.alreadyRunning]) {
    ids.sort((a, b) => a - b)
  }
  return outcome
}
