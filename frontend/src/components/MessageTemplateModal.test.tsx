import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  const search = await screen.findByRole('combobox', { name: /search fields/i })
  await waitFor(() => expect(search).toBeEnabled())
  return search
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

  const openPicker = async () => {
    const search = await fieldsLoaded()
    act(() => search.focus())
    return search
  }

  it('lists every field grouped by category when the search box is focused', async () => {
    renderModal()
    const search = await fieldsLoaded()
    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()

    act(() => search.focus())

    const picker = screen.getByRole('listbox', { name: /insert field/i })
    expect(within(picker).getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual([
      'Contact',
      'Company',
      'Social',
    ])
    expect(within(picker).getAllByRole('option')).toHaveLength(leadFieldsFixture.length)
  })

  it('narrows the options as you type, by label or placeholder', async () => {
    renderModal()
    const search = await openPicker()
    const picker = screen.getByRole('listbox', { name: /insert field/i })

    fireEvent.change(search, { target: { value: 'link' } })
    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'LinkedIn{linkedinUrl}',
    ])
    expect(within(picker).getAllByRole('group').map((group) => group.getAttribute('aria-label'))).toEqual(['Social'])

    fireEvent.change(search, { target: { value: 'countryco' } })
    expect(within(picker).getByRole('option')).toHaveTextContent('Country')

    fireEvent.change(search, { target: { value: 'gender' } })
    expect(within(picker).queryByRole('option')).not.toBeInTheDocument()
    expect(within(picker).getByText('No matching fields')).toBeInTheDocument()
  })

  it('inserts the highlighted match at the cursor with the keyboard', async () => {
    renderModal()
    await fieldsLoaded()
    type('Hi , welcome')
    textarea().setSelectionRange(3, 3)

    const search = await openPicker()
    fireEvent.change(search, { target: { value: 'name' } })
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('First name')

    fireEvent.keyDown(search, { key: 'ArrowDown' })
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Last name')
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(textarea().value).toBe('Hi {lastName}, welcome')
    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()
    expect(search).toHaveValue('')
  })

  it('opens the options when typing straight into the closed search box', async () => {
    renderModal()
    const search = await openPicker()
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'comp' } })

    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Company')
  })

  it('inserts a field when clicked', async () => {
    renderModal()
    await openPicker()

    fireEvent.mouseDown(screen.getByRole('option', { name: /linkedin/i }))

    expect(textarea().value).toBe('{linkedinUrl}')
    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()
  })

  it('closes the picker, but not the modal, with Escape', async () => {
    const onClose = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MessageTemplateModal isOpen onClose={onClose} selectedLeads={[ada]} />
      </QueryClientProvider>
    )
    const search = await openPicker()

    fireEvent.keyDown(search, { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes the picker when focus moves elsewhere', async () => {
    renderModal()
    const search = await openPicker()

    fireEvent.blur(search, { relatedTarget: textarea() })

    expect(screen.queryByRole('listbox', { name: /insert field/i })).not.toBeInTheDocument()
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
