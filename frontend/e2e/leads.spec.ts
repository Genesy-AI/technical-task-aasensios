import { expect, makeLead, test } from './fixtures'

const fifteenLeads = () =>
  Array.from({ length: 15 }, (_, index) =>
    makeLead(index + 1, `Lead${String(index + 1).padStart(2, '0')}`, 'Test')
  )

test.describe('leads table', () => {
  test('pages through leads without moving the pagination', async ({ page, api }) => {
    api.seed(fifteenLeads())
    await page.goto('/')

    const rows = page.locator('tbody tr')
    await expect(page.getByText('Page 1 of 2')).toBeVisible()
    await expect(rows).toHaveCount(10)
    const nextPage = page.getByRole('button', { name: 'Go to next page' })
    const footerTop = (await nextPage.boundingBox())!.y

    await nextPage.click()

    await expect(page.getByText('Page 2 of 2')).toBeVisible()
    await expect(page).toHaveURL(/page=2/)
    // 5 leads plus filler rows, so the short last page keeps the table height
    await expect(page.getByRole('checkbox', { name: /^Select Lead/ })).toHaveCount(5)
    await expect(rows).toHaveCount(10)
    expect((await nextPage.boundingBox())!.y).toBe(footerTop)
  })

  test('filters leads by name from the Filter menu', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace'), makeLead(2, 'Grace', 'Hopper'), makeLead(3, 'Alan', 'Turing')])
    await page.goto('/')
    await expect(page.getByText('ada.lovelace@example.com')).toBeVisible()

    await page.getByRole('button', { name: /^Filter/ }).click()
    await page.getByRole('button', { name: 'Add filter' }).click()
    await page.getByPlaceholder('Search names...').fill('grace')

    await expect(page).toHaveURL(/name=grace/)
    await expect(page.getByText('grace.hopper@example.com')).toBeVisible()
    await expect(page.getByText('ada.lovelace@example.com')).toBeHidden()
    await expect(page.getByText('alan.turing@example.com')).toBeHidden()
  })

  test('shows country names and email status pills', async ({ page, api }) => {
    api.seed([
      makeLead(1, 'Ada', 'Lovelace', { countryCode: 'GB', emailVerified: true }),
      makeLead(2, 'Grace', 'Hopper', { countryCode: 'US', emailVerified: false }),
      makeLead(3, 'Alan', 'Turing'),
    ])
    await page.goto('/')

    await expect(page.getByText('United Kingdom')).toBeVisible()
    await expect(page.getByText('United States')).toBeVisible()
    await expect(page.locator('[data-slot=badge]', { hasText: /^Verified$/ })).toBeVisible()
    await expect(page.locator('[data-slot=badge]', { hasText: /^Invalid$/ })).toBeVisible()
    await expect(page.locator('[data-slot=badge]', { hasText: /^Not verified$/ })).toBeVisible()
  })
})

test.describe('selection actions', () => {
  test('appear only while leads are selected', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace'), makeLead(2, 'Grace', 'Hopper')])
    await page.goto('/')

    const verifyEmail = page.getByRole('button', { name: 'Verify Email' })
    await expect(page.getByText('ada.lovelace@example.com')).toBeVisible()
    await expect(verifyEmail).toBeHidden()

    await page.getByRole('checkbox', { name: 'Select Ada Lovelace' }).click()
    await expect(page.getByText('1 selected', { exact: true })).toBeVisible()
    await expect(verifyEmail).toBeVisible()

    await page.getByRole('button', { name: 'Clear selection' }).click()
    await expect(verifyEmail).toBeHidden()
    await expect(page.getByRole('checkbox', { name: 'Select Ada Lovelace' })).not.toBeChecked()
  })

  test('verifies emails and reports invalid ones', async ({ page, api }) => {
    api.seed([
      makeLead(1, 'Ada', 'Lovelace'),
      makeLead(2, 'Grace', 'Hopper', { email: 'grace@invalid.test' }),
    ])
    await page.goto('/')

    await page.getByRole('checkbox', { name: 'Select all leads' }).click()
    await page.getByRole('button', { name: 'Verify Email' }).click()

    await expect(page.getByText('1 valid email')).toBeVisible()
    await expect(page.getByText('Invalid email for: Grace Hopper')).toBeVisible()
    await expect(page.locator('[data-slot=badge]', { hasText: /^Verified$/ })).toBeVisible()
    await expect(page.locator('[data-slot=badge]', { hasText: /^Invalid$/ })).toBeVisible()
  })

  test('finds phones for the selected leads', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace')])
    await page.goto('/')

    await page.getByRole('checkbox', { name: 'Select Ada Lovelace' }).click()
    await page.getByRole('button', { name: 'Find Phone' }).click()

    await expect(page.getByText('Searching phone for 1 lead')).toBeVisible()
    await expect(page.getByText('+34 600 000 000')).toBeVisible()
    await expect(page.getByText('via Orion Connect')).toBeVisible()
  })

  test('deletes the selected leads', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace'), makeLead(2, 'Grace', 'Hopper')])
    await page.goto('/')

    await page.getByRole('checkbox', { name: 'Select Grace Hopper' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()

    await expect(page.getByText('Successfully deleted 1 lead')).toBeVisible()
    await expect(page.getByText('grace.hopper@example.com')).toBeHidden()
    await expect(page.getByText('ada.lovelace@example.com')).toBeVisible()
    expect(api.leads.map((lead) => lead.id)).toEqual([1])
  })
})

