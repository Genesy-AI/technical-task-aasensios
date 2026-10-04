import path from 'path'
import { ApplicationFailure, Context } from '@temporalio/activity'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker } from '@temporalio/worker'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type * as activities from './activities'
import type { EnrichableLead } from '../providers/phoneProviders'
import type { PhoneEnrichmentResult } from './phoneEnrichmentTypes'
import { enrichPhoneWorkflow } from './workflows'

const taskQueue = 'test-enrich-phone'
const workflowsPath = path.resolve(__dirname, './workflows.ts')

const companyLead: EnrichableLead = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@analytical.io',
  jobTitle: 'CTO',
}

type ProviderFake = (lead: EnrichableLead) => Promise<string | null>
const noPhone: ProviderFake = async () => null

// Fake activities that record provider calls and the saved outcome instead of hitting HTTP/DB
const fakeActivities = (
  providers: { orion?: ProviderFake; astra?: ProviderFake; nimbus?: ProviderFake },
  lead: EnrichableLead | null = companyLead
) => {
  const calls: string[] = []
  const statuses: string[] = []
  let saved: PhoneEnrichmentResult | undefined

  const track =
    (name: string, impl: ProviderFake = noPhone): ProviderFake =>
    async (l) => {
      calls.push(name)
      return impl(l)
    }

  const impls: Partial<typeof activities> = {
    loadLeadForEnrichment: async () => lead,
    markPhoneEnrichmentRunning: async () => {
      statuses.push('running')
    },
    savePhoneEnrichment: async (_leadId, result) => {
      statuses.push(result.status)
      saved = result
    },
    findPhoneWithOrion: track('orion', providers.orion),
    findPhoneWithAstra: track('astra', providers.astra),
    findPhoneWithNimbus: track('nimbus', providers.nimbus),
  }

  return { impls, calls, statuses, saved: () => saved }
}

describe('enrichPhoneWorkflow', () => {
  let env: TestWorkflowEnvironment

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping()
  }, 120_000)

  afterAll(async () => {
    await env?.teardown()
  })

  const runWorkflow = async (impls: Partial<typeof activities>, leadId = 1) => {
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: impls,
    })

    return worker.runUntil(
      env.client.workflow.execute(enrichPhoneWorkflow, {
        taskQueue,
        workflowId: `test-enrich-phone-${leadId}-${Date.now()}`,
        args: [leadId],
        workflowExecutionTimeout: '5 minutes',
      })
    )
  }

  it('stops at Orion when it finds a phone', async () => {
    const fake = fakeActivities({ orion: async () => '8577732848' })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'found', phone: '8577732848', source: 'orion' })
    expect(fake.calls).toEqual(['orion'])
    expect(fake.statuses).toEqual(['running', 'found'])
  })

  it('falls through Orion and Astra to Nimbus in order', async () => {
    const fake = fakeActivities({ nimbus: async () => '6194513271' })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'found', phone: '6194513271', source: 'nimbus' })
    expect(fake.calls).toEqual(['orion', 'astra', 'nimbus'])
  })

  it('marks the lead as not found when no provider has a phone', async () => {
    const fake = fakeActivities({})

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'not_found' })
    expect(fake.calls).toEqual(['orion', 'astra', 'nimbus'])
    expect(fake.saved()).toEqual({ status: 'not_found' })
  })

  it('skips providers whose required inputs the lead lacks', async () => {
    const fake = fakeActivities({}, { ...companyLead, email: 'ada@gmail.com', jobTitle: null })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'not_found' })
    expect(fake.calls).toEqual(['astra'])
  })

  it('moves on to the next provider when one keeps failing', async () => {
    let orionAttempts = 0
    const fake = fakeActivities({
      orion: async () => {
        orionAttempts += 1
        throw new Error('Internal server error')
      },
      astra: async () => '2630110166',
    })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'found', phone: '2630110166', source: 'astra' })
    expect(orionAttempts).toBe(3)
  }, 60_000)

  it('does not retry a provider that rejects the input', async () => {
    let astraAttempts = 0
    const fake = fakeActivities({
      astra: async () => {
        astraAttempts += 1
        throw ApplicationFailure.nonRetryable('astra: HTTP 400', 'ProviderClientError')
      },
    })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'not_found' })
    expect(astraAttempts).toBe(1)
  })

  it('times out a hanging provider after a bounded number of attempts', async () => {
    let orionAttempts = 0
    const fake = fakeActivities({
      orion: async () => {
        orionAttempts += 1
        await Context.current().sleep('1 hour')
        return '8577732848'
      },
      astra: async () => '2630110166',
    })

    await expect(runWorkflow(fake.impls)).resolves.toMatchObject({ status: 'found', source: 'astra' })
    expect(orionAttempts).toBe(3)
  }, 60_000)

  it('marks the lead as failed when every provider it tried failed', async () => {
    const failing: ProviderFake = async () => {
      throw new Error('Internal server error')
    }
    const fake = fakeActivities({ orion: failing, astra: failing, nimbus: failing })

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'failed' })
    expect(fake.statuses).toEqual(['running', 'failed'])
  }, 60_000)

  it('fails without saving when the lead no longer exists', async () => {
    const fake = fakeActivities({}, null)

    await expect(runWorkflow(fake.impls)).resolves.toEqual({ status: 'failed' })
    expect(fake.calls).toEqual([])
    expect(fake.statuses).toEqual([])
  })

  it('runs at most one enrichment per lead at a time', async () => {
    const fake = fakeActivities({
      orion: async () => {
        await Context.current().sleep('1 second')
        return '8577732848'
      },
    })
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: fake.impls,
    })
    const workflowId = `test-enrich-phone-idempotent-${Date.now()}`
    const start = () => env.client.workflow.start(enrichPhoneWorkflow, { taskQueue, workflowId, args: [1] })

    await worker.runUntil(async () => {
      const handle = await start()
      await expect(start()).rejects.toBeInstanceOf(WorkflowExecutionAlreadyStartedError)
      await handle.result()
    })
    expect(fake.calls).toEqual(['orion'])
  }, 60_000)
})
