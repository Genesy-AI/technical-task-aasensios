import { describe, expect, it, vi } from 'vitest'
import { startPhoneEnrichment, type LeadToEnrich } from './phoneEnrichmentStarter'

const lead = (id: number, phone: string | null = null): LeadToEnrich => ({
  id,
  firstName: 'Ada',
  lastName: `Lovelace ${id}`,
  phone,
})

const deps = () => ({
  start: vi.fn(async () => undefined),
  isAlreadyStarted: (error: unknown) => error instanceof Error && error.message === 'already started',
  markPending: vi.fn(async () => undefined),
  markFailed: vi.fn(async () => undefined),
})

describe('startPhoneEnrichment', () => {
  it('starts a workflow for each lead without a phone and marks it pending', async () => {
    const d = deps()

    const outcome = await startPhoneEnrichment([lead(1), lead(2)], d)

    expect(outcome).toEqual({ started: [1, 2], skipped: [], alreadyRunning: [], errors: [] })
    expect(d.markPending).toHaveBeenCalledWith(1)
    expect(d.start).toHaveBeenCalledWith(1)
    expect(d.start).toHaveBeenCalledWith(2)
  })

  it('skips leads that already have a phone', async () => {
    const d = deps()

    const outcome = await startPhoneEnrichment([lead(1, '8577732848'), lead(2)], d)

    expect(outcome.skipped).toEqual([1])
    expect(outcome.started).toEqual([2])
    expect(d.start).not.toHaveBeenCalledWith(1)
  })

  it('reports leads whose enrichment is already running', async () => {
    const d = deps()
    d.start.mockRejectedValueOnce(new Error('already started'))

    const outcome = await startPhoneEnrichment([lead(1)], d)

    expect(outcome.alreadyRunning).toEqual([1])
    expect(outcome.started).toEqual([])
    expect(d.markFailed).not.toHaveBeenCalled()
  })

  it('marks the lead failed and reports an error when the workflow cannot start', async () => {
    const d = deps()
    d.start.mockRejectedValueOnce(new Error('Temporal unavailable'))

    const outcome = await startPhoneEnrichment([lead(1)], d)

    expect(outcome.errors).toEqual([{ leadId: 1, leadName: 'Ada Lovelace 1', error: 'Temporal unavailable' }])
    expect(d.markFailed).toHaveBeenCalledWith(1)
  })
})
