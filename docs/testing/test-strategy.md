# IOX — Test Strategy

> Closes **C2-SC3 Data access and retrieval** + **C3-SC3 System-to-system
> connectivity** evidence requirements.

## Layers

| Layer | Tooling | Where | What it covers |
|---|---|---|---|
| **Unit** | Vitest | `web/tests/unit/*.test.ts` | Pure functions: formatters, calculations, dropdown options, shared helpers |
| **Integration** | Vitest + `fetch` against a running server | `web/tests/integration/*.test.ts` | HTTP routes return expected status, auth gate behaves, API endpoints respond |
| **Manual smoke** | curl + browser | ad-hoc | Per-deploy verification of the live VM |

## Why split unit vs integration

Unit tests run in milliseconds with no external services — CI runs them on every push, every PR. Integration tests require a live Next.js process and a populated database, so they're opt-in via `INTEGRATION=1` env and run nightly (or before a release).

## How to run

```bash
# Unit (fast, default)
cd web
npx vitest                              # watch mode
npx vitest run                          # single pass, exits cleanly

# Integration (needs running server)
npm run dev &                           # start the app
INTEGRATION=1 npx vitest run            # hits localhost:3000

# Integration against the live VM
INTEGRATION=1 TEST_BASE_URL=http://20.203.125.83 npx vitest run
```

## What's covered today

| Suite | Tests |
|---|---|
| `unit/formatters` | formatNumber (integers, zero, null), formatDate (ISO, fallback) |
| `unit/calculations` | round (default + dp), masterplan derived totals (smoke) |
| `integration/routes` | 8 public routes return 200, /procurex auth-gates correctly, CSRF endpoint exists |

## What's planned (next test sprint)

- [ ] `unit/dropdownOptions` — getDropdownOptions filters + sort order
- [ ] `unit/seedHelpers` — seed-procurex idempotency check
- [ ] `integration/extraction-pipeline` — upload doc → check job enqueued, status transitions, verdict shape (mocked Anthropic)
- [ ] `integration/auth-flow` — full credentials sign-in → cookie → protected GET → session shape
- [ ] `integration/masterplan-crud` — create masterplan via action → read → update → delete

## CI integration

`/.github/workflows/test.yml` runs the unit suite on every push to `main` and
every PR. JUnit XML uploaded as a workflow artefact. Integration suite stays
manual/nightly until the test database setup is automated.

## Coverage targets

| Layer | Today | Sprint target | Long-term |
|---|---|---|---|
| Unit (line) | ~5% | 30% | 70% |
| Integration (route coverage) | 9 routes | 18 routes | every public route |
| E2E (browser) | 0 | (defer) | Playwright happy-path per module |

## How tests support the KPI sign-off

- **C2-SC3** asks for "test queries to return expected results". The integration suite executes real queries through the live HTTP surface and asserts outcomes — each `INTEGRATION=1` run is a fresh execution report. JUnit XML uploads as the artefact.
- **C3-SC3** asks for "100% pass rate on defined integration tests". The integration suite is the defined set; pass rate is whatever the latest CI run reports.
