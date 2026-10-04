import { describe, it, expect } from 'vitest'
import { parseCsv, isValidEmail, isValidCountryCode } from './csvParser'
import { leadFieldsFixture } from '../test/leadFields'

const parse = (content: string) => parseCsv(content, leadFieldsFixture)

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('first.last+tag@example.org')).toBe(true)
    expect(isValidEmail('123@456.com')).toBe(true)
  })

  it('should return false for invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('test@')).toBe(false)
    expect(isValidEmail('@example.com')).toBe(false)
    expect(isValidEmail('test.example.com')).toBe(false)
    expect(isValidEmail('test@.com')).toBe(false)
    expect(isValidEmail('test@example')).toBe(false)
  })
})

describe('isValidCountryCode', () => {
  it('should return true for ISO 3166-1 alpha-2 codes', () => {
    expect(isValidCountryCode('US')).toBe(true)
    expect(isValidCountryCode('ES')).toBe(true)
    expect(isValidCountryCode('GB')).toBe(true)
    expect(isValidCountryCode('TV')).toBe(true)
  })

  it('should return false for anything else', () => {
    expect(isValidCountryCode('')).toBe(false)
    expect(isValidCountryCode('XXX')).toBe(false)
    expect(isValidCountryCode('12')).toBe(false)
    expect(isValidCountryCode('XX')).toBe(false)
    expect(isValidCountryCode('UK')).toBe(false)
    expect(isValidCountryCode('us')).toBe(false)
    expect(isValidCountryCode('USA')).toBe(false)
  })
})

