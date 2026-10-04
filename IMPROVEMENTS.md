# Improvements

## In this repo - TinyEnginy app

- [ ] [security] pin exact deps (no carets) - dependabot already scans
- [ ] [security] remove axios - fetch web native api should be enough today
- [x] [product] replace favicon and page title
- [x] [product] fix icon alignment of Enrich > "Verify email" option
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
- [ ] [chore] bump react
- [x] [refactor] move enginy_brand_filled.svg inside frontend
- [ ] [refactor] share common typescript types between backend and frontend - root pnpm workspace with a shared package (lead types, lead field registry) instead of serving the registry over `GET /leads/fields`
- [ ] [dx] display black/white logo in readme depending on github light/dark mode
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
