import path from 'path'
import { Context } from '@temporalio/activity'
import { ActivityFailure, TimeoutFailure, WorkflowFailedError } from '@temporalio/client'
import { TestWorkflowEnvironment } from '@temporalio/testing'
import { Worker } from '@temporalio/worker'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import * as activities from './activities'
import { verifyEmailWorkflow } from './workflows'

const taskQueue = 'test-verify-email'
const workflowsPath = path.resolve(__dirname, './workflows.ts')

describe('verifyEmailWorkflow', () => {
  let env: TestWorkflowEnvironment

  beforeAll(async () => {
    env = await TestWorkflowEnvironment.createTimeSkipping()
  }, 120_000)

  afterAll(async () => {
    await env?.teardown()
  })

  const runWorkflow = async (activityImpls: typeof activities, email: string) => {
    const worker = await Worker.create({
      connection: env.nativeConnection,
      taskQueue,
      workflowsPath,
      activities: activityImpls,
    })

    return worker.runUntil(
      env.client.workflow.execute(verifyEmailWorkflow, {
        taskQueue,
        workflowId: `test-verify-email-${Date.now()}`,
        args: [email],
        // Backstop so an unbounded retry policy fails the test instead of hanging it
        workflowExecutionTimeout: '1 minute',
      })
    )
  }

  it('returns true for a valid email', async () => {
    await expect(runWorkflow(activities, 'emily.johnson@example.com')).resolves.toBe(true)
  })

  it('returns false for an invalid email', async () => {
    await expect(runWorkflow(activities, 'john.doe@example.com')).resolves.toBe(false)
  })

  it('fails after a bounded number of attempts when the provider never responds', async () => {
    let attempts = 0
    const hangingActivities: typeof activities = {
      ...activities,
      verifyEmail: async () => {
        attempts += 1
        // Sleep until the worker cancels the timed-out attempt
        await Context.current().sleep('1 hour')
        return true
      },
    }

    const error = await runWorkflow(hangingActivities, 'slow@example.com').catch((err) => err)

    expect(error).toBeInstanceOf(WorkflowFailedError)
    expect(error.cause).toBeInstanceOf(ActivityFailure)
    expect(error.cause.retryState).toBe('MAXIMUM_ATTEMPTS_REACHED')
    expect(error.cause.cause).toBeInstanceOf(TimeoutFailure)
    expect(attempts).toBe(3)
  }, 60_000)
})
