# Phone field + phone enrichment — design

## Goal

Leads get a `phone` field (set via CSV import, shown in the table, usable in messages) and an "Enrich phone" action that finds missing phones via a Temporal workflow querying Orion Connect → Astra Dialer → Nimbus Lookup, with visible progress.

## Decisions

- Leads that already have a phone are **skipped** by enrichment; user data is never overwritten.
- Orion's `companyWebsite` is **derived from the email domain**; Orion is skipped for free-mail domains (gmail, hotmail, yahoo, outlook, icloud…).
- Enrichment is **async**: the endpoint starts workflows and returns; the frontend polls. Push (SSE/websocket) is in IMPROVEMENTS.md.
- Phones are **stored as received** (trimmed). Providers return bare 10-digit numbers and only Nimbus returns a country (always `ES`), so E.164 would be a guess. Normalization is in IMPROVEMENTS.md.

## Observed provider behaviour (differs from README)

| Provider | Latency | Notes |
|---|---|---|
| Orion | ~4.2s | 400 if `companyWebsite` missing/empty; 401 on bad key |
| Astra | ~1.3s | `phoneNmbr` may be `null` |
| Nimbus | ~2.2s | Responds with `phoneNmbr: number` (not `number`); 400 without `jobTitle`; frequent 500s |

## Data model

One migration adding to `lead`:

- `phone String?`
- `phoneSource String?` — `csv` \| `orion` \| `astra` \| `nimbus`
- `phoneEnrichmentStatus String?` — `pending` \| `running` \| `found` \| `not_found` \| `failed`

Strings with TS union types (no Prisma enum on SQLite).

## Backend

**Provider layer** — `src/providers/`: one adapter per provider implementing

```ts
interface PhoneProvider {
  name: 'orion' | 'astra' | 'nimbus'
  canHandle(lead: EnrichableLead): boolean
  buildRequest(lead: EnrichableLead): { url: string; headers: Record<string, string>; body: unknown }
  parse(json: unknown): string | null   // reads phone | phoneNmbr | number, String()s it, empty → null
}
```

A shared `callProvider` does the `fetch`: 2xx → `parse`; 400/401/403 → `ApplicationFailure.nonRetryable`; 5xx/network → throw (retryable).

**Activities** — `findPhoneWithOrion`, `findPhoneWithAstra`, `findPhoneWithNimbus` (each `callProvider` for its adapter), plus `loadLeadForEnrichment(leadId)` and `savePhoneEnrichment(leadId, result)` writing via Prisma (worker runs in the API process).

**Workflow** — `enrichPhoneWorkflow(leadId)`:

1. Load lead; set status `running`.
2. For Orion, Astra, Nimbus in order: skip if `!canHandle`; otherwise call the activity. Stop at the first non-null phone.
3. Save `found` (+ phone, source) or `not_found`.
4. If a provider activity ultimately fails, continue to the next provider; if every attempted provider failed (none returned null cleanly), save `failed`.

Activity options: Orion `startToCloseTimeout: 10s`, Astra/Nimbus `5s`; retry `maximumAttempts: 3`, `initialInterval: 1s`, `backoffCoefficient: 2`.

**Idempotency** — `workflowId: enrich-phone-${leadId}`, started with `client.workflow.start`; `WorkflowExecutionAlreadyStartedError` → counted as already running. Completed workflows can be re-run (default reuse policy), so `not_found`/`failed` leads can be retried.

**Endpoint** — `POST /leads/enrich-phone { leadIds }`: skip leads with a phone, set the rest to `pending`, start workflows, respond `{ started, skipped, alreadyRunning }`.

**CSV import** — `/leads/bulk` accepts `phone`, stores it trimmed with `phoneSource: 'csv'`.

**Rate limits (not implemented)** — worker `maxActivitiesPerSecond` / `maxTaskQueueActivitiesPerSecond`; per-provider task queues allow per-provider limits.

## Frontend

- `csvParser.ts`: map `phoneNumber` (and `phone`) header to `phone`; types in `bulkImport.ts`, `getMany.ts`.
- `LeadsList.tsx`: "Phone" column — number + source label, or status (`⏳` pending/running, "No data found", "Failed").
- "Enrich phone" action alongside "Verify Email" for selected leads; toast summarizing `{ started, skipped, alreadyRunning }`.
- Leads query `refetchInterval: 2000` while any lead is `pending`/`running`.
- `MessageTemplateModal.tsx`: add `phone` to `availableFields`; `messageGenerator.ts` supports it.

## Testing

- Adapters: `canHandle` (free-mail, missing jobTitle), `buildRequest` (auth placement), `parse` (`phone`, `phoneNmbr` number, null/undefined).
- `callProvider`: status-code → retryable/non-retryable classification (mocked `fetch`).
- Workflow (`TestWorkflowEnvironment`, mocked activities): order, early stop, skipped providers, `not_found`, `failed`, bounded retries, non-retryable 400 not retried.
- CSV parser maps `phoneNumber`; LeadsList renders phone states.

## Out of scope

E.164 normalization, `companyWebsite` field, push updates, rate-limit implementation, years-in-role/LinkedIn (next task).