describe('parseCsv', () => {
  it('should throw error for empty content', () => {
    expect(() => parse('')).toThrow('CSV content cannot be empty')
    expect(() => parse('   ')).toThrow('CSV content cannot be empty')
  })

  it('should throw error for CSV with only headers', () => {
    const csv = 'firstName,lastName,email'
    expect(() => parse(csv)).toThrow('CSV file appears to be empty or contains no valid data')
  })

  it('should throw error for malformed CSV content', () => {
    const malformedCsv = `firstName,lastName,email
"John,Doe,john@example.com,extra"field`
    expect(() => parse(malformedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with mismatched field count', () => {
    const mismatchedCsv = `firstName,lastName,email
John,Doe,john@example.com,ExtraField,AnotherExtra
Jane,Smith`
    expect(() => parse(mismatchedCsv)).toThrow('CSV parsing failed')
  })

  it('should throw error for CSV with critical delimiter issues', () => {
    const noDelimiterCsv = `firstName lastName email
John Doe john@example.com`
    expect(() => parse(noDelimiterCsv)).toThrow()
  })

  it('should parse valid CSV with all required fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode,companyName
John,Doe,john.doe@example.com,Developer,US,Tech Corp`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      jobTitle: 'Developer',
      countryCode: 'US',
      companyName: 'Tech Corp',
      isValid: true,
      errors: [],
      rowIndex: 2,
    })
  })

  it('should read the phone from a phoneNumber or phone column', () => {
    const fromPhoneNumber = parse('firstName,lastName,email,phoneNumber\nAda,Lovelace,ada@example.com, +1-280-754-0462x2154 ')
    expect(fromPhoneNumber[0].phone).toBe('+1-280-754-0462x2154')

    const fromPhone = parse('firstName,lastName,email,phone\nAda,Lovelace,ada@example.com,8577732848')
    expect(fromPhone[0].phone).toBe('8577732848')

    const empty = parse('firstName,lastName,email,phoneNumber\nAda,Lovelace,ada@example.com,')
    expect(empty[0].phone).toBeUndefined()
  })

  it('should read years at company, including from the sample files yearsInRole column', () => {
    expect(parse('firstName,lastName,email,yearsAtCompany\nAda,Lovelace,ada@example.com,4')[0].yearsAtCompany).toBe('4')
    const fromSample = parse('firstName,lastName,email,yearsInRole\nAda,Lovelace,ada@example.com,0')[0]
    expect(fromSample.yearsAtCompany).toBe('0')
    expect(fromSample.isValid).toBe(true)
  })

  it('should flag years at company that are not a whole number of years', () => {
    const [lead] = parse('firstName,lastName,email,yearsAtCompany\nAda,Lovelace,ada@example.com,2.5')
    expect(lead.isValid).toBe(false)
    expect(lead.errors).toContain('Invalid years at company')
  })

  it('should read LinkedIn profile URLs and flag anything else', () => {
    const csv = 'firstName,lastName,email,linkedin\nAda,Lovelace,ada@example.com,linkedin.com/in/ada\nBob,Ray,bob@example.com,https://www.linkedin.com/company/enginy'
    const [ada, bob] = parse(csv)
    expect(ada.linkedinUrl).toBe('linkedin.com/in/ada')
    expect(ada.isValid).toBe(true)
    expect(bob.errors).toContain('Invalid LinkedIn URL')
  })

  it('should ignore columns that are not lead fields', () => {
    const [lead] = parse('firstName,lastName,email,favouriteColour\nAda,Lovelace,ada@example.com,blue')
    expect(lead.isValid).toBe(true)
    expect(lead).not.toHaveProperty('favouriteColour')
  })

  it('should handle missing required fields and mark as invalid', () => {
    const csv = `firstName,lastName,email
,Smith,john@example.com
John,,john@example.com
John,Smith,`

    const result = parse(csv)

    expect(result).toHaveLength(3)

    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toContain('First name is required')

    expect(result[1].isValid).toBe(false)
    expect(result[1].errors).toContain('Last name is required')

    expect(result[2].isValid).toBe(false)
    expect(result[2].errors).toContain('Email is required')
  })

  it('should validate email format', () => {
    const csv = `firstName,lastName,email
John,Doe,invalid-email
Jane,Smith,jane@example.com`

    const result = parse(csv)

    expect(result).toHaveLength(2)
    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toContain('Invalid email format')
    expect(result[1].isValid).toBe(true)
  })

  it('should handle CSV with quoted values', () => {
    const csv = `firstName,lastName,email,jobTitle
"John","Doe","john.doe@example.com","Software Engineer"`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john.doe@example.com')
    expect(result[0].jobTitle).toBe('Software Engineer')
  })

  it('should skip empty rows', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,,
Jane,Smith,jane@example.com`

    const result = parse(csv)

    expect(result).toHaveLength(2)
    expect(result[0].firstName).toBe('John')
    expect(result[1].firstName).toBe('Jane')
  })

  it('should handle case-insensitive headers', () => {
    const csv = `FIRSTNAME,LASTNAME,EMAIL,JOBTITLE,COUNTRYCODE,COMPANYNAME
John,Doe,john@example.com,Developer,US,Tech Corp`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].jobTitle).toBe('Developer')
  })

  it('should handle missing optional fields', () => {
    const csv = `firstName,lastName,email,jobTitle,countryCode
John,Doe,john@example.com,,`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].jobTitle).toBeUndefined()
    expect(result[0].countryCode).toBeUndefined()
    expect(result[0].isValid).toBe(true)
  })

  it('should preserve row index correctly', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
Jane,Smith,jane@example.com
Bob,Johnson,bob@example.com`

    const result = parse(csv)

    expect(result).toHaveLength(3)
    expect(result[0].rowIndex).toBe(2)
    expect(result[1].rowIndex).toBe(3)
    expect(result[2].rowIndex).toBe(4)
  })

  it('should handle multiple validation errors per lead', () => {
    const csv = `firstName,lastName,email
 , ,invalid-email`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].isValid).toBe(false)
    expect(result[0].errors).toHaveLength(3)
    expect(result[0].errors).toContain('First name is required')
    expect(result[0].errors).toContain('Last name is required')
    expect(result[0].errors).toContain('Invalid email format')
  })

  it('should handle extra columns not in header mapping', () => {
    const csv = `firstName,lastName,email,unknownColumn
John,Doe,john@example.com,someValue`

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].isValid).toBe(true)
  })

  it('should handle mixed valid and invalid leads', () => {
    const csv = `firstName,lastName,email
John,Doe,john@example.com
,Smith,invalid-email
Jane,Johnson,jane@example.com`

    const result = parse(csv)

    expect(result).toHaveLength(3)
    expect(result[0].isValid).toBe(true)
    expect(result[1].isValid).toBe(false)
    expect(result[1].errors).toContain('First name is required')
    expect(result[1].errors).toContain('Invalid email format')
    expect(result[2].isValid).toBe(true)
  })

  it('should handle whitespace in fields', () => {
    const csv = `firstName,lastName,email
 John , Doe , john@example.com `

    const result = parse(csv)

    expect(result).toHaveLength(1)
    expect(result[0].firstName).toBe('John')
    expect(result[0].lastName).toBe('Doe')
    expect(result[0].email).toBe('john@example.com')
    expect(result[0].isValid).toBe(true)
  })

  it('should reject invalid country codes', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,XXX
Jane,Doe,jane@example.com,12
Jim,Doe,jim@example.com,XX`

    const result = parse(csv)

    expect(result.map((lead) => lead.isValid)).toEqual([false, false, false])
    result.forEach((lead) => expect(lead.errors).toEqual(['Invalid country code']))
  })

  it('should map UK to GB', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,uk`

    const result = parse(csv)

    expect(result[0].countryCode).toBe('GB')
    expect(result[0].isValid).toBe(true)
  })

  it('should normalize country codes to uppercase', () => {
    const csv = `firstName,lastName,email,countryCode
John,Doe,john@example.com,us`

    const result = parse(csv)

    expect(result[0].countryCode).toBe('US')
    expect(result[0].isValid).toBe(true)
  })
})