test.describe('message generation', () => {
  test('builds a template with the field search and generates messages', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace', { companyName: 'Analytical Engines' })])
    await page.goto('/')

    await page.getByRole('checkbox', { name: 'Select Ada Lovelace' }).click()
    await page.getByRole('button', { name: 'Generate Messages' }).click()
    const dialog = page.getByText('Generate Messages for 1 Lead')
    await expect(dialog).toBeVisible()

    const template = page.getByRole('combobox', { name: 'Message Template' })
    await template.fill('Hi ')
    const fieldSearch = page.getByRole('combobox', { name: 'Search fields' })
    await fieldSearch.fill('first')
    await fieldSearch.press('Enter')
    await template.press('End')
    await template.pressSequentially(' from {companyName}')

    await expect(template).toHaveValue('Hi {firstName} from {companyName}')
    await expect(page.getByRole('region', { name: 'Preview' })).toContainText(
      'Hi Ada from Analytical Engines'
    )

    await page.getByRole('button', { name: 'Generate Messages', exact: true }).last().click()
    // A fully successful run closes the dialog and confirms with a toast
    await expect(page.getByText('Successfully generated message for 1 lead')).toBeVisible()
    await expect(dialog).toBeHidden()

    await expect(page.getByRole('cell', { name: 'Hi Ada from Analytical Engines' })).toBeVisible()
  })
})

test.describe('CSV import', () => {
  test('previews the file and imports the valid leads', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace')])
    await page.goto('/')

    await page.getByRole('button', { name: 'Import CSV' }).click()
    await page.locator('input[type=file]').setInputFiles({
      name: 'leads.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'firstName,lastName,email,countryCode\n' +
          'Grace,Hopper,grace.hopper@example.com,US\n' +
          'Alan,Turing,alan.turing@example.com,GB\n' +
          'Nobody,,,\n'
      ),
    })

    await expect(page.getByText('Import Summary')).toBeVisible()
    await page.getByRole('button', { name: 'Import 2 Valid Leads' }).click()

    await expect(page.getByText('grace.hopper@example.com')).toBeVisible()
    await expect(page.getByText('alan.turing@example.com')).toBeVisible()
    expect(api.leads).toHaveLength(3)
  })
})

test.describe('theme', () => {
  test('switches between light, dark and system, remembering the choice', async ({ page, api }) => {
    api.seed([makeLead(1, 'Ada', 'Lovelace')])
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    const html = page.locator('html')
    const system = page.getByRole('button', { name: 'System theme' })

    // Follows the OS until a theme is picked
    await expect(system).toHaveAttribute('aria-pressed', 'true')
    await expect(html).toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Light theme' }).click()
    await expect(html).not.toHaveClass(/dark/)
    await page.reload()
    await expect(html).not.toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Light theme' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Dark theme' }).click()
    await expect(html).toHaveClass(/dark/)

    await system.click()
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(html).not.toHaveClass(/dark/)
  })
})
