# Improvements

## In this repo - TinyEnginy app

- [x] [security] pin exact deps (no carets) - dependabot already scans
- [x] [security] remove axios - fetch web native api should be enough today
- [x] [product] replace favicon and page title
- [x] [product] fix icon alignment of Enrich > "Verify email" option
- [x] [product] move "Generate Messages" out of the Enrich menu - it writes outreach copy from a template in a modal, unlike the fire-and-forget data lookups in Enrich
- [x] [product] rebuild the leads table with [tablecn](https://www.tablecn.com/) - sortable columns, filters, column visibility and pagination, all synced to the URL
- [x] [product] keep the table height stable across pages - fixed row height, short last page padded so the pagination stays put
- [x] [product] fade the table's left/right edges while it can scroll horizontally
- [x] [product] floating action bar for selected leads (tablecn pattern) - Verify Email, Find Phone, Guess Gender, Generate Messages and Delete only show while rows are selected
- [x] [product] clear the selection when filters change, so bulk actions never hit hidden leads
- [x] [product] icons on the email status pills, and "Not verified" as a pill too
- [x] [product] fixed-height Generate Messages modal - preview, warnings and results no longer resize it
- [x] [product] narrower CSV import modal
- [x] [product] type straight into an "Insert field" search box instead of opening a menu first
- [x] [product] consistent button sizes - every button uses the shared shadcn Button at 32px
- [x] [product] Import CSV next to the table's View button, Leads heading above the card
- [x] [product] tablecn advanced Sort and Filter menus - column/operator/value filter rows joined with and/or, both with a count badge
- [x] [product] default to 10 rows per page
- [x] [product] dark mode - follows the OS until toggled from the header, remembered across visits, applied before first paint
- [x] [product] move email status from inline emoji to dedicated column
- [x] [product] replace country codes with proper names
- [x] [product] improve layout adaptability - table shuold be wider when zooming out
- [ ] [product] run lighthouse - improve the most impactful core web vitals
- [ ] [product] push enrichment progress via SSE/websocket instead of polling the leads table
- [ ] [product] normalize phone numbers to E.164 (providers return bare numbers; needs a reliable country source)
- [ ] [product] add a companyWebsite field so Orion works for free-mail leads
- [ ] [product] provider rate limits - per-provider task queues + worker `maxTaskQueueActivitiesPerSecond` once providers publish limits
- [ ] [product] optimize performance
- [ ] [product] improve observability
- [ ] [product] prevent losing the draft message when clicking away by mistake
- [ ] [product] prevent double scrollbars in modals, like the generate messages one
- [ ] [chore] bump prisma - error in @backend/prisma/schema.prisma
- [ ] [chore] bump pnpm
- [ ] [chore] bump nodejs
- [ ] [chore] bump typescript - tsgo is much more faster than tsc
- [x] [chore] bump react - React 19, required by TanStack Table v9
- [x] [refactor] move enginy_brand_filled.svg inside frontend
- [ ] [refactor] share common typescript types between backend and frontend - root pnpm workspace with a shared package (lead types, lead field registry) instead of serving the registry over `GET /leads/fields`
- [x] [dx] display black/white logo in readme depending on github light/dark mode
- [ ] [dx] migrate to vite+
- [ ] [dx] fix frontend lint - ESLint 9 ignores the legacy `.eslintrc.cjs`, so `pnpm lint` fails; migrate to flat config (`eslint.config.js`) and drop the removed `--ext` flag

## Outside this repo - the real world ™

### Marketing site built with Framer (enginy.ai)

- [ ] [perf] prevent infinite dom updates in footer ascii logo
- [ ] [demo] fix duplicated "Referral" in "Tagged Conversations" section in Analytics tab
- [ ] [demo] replace bar chart with funnel chart in "Outbound" section in Analytics tab
- [ ] [cwv] run lighthouse - improve the most impactful Core Web Vitals (CWV)
- [ ] [nitpick] fix the repeated `data-framer-name` html attribute of the third logo - now it's `hubspot-crm` but it should be `microsoft-dynamics-crm` in Integrations section

### Job post

- [ ] fix "We're looking for a Tech Lead" to "We're looking for a Senior Product Engineer" in the [job post](https://job-boards.eu.greenhouse.io/enginy/jobs/4996480101)
