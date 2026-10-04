import { test as base, type Page, type Route } from '@playwright/test'
import { API_URL } from '../playwright.config'
import type { LeadsGetManyOutput } from '../src/api/types/leads/getMany'
import { leadFieldsFixture } from '../src/test/leadFields'

export type Lead = LeadsGetManyOutput[number]

export const makeLead = (
  id: number,
  firstName: string,
  lastName: string,
  overrides: Partial<Lead> = {}
): Lead => ({
  id,
  createdAt: `2026-01-${String((id % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
  updatedAt: '2026-01-01T10:00:00.000Z',
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
  ...overrides,
})

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

/**
 * In-memory stand-in for the Express backend, so the browser tests need no database or Temporal.
 * Mirrors the endpoints the frontend calls; emails ending in "@invalid.test" fail verification.
 */
export class FakeApi {
  leads: Lead[] = []
  private nextId = 1

  seed(leads: Lead[]) {
    this.leads = leads
    this.nextId = Math.max(0, ...leads.map((lead) => lead.id)) + 1
  }

  async install(page: Page) {
    await page.route(`${API_URL}/**`, (route) => this.handle(route))
  }

  private async handle(route: Route) {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const method = request.method()
    const body = request.postDataJSON?.() ?? undefined
    const fullName = (lead: Lead) => `${lead.firstName} ${lead.lastName}`

    if (method === 'GET' && pathname === '/leads') return json(route, this.leads)
    if (method === 'GET' && pathname === '/leads/fields') return json(route, leadFieldsFixture)

    if (method === 'DELETE' && pathname === '/leads') {
      const ids: number[] = body.ids
      const before = this.leads.length
      this.leads = this.leads.filter((lead) => !ids.includes(lead.id))
      return json(route, { deletedCount: before - this.leads.length })
    }

    if (method === 'POST' && pathname === '/leads/verify-emails') {
      const results = this.selected(body.leadIds).map((lead) => {
        lead.emailVerified = !lead.email?.endsWith('@invalid.test')
        return { leadId: lead.id, emailVerified: lead.emailVerified }
      })
      return json(route, { success: true, verifiedCount: results.length, results, errors: [] })
    }

    if (method === 'POST' && pathname === '/leads/enrich-phone') {
      const started: number[] = []
      const skipped: number[] = []
      for (const lead of this.selected(body.leadIds)) {
        if (lead.phone) {
          skipped.push(lead.id)
          continue
        }
        // Finishes straight away, so the next poll shows the result
        Object.assign(lead, {
          phone: '+34 600 000 000',
          phoneSource: 'orion',
          phoneEnrichmentStatus: 'found',
        })
        started.push(lead.id)
      }
      return json(route, { success: true, started, skipped, alreadyRunning: [], errors: [] })
    }

    if (method === 'POST' && pathname === '/leads/generate-messages') {
      const leads = this.selected(body.leadIds)
      for (const lead of leads) {
        lead.message = body.template.replace(/\{(\w+)\}/g, (_: string, key: keyof Lead) =>
          String(lead[key] ?? '')
        )
      }
      return json(route, { success: true, generatedCount: leads.length, errors: [] })
    }

    if (method === 'POST' && pathname === '/leads/bulk') {
      for (const input of body.leads) {
        this.leads.push(
          makeLead(this.nextId++, input.firstName, input.lastName, {
            ...input,
            createdAt: new Date().toISOString(),
          })
        )
      }
      return json(route, {
        success: true,
        importedCount: body.leads.length,
        duplicatesSkipped: 0,
        invalidLeads: 0,
        errors: [],
        droppedCountryCodes: [],
        droppedValues: [],
      })
    }

    return json(
      route,
      { error: `FakeApi: no handler for ${method} ${pathname} (${this.leads.map(fullName).length} leads)` },
      404
    )
  }

  private selected(ids: number[]) {
    return this.leads.filter((lead) => ids.includes(lead.id))
  }
}

export const test = base.extend<{ api: FakeApi }>({
  api: async ({ page }, use) => {
    const api = new FakeApi()
    await api.install(page)
    await use(api)
  },
})

export { expect } from '@playwright/test'
