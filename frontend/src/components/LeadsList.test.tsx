import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/react'
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

const openEnrichMenu = () => fireEvent.click(screen.getByRole('button', { name: /enrich/i }))

const chooseEnrichAction = async (name: RegExp) => {
  openEnrichMenu()
  fireEvent.click(await screen.findByRole('menuitem', { name }))
}

// Checkbox 0 is "select all"; the rest follow the lead rows in order
const selectAndVerify = async (checkboxIndex: number) => {
  await screen.findByText('jane.smith@example.com', { exact: false })
  fireEvent.click(screen.getAllByRole('checkbox')[checkboxIndex])
  await chooseEnrichAction(/verify email/i)
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
    openEnrichMenu()
    expect(await screen.findByRole('menuitem', { name: /verify email/i })).toHaveAttribute('aria-disabled', 'true')

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
      {
        ...makeLead(1, 'John', 'Doe'),
        yearsAtCompany: 0,
        linkedinUrl: 'https://www.linkedin.com/in/john-doe',
      },
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
      {
        ...makeLead(1, 'John', 'Doe'),
        phone: '8577732848',
        phoneSource: 'orion',
        phoneEnrichmentStatus: 'found',
      },
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
    await chooseEnrichAction(/find phone/i)

    await waitFor(() => expect(api.leads.enrichPhones).toHaveBeenCalledWith({ leadIds: [1, 2] }))
    expect(await screen.findByText('Searching phone for 1 lead')).toBeInTheDocument()
    expect(screen.getByText('1 lead already has a phone')).toBeInTheDocument()
  })

  it('refreshes the table until the search finishes', async () => {
    vi.mocked(api.leads.getMany)
      .mockResolvedValueOnce([{ ...makeLead(1, 'John', 'Doe'), phoneEnrichmentStatus: 'running' }])
      .mockResolvedValue([
        {
          ...makeLead(1, 'John', 'Doe'),
          phone: '2630110166',
          phoneSource: 'astra',
          phoneEnrichmentStatus: 'found',
        },
      ])
    renderLeadsList()

    expect(await screen.findByText('Searching…')).toBeInTheDocument()
    expect(await screen.findByText('2630110166', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})

describe('LeadsList pagination', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('moves to the next page and stays there', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue(
      Array.from({ length: 15 }, (_, index) => makeLead(index + 1, `Lead${index + 1}`, 'Test'))
    )
    // The URL-backed adapter, so page changes go through window.location like in the app
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NuqsAdapter>
          <LeadsList />
        </NuqsAdapter>
      </QueryClientProvider>
    )

    expect(
      await screen.findByText('Page 1 of 2', { normalizer: (text) => text.replace(/\s+/g, ' ') })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /go to next page/i }))

    await waitFor(() => expect(window.location.search).toContain('page=2'))
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(window.location.search).toContain('page=2')
    expect(screen.getAllByRole('checkbox', { name: /^select lead/i })).toHaveLength(5)
    // The short last page is padded to a full page so the pagination below does not move
    expect(document.querySelectorAll('tbody tr')).toHaveLength(10)
  })
})

describe('LeadsList selection actions', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the actions in a bar only while leads are selected', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([makeLead(1, 'John', 'Doe'), makeLead(2, 'Jane', 'Smith')])
    renderLeadsList()

    await screen.findByText('jane.smith@example.com')
    expect(screen.queryByRole('button', { name: /generate messages/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('checkbox')[1])
    expect(await screen.findByText('1 selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /generate messages/i }))
    expect(await screen.findByText('Generate messages for 1 lead')).toBeInTheDocument()
    // Opening an action keeps the selection, so the bar stays
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('clears the selection from the bar', async () => {
    vi.mocked(api.leads.getMany).mockResolvedValue([makeLead(1, 'John', 'Doe'), makeLead(2, 'Jane', 'Smith')])
    renderLeadsList()

    await screen.findByText('jane.smith@example.com')
    fireEvent.click(screen.getAllByRole('checkbox')[1])
    fireEvent.click(await screen.findByRole('button', { name: /clear selection/i }))

    await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument())
    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked()
  })
})
