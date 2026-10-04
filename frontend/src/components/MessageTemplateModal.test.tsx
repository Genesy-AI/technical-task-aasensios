import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { LeadsGetManyOutput } from '../api/types/leads/getMany'
import { leadFieldsFixture } from '../test/leadFields'
import { MessageTemplateModal } from './MessageTemplateModal'

vi.mock('../api', () => ({
  api: {
    leads: {
      getFields: vi.fn(),
      generateMessages: vi.fn(),
    },
  },
}))

const makeLead = (overrides: Partial<LeadsGetManyOutput[number]>): LeadsGetManyOutput[number] => ({
  id: 1,
  createdAt: '2024-07-25T00:00:00.000Z',
  updatedAt: '2024-07-25T00:00:00.000Z',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
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
  ...overrides,
})

const ada = makeLead({ id: 1, yearsAtCompany: 4 })
const bob = makeLead({ id: 2, firstName: 'Bob', lastName: 'Ray', phone: '555', yearsAtCompany: 0 })

const renderModal = (selectedLeads = [ada, bob]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MessageTemplateModal isOpen onClose={() => {}} selectedLeads={selectedLeads} />
    </QueryClientProvider>
  )

// The field picker enables once the registry has loaded
const fieldsLoaded = async () => {
  const button = await screen.findByRole('button', { name: /insert field/i })
  await waitFor(() => expect(button).toBeEnabled())
  return button
}

const textarea = () => screen.getByLabelText(/message template/i) as HTMLTextAreaElement

const type = (value: string) => {
  fireEvent.change(textarea(), { target: { value } })
  textarea().setSelectionRange(value.length, value.length)
  fireEvent.select(textarea())
}

describe('MessageTemplateModal', () => {
  beforeEach(() => {
    vi.mocked(api.leads.getFields).mockResolvedValue(leadFieldsFixture)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('suggests matching fields after typing { and inserts the chosen one with Enter', async () => {
    renderModal()
    await fieldsLoaded()

    type('Hi {ye')

    const listbox = await screen.findByRole('listbox', { name: /field suggestions/i })
    expect(listbox).toHaveTextContent('Years at company')
    expect(listbox).not.toHaveTextContent('First name')

    fireEvent.keyDown(textarea(), { key: 'Enter' })

    expect(textarea().value).toBe('Hi {yearsAtCompany}')
    expect(screen.queryByRole('listbox', { name: /field suggestions/i })).not.toBeInTheDocument()
  })

  it('moves through suggestions with the arrow keys and closes them with Escape', async () => {
    renderModal()
    await fieldsLoaded()

    type('{')
    const options = await screen.findAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(textarea(), { key: 'ArrowDown' })
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(textarea(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('inserts fields from a picker grouped by category', async () => {
    renderModal()
    fireEvent.click(await fieldsLoaded())

    expect(screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      'Contact',
      'Company',
      'Social',
    ])
    expect(screen.getByRole('group', { name: 'Company' })).toHaveTextContent('Years at company')

    fireEvent.click(screen.getByRole('menuitem', { name: /linkedin/i }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    expect(textarea().value).toBe('{linkedinUrl}')
  })

  it('closes the picker when focus moves elsewhere', async () => {
    renderModal()
    const button = await fieldsLoaded()
    fireEvent.click(button)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.blur(button, { relatedTarget: textarea() })

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('warns which fields are missing for some of the selected leads', async () => {
    renderModal()
    await fieldsLoaded()

    type('{firstName} {phone} {yearsAtCompany}')

    expect(await screen.findByText(/\{phone\} is missing for 1 of 2 leads/)).toBeInTheDocument()
    expect(screen.queryByText(/\{yearsAtCompany\} is missing/)).not.toBeInTheDocument()
  })

  it('flags unknown fields and blocks generating', async () => {
    renderModal()
    await fieldsLoaded()

    type('Hi {gender}')

    expect(await screen.findByText(/unknown field \{gender\}/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate messages/i })).toBeDisabled()
  })

  it('previews the message for the first selected lead', async () => {
    renderModal()
    await fieldsLoaded()

    type('Hi {firstName}, {yearsAtCompany} years. Call {phone}?')

    const preview = await screen.findByRole('region', { name: /preview/i })
    expect(preview).toHaveTextContent('Ada Lovelace')
    expect(preview).toHaveTextContent('Hi Ada, 4 years. Call {phone}?')
  })

  it('generates messages for the selected leads', async () => {
    vi.mocked(api.leads.generateMessages).mockResolvedValue({ success: true, generatedCount: 2, errors: [] })
    renderModal()
    await fieldsLoaded()

    type('Hi {firstName}')
    fireEvent.click(screen.getByRole('button', { name: /generate messages/i }))

    await waitFor(() =>
      expect(api.leads.generateMessages).toHaveBeenCalledWith({ leadIds: [1, 2], template: 'Hi {firstName}' })
    )
  })
})
