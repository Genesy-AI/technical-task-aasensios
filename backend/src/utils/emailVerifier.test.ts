import { describe, it, expect, vi } from 'vitest'
import { verifyLeadEmails, LeadToVerify } from './emailVerifier'

const john: LeadToVerify = { id: 1, firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' }
const jane: LeadToVerify = { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane.smith@example.com' }
const emily: LeadToVerify = {
  id: 3,
  firstName: 'Emily',
  lastName: 'Johnson',
  email: 'emily.johnson@example.com',
}

describe('verifyLeadEmails', () => {
  it('verifies all leads concurrently', async () => {
    const started: string[] = []
    const pending: Array<(value: boolean) => void> = []
    const verify = vi.fn((lead: LeadToVerify) => {
      started.push(lead.email)
      return new Promise<boolean>((resolve) => pending.push(resolve))
    })

    const run = verifyLeadEmails([john, jane, emily], { verify, saveResult: vi.fn() })
    await vi.waitFor(() => expect(started).toHaveLength(3))

    pending.forEach((resolve) => resolve(true))
    await expect(run).resolves.toMatchObject({ verifiedCount: 3 })
  })

  it('saves each verification result', async () => {
    const saveResult = vi.fn()
    const verify = async (lead: LeadToVerify) => lead.id !== john.id

    const outcome = await verifyLeadEmails([john, emily], { verify, saveResult })

    expect(saveResult).toHaveBeenCalledWith(1, false)
    expect(saveResult).toHaveBeenCalledWith(3, true)
    expect(outcome).toEqual({
      verifiedCount: 2,
      results: [
        { leadId: 1, emailVerified: false },
        { leadId: 3, emailVerified: true },
      ],
      errors: [],
    })
  })

  it('reports failed leads and resets their stale verification status', async () => {
    const saveResult = vi.fn()
    const verify = async (lead: LeadToVerify) => {
      if (lead.id === jane.id) throw new Error('Workflow execution failed')
      return true
    }

    const outcome = await verifyLeadEmails([john, jane], { verify, saveResult })

    expect(saveResult).toHaveBeenCalledWith(2, null)
    expect(outcome).toEqual({
      verifiedCount: 1,
      results: [{ leadId: 1, emailVerified: true }],
      errors: [{ leadId: 2, leadName: 'Jane Smith', error: 'Workflow execution failed' }],
    })
  })
})
