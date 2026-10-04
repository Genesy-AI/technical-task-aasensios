# Tasks

- [x] PR Review: Review an open pull request from a teammate.
- [x] Bug fix: Email verification hangs indefinitely with no feedback.
- [x] Bug fix: CSV import displays invalid country codes.
- [ ] Feature: Phone number field + enrich phone workflow using Temporal.
  - Phone number field (DB, CSV import, leads table, message composition), stored as received.
  - Enrichment status/source tracking; decide skip vs overwrite when a phone was already imported.
  - Temporal workflow: Orion → Astra → Nimbus, stop early, per-activity timeout + retries, idempotent per lead.
  - Provider abstraction layer (different inputs/outputs); handle Orion's missing `companyWebsite`.
  - Frontend progress feedback.
- [ ] Feature: Remaining lead fields (years in role, LinkedIn) + scalable message composition.
  - `yearsInRole` (CSV header; README says "years at company") and `linkedinUrl` with URL validation.
  - Single field registry instead of the hardcoded field lists; migrate phone onto it.
  - Message composition UX that scales as fields grow.
- [ ] Analysis: Propose codebase improvements and a technical roadmap.
