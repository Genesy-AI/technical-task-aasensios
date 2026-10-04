# Improvements

## In this repo - TinyEnginy app

- [x] [security] pin exact deps (no carets) - dependabot already scans
- [x] [security] remove axios - fetch web native api should be enough today
- [x] [product] replace favicon and page title
- [x] [product] fix icon alignment of Enrich > "Verify email" option
- [x] [product] move "Generate Messages" out of the Enrich menu - it writes outreach copy from a template in a modal, unlike the fire-and-forget data lookups in Enrich
- [x] [product] rename "Enrich Phone" to "Find Phone"
- [x] [product] rebuild the leads table with [tablecn](https://www.tablecn.com/) - sortable columns, filters, column visibility and pagination, all synced to the URL
- [x] [product] keep the table height stable across pages - fixed row height, short last page padded so the pagination stays put
- [x] [product] fade the table's left/right edges while it can scroll horizontally
- [x] [product] pin the checkbox and Name columns when scrolling horizontally - the left fade starts after them
- [x] [product] selection actions replace the table toolbar while rows are selected - "N selected" with a clear button above the checkboxes, and Enrich, Generate messages and Delete at the end
- [x] [product] Enrich menu (lightning icon) groups Verify email, Find phone and Guess gender; Escape closes the menu without clearing the selection
- [x] [product] drop the redundant "N rows selected." from the table footer
- [x] [product] clear the selection when filters change, so bulk actions never hit hidden leads
- [x] [product] icons on the email status pills, and "Not verified" as a pill too
- [x] [product] fixed-height Generate Messages modal - preview, warnings and results no longer resize it
- [x] [product] narrower CSV import modal
- [x] [product] type straight into an "Insert field" search box instead of opening a menu first
- [x] [product] Insert field below the message template, listing the same fields as the `{` suggestions (no group headers), sized like the buttons
- [x] [product] consistent button sizes - every button uses the shared shadcn Button at 32px
- [x] [product] View next to Sort and Filter, Import CSV on the right, Leads heading above the card
- [x] [product] tablecn advanced Sort and Filter menus - column/operator/value filter rows joined with and/or, both with a count badge
- [x] [product] default to 10 rows per page
- [x] [product] select-all asks whether to select the current page or every lead, and its checkbox shows the right state
- [x] [product] light/dark/system theme buttons with tooltips; grid and eye icons for Import CSV and View
- [x] [product] muted icons in outline, ghost and secondary buttons
- [x] [product] tooltips on every icon-only button (pagination, close, remove and reorder sort/filter rows)
- [x] [product] Enginy green for primary buttons and the Enrich menu, and a toned-down green for Generate messages in the selection actions
- [x] [product] neutral focus rings instead of blue in the Generate messages modal
- [x] [product] sentence case for labels, headings and buttons
- [x] [product] flat table card - no shadow, even padding
- [x] [product] tabular figures app-wide - numbers line up and counters like "Page 1 of 3" keep their width when paging
- [x] [product] dark mode
- [x] [product] move email status from inline emoji to dedicated column
- [x] [product] replace country codes with proper names
- [x] [product] improve layout adaptability - table shuold be wider when zooming out
- [ ] [product] run lighthouse - improve the most impactful core web vitals
- [ ] [product] internationalization (i18n) - extract UI strings into translation files, and format dates, numbers and country names per locale with `Intl`
- [ ] [product] right-to-left (RTL) support - set `dir` from the locale, use logical CSS properties (`ms-*`/`ps-*`/`start`/`end`) everywhere, and mirror directional icons
- [ ] [product] push enrichment progress via SSE/websocket instead of polling the leads table
- [ ] [product] normalize phone numbers to E.164 (providers return bare numbers; needs a reliable country source)
- [ ] [product] add a companyWebsite field so Orion works for free-mail leads
- [ ] [product] provider rate limits - per-provider task queues + worker `maxTaskQueueActivitiesPerSecond` once providers publish limits
- [ ] [product] optimize performance
- [ ] [product] improve observability
- [x] [product] prevent losing the draft message when clicking away by mistake
- [x] [product] prevent double scrollbars in modals, like the generate messages one
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
