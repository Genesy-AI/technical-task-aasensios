import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import toast, { Toaster } from 'react-hot-toast'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { LeadsVerifyEmailsOutput } from '../api/types/leads/verifyEmails'
import { LeadsList } from './LeadsList'
import { leadFieldsFixture } from '../test/leadFields'

vi.mock('../api', () => ({
  api: {
    leads: {
      getMany: vi.fn(),
      deleteMany: vi.fn(),
      verifyEmails: vi.fn(),
      enrichPhones: vi.fn(),
      getFields: vi.fn(),
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
  phone: null,
  phoneSource: null,
  phoneEnrichmentStatus: null,
  yearsAtCompany: null,
  linkedinUrl: null,
})

const renderLeadsList = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster />
      <NuqsTestingAdapter>
        <LeadsList />
      </NuqsTestingAdapter>
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

beforeEach(() => {
  vi.mocked(api.leads.getFields).mockResolvedValue(leadFieldsFixture)
})

describe('LeadsList new lead fields', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows years at company and links to the LinkedIn profile', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([
      { ...makeLead(1, 'John', 'Doe'), yearsAtCompany: 0, linkedinUrl: 'https://www.linkedin.com/in/john-doe' },
      makeLead(2, 'Jane', 'Smith'),
    ])
    renderLeadsList()

    expect(await screen.findByRole('columnheader', { name: /years at company/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /linkedin/i })).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /linkedin profile of john doe/i })
    expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/john-doe')
    expect(link).toHaveAttribute('target', '_blank')
  })
})

describe('LeadsList table columns', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows email verification in its own column', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([
      { ...makeLead(1, 'John', 'Doe'), emailVerified: true },
      { ...makeLead(2, 'Jane', 'Smith'), emailVerified: false },
      makeLead(3, 'Ann', 'Lee'),
    ])
    renderLeadsList()

    expect(await screen.findByRole('columnheader', { name: /email status/i })).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.getByText('Invalid')).toBeInTheDocument()
    expect(screen.getByText('Not verified')).toBeInTheDocument()
    expect(screen.queryByText(/[✅❌❓]/u)).not.toBeInTheDocument()
  })

  it('shows country names instead of codes, keeping the code as a tooltip', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([{ ...makeLead(1, 'John', 'Doe'), countryCode: 'ES' }])
    renderLeadsList()

    const country = await screen.findByText('Spain')
    expect(country).toHaveAttribute('title', 'ES')
  })
})

describe('LeadsList phone enrichment', () => {
  afterEach(() => {
    act(() => toast.remove())
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the phone with its source, or the enrichment status', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([
      { ...makeLead(1, 'John', 'Doe'), phone: '8577732848', phoneSource: 'orion', phoneEnrichmentStatus: 'found' },
      { ...makeLead(2, 'Jane', 'Smith'), phone: '+1-280-754-0462', phoneSource: 'csv' },
      { ...makeLead(3, 'Ann', 'Lee'), phoneEnrichmentStatus: 'not_found' },
      { ...makeLead(4, 'Bob', 'Ray'), phoneEnrichmentStatus: 'failed' },
      { ...makeLead(5, 'Eve', 'Fox') },
    ])
    renderLeadsList()

    expect(await screen.findByText('8577732848')).toBeInTheDocument()
    expect(screen.getByText('via Orion Connect')).toBeInTheDocument()
    expect(screen.getByText('+1-280-754-0462')).toBeInTheDocument()
    expect(screen.getByText('via CSV import')).toBeInTheDocument()
    expect(screen.getByText('No data found')).toBeInTheDocument()
    expect(screen.getByText('Search failed')).toBeInTheDocument()
  })

  it('starts the search for the selected leads and summarizes what happened', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([makeLead(1, 'John', 'Doe'), makeLead(2, 'Jane', 'Smith')])
    vi.mocked(api.leads.enrichPhones).mockResolvedValue({
      success: true,
      started: [1],
      skipped: [2],
      alreadyRunning: [],
      errors: [],
    })
    renderLeadsList()

    await screen.findByText('jane.smith@example.com', { exact: false })
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: /enrich/i }))
    fireEvent.click(screen.getByRole('button', { name: /find phone/i }))

    await waitFor(() => expect(api.leads.enrichPhones).toHaveBeenCalledWith({ leadIds: [1, 2] }))
    expect(await screen.findByText('Searching phone for 1 lead')).toBeInTheDocument()
    expect(screen.getByText('1 lead already has a phone')).toBeInTheDocument()
  })

  it('refreshes the table until the search finishes', async () => {
    vi.mocked(api.leads.getMany)
      .mockResolvedValueOnce([{ ...makeLead(1, 'John', 'Doe'), phoneEnrichmentStatus: 'running' }])
      .mockResolvedValue([
        { ...makeLead(1, 'John', 'Doe'), phone: '2630110166', phoneSource: 'astra', phoneEnrichmentStatus: 'found' },
      ])
    renderLeadsList()

    expect(await screen.findByText('Searching…')).toBeInTheDocument()
    expect(await screen.findByText('2630110166', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
