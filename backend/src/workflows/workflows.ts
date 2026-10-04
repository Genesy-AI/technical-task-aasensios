import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'

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
