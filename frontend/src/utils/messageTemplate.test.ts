import { describe, expect, it } from 'vitest'
import { leadFieldsFixture } from '../test/leadFields'
import {
  findMissingFields,
  findUnknownFields,
  getAutocompleteMatch,
  renderPreview,
  templateVariables,
} from './messageTemplate'

const ada = { firstName: 'Ada', lastName: 'Lovelace', phone: null, yearsAtCompany: 0, companyName: '' }
const bob = { firstName: 'Bob', lastName: null, phone: '555', yearsAtCompany: null, companyName: 'Acme' }

describe('templateVariables', () => {
  it('lists each variable once, in order', () => {
    expect(templateVariables('Hi {firstName} {lastName}, {firstName}! {not-a-var} { spaced }')).toEqual([
      'firstName',
      'lastName',
    ])
  })
})

describe('findUnknownFields', () => {
  it('returns variables that are not templatable fields', () => {
    expect(findUnknownFields('Hi {firstName} from {gender}', leadFieldsFixture)).toEqual(['gender'])
  })
})

describe('findMissingFields', () => {
  it('counts the leads missing each variable, treating 0 as present', () => {
    expect(
      findMissingFields('{firstName} {lastName} {phone} {yearsAtCompany} {companyName}', [ada, bob], leadFieldsFixture)
    ).toEqual([
      { key: 'lastName', label: 'Last name', missing: 1 },
      { key: 'phone', label: 'Phone', missing: 1 },
      { key: 'yearsAtCompany', label: 'Years at company', missing: 1 },
      { key: 'companyName', label: 'Company', missing: 1 },
    ])
  })

  it('ignores unknown variables', () => {
    expect(findMissingFields('{gender}', [ada], leadFieldsFixture)).toEqual([])
  })
})

describe('renderPreview', () => {
  it('fills known values and leaves missing ones as placeholders', () => {
    expect(renderPreview('Hi {firstName}, {yearsAtCompany} years. Call {phone}?', ada)).toEqual([
      { text: 'Hi ' },
      { text: 'Ada' },
      { text: ', ' },
      { text: '0' },
      { text: ' years. Call ' },
      { text: '{phone}', missing: true },
      { text: '?' },
    ])
  })
})

describe('getAutocompleteMatch', () => {
  it('matches an unclosed brace right before the caret', () => {
    const text = 'Hi {fir'
    expect(getAutocompleteMatch(text, text.length)).toEqual({ start: 3, query: 'fir' })
  })

  it('matches a bare brace with an empty query', () => {
    expect(getAutocompleteMatch('Hi {', 4)).toEqual({ start: 3, query: '' })
  })

  it('does not match once the brace is closed or interrupted', () => {
    expect(getAutocompleteMatch('Hi {firstName}', 14)).toBeNull()
    expect(getAutocompleteMatch('Hi {first name', 14)).toBeNull()
    expect(getAutocompleteMatch('Hi there', 8)).toBeNull()
  })

  it('uses the caret position, not the end of the text', () => {
    expect(getAutocompleteMatch('Hi {co and more', 6)).toEqual({ start: 3, query: 'co' })
  })
})
