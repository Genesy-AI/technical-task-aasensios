import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import toast, { Toaster } from 'react-hot-toast'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { LeadsVerifyEmailsOutput } from '../api/types/leads/verifyEmails'
import { LeadsList } from './LeadsList'

vi.mock('../api', () => ({
  api: {
    leads: {
      getMany: vi.fn(),
      deleteMany: vi.fn(),
      verifyEmails: vi.fn(),
    },
  },
}))

const makeLead = (id: number, firstName: string, lastName: string) => ({
  id,
  createdAt: '2024-07-25T00:00:00.000Z',
  updatedAt: '2024-07-25T00:00:00.000Z',
  firstName,
  lastName,
  email: `${firstName}.${lastName}@example.com`.toLowerCase(),
  jobTitle: null,
  countryCode: null,
  companyName: null,
  message: null,
  emailVerified: null,
})

const renderLeadsList = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster />
      <LeadsList />
    </QueryClientProvider>
  )

// Checkbox 0 is "select all"; the rest follow the lead rows in order
const selectAndVerify = async (checkboxIndex: number) => {
  await screen.findByText('jane.smith@example.com', { exact: false })
  fireEvent.click(screen.getAllByRole('checkbox')[checkboxIndex])
  fireEvent.click(screen.getByRole('button', { name: /enrich/i }))
  fireEvent.click(screen.getByRole('button', { name: /verify email/i }))
}
const selectAllAndVerify = () => selectAndVerify(0)

const successToast = /^\d+ valid emails?$/

describe('LeadsList email verification feedback', () => {
  beforeEach(() => {
    vi.mocked(api.leads.getMany).mockResolvedValue([makeLead(1, 'John', 'Doe'), makeLead(2, 'Jane', 'Smith')])
  })

  afterEach(() => {
    act(() => toast.remove())
    cleanup()
    vi.clearAllMocks()
  })

  it('shows progress and blocks re-submission while verification is in flight', async () => {
    let resolveVerify!: (output: LeadsVerifyEmailsOutput) => void
    vi.mocked(api.leads.verifyEmails).mockReturnValue(new Promise((resolve) => (resolveVerify = resolve)))
    renderLeadsList()

    await selectAllAndVerify()

    expect(await screen.findByText('Verifying 2 emails...')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /enrich/i }))
    expect(screen.getByRole('button', { name: /verify email/i })).toBeDisabled()

    await act(async () => {
      resolveVerify({
        success: true,
        verifiedCount: 2,
        results: [
          { leadId: 1, emailVerified: false },
          { leadId: 2, emailVerified: true },
        ],
        errors: [],
      })
    })

    expect(await screen.findByText('1 valid email')).toBeInTheDocument()
    expect(screen.getByText('Invalid email for: John Doe')).toBeInTheDocument()
    expect(screen.queryByText('Verifying 2 emails...')).not.toBeInTheDocument()
  })

  it('does not report success when the only selected email is invalid', async () => {
    vi.mocked(api.leads.verifyEmails).mockResolvedValue({
      success: true,
      verifiedCount: 1,
      results: [{ leadId: 1, emailVerified: false }],
      errors: [],
    })
    renderLeadsList()

    await selectAndVerify(1)

    expect(await screen.findByText('Invalid email for: John Doe')).toBeInTheDocument()
    expect(screen.queryByText(successToast)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Verified/)).not.toBeInTheDocument()
    // Dismissed toasts stay mounted briefly for their exit animation
    await waitFor(() => expect(screen.queryByText(/^Verifying/)).not.toBeInTheDocument(), { timeout: 2000 })
  })

  it('names the leads whose verification failed', async () => {
    vi.mocked(api.leads.verifyEmails).mockResolvedValue({
      success: true,
      verifiedCount: 1,
      results: [{ leadId: 1, emailVerified: false }],
      errors: [{ leadId: 2, leadName: 'Jane Smith', error: 'Workflow execution failed' }],
    })
    renderLeadsList()

    await selectAllAndVerify()

    expect(await screen.findByText('Could not verify email for: Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('Invalid email for: John Doe')).toBeInTheDocument()
    expect(screen.queryByText(successToast)).not.toBeInTheDocument()
  })

  it('does not report success when every verification failed', async () => {
    vi.mocked(api.leads.verifyEmails).mockResolvedValue({
      success: true,
      verifiedCount: 0,
      results: [],
      errors: [
        { leadId: 1, leadName: 'John Doe', error: 'Workflow execution failed' },
        { leadId: 2, leadName: 'Jane Smith', error: 'Workflow execution failed' },
      ],
    })
    renderLeadsList()

    await selectAllAndVerify()

    expect(await screen.findByText('Could not verify emails for: John Doe, Jane Smith')).toBeInTheDocument()
    expect(screen.queryByText(successToast)).not.toBeInTheDocument()
    // Dismissed toasts stay mounted briefly for their exit animation
    await waitFor(() => expect(screen.queryByText(/^Verifying/)).not.toBeInTheDocument(), { timeout: 2000 })
  })
})
