export interface LeadToVerify {
  id: number
  firstName: string
  lastName: string
  email: string
}

export interface EmailVerifierDeps {
  verify: (lead: LeadToVerify) => Promise<boolean>
  saveResult: (leadId: number, emailVerified: boolean | null) => Promise<unknown> | unknown
}

export interface EmailVerificationOutcome {
  verifiedCount: number
  results: Array<{ leadId: number; emailVerified: boolean }>
  errors: Array<{ leadId: number; leadName: string; error: string }>
}

export async function verifyLeadEmails(
  leads: LeadToVerify[],
  { verify, saveResult }: EmailVerifierDeps
): Promise<EmailVerificationOutcome> {
  const outcomes = await Promise.all(
    leads.map(async (lead) => {
      try {
        const emailVerified = await verify(lead)
        await saveResult(lead.id, emailVerified)
        return { ok: true as const, leadId: lead.id, emailVerified }
      } catch (error) {
        // Clear any previous status so the UI doesn't show a stale result as current
        await Promise.resolve(saveResult(lead.id, null)).catch((resetError) =>
          console.error(`Failed to reset email status for lead ${lead.id}:`, resetError)
        )
        return {
          ok: false as const,
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName}`.trim(),
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )

  const results = outcomes.flatMap((o) =>
    o.ok ? [{ leadId: o.leadId, emailVerified: o.emailVerified }] : []
  )
  const errors = outcomes.flatMap((o) =>
    o.ok ? [] : [{ leadId: o.leadId, leadName: o.leadName, error: o.error }]
  )

  return { verifiedCount: results.length, results, errors }
}
