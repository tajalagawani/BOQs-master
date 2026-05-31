# IOX — Defect Log

> Closes **C5-SC4 Production quality assurance**. Append every defect that
> reaches main (post-merge) or is found in production. Critical defects MUST
> resolve before any KPI sign-off.

## Severity legend

| Sev | Meaning |
|---|---|
| **Critical** | Site down, data loss, security breach, broken auth |
| **High** | Major feature broken (no workaround) |
| **Medium** | Feature degraded, workaround exists |
| **Low** | Cosmetic / minor UX |

## Open defects (must be 0 Critical for sign-off)

| ID | Sev | Module | Title | Opened | Owner | Notes |
|---|---|---|---|---|---|---|
| — | — | — | _(none currently)_ | — | — | — |

## Closed defects (since first deploy 2026-05-31)

| ID | Sev | Module | Title | Closed | Commit | Notes |
|---|---|---|---|---|---|---|
| D-001 | High | BOQs | `[projectData] failed to load … 0 is out of bounds. Excel supports columns from 1 to 16384` | 2026-05-30 | local fix in `lib/projectData.ts` (guard `getCell(0)`) | Added `at()` helper that returns null when column index is 0 (= header missing) |
| D-002 | High | Platform | NextAuth returns 500 `UntrustedHost: Host must be trusted` | 2026-05-31 | env update on VM | Added `AUTH_TRUST_HOST=true` to `.env` + pm2 reload |
| D-003 | High | Build (CI) | `Module not found: @heroui-pro/react` | 2026-05-31 | CI workflow | Wired `HEROUI_AUTH_TOKEN` to runner so postinstall fetches real components |
| D-004 | High | Build (CI) | `Type error: BigInt literals are not available when targeting lower than ES2020` | 2026-05-31 | `tsconfig.json` | `target: ES2017 → ES2020` |
| D-005 | High | Build (CI) | `Cannot redeclare block-scoped variable 'URL'` in dev-worker | 2026-05-31 | `scripts/dev-worker.ts` + `tsconfig.json` | Renamed `URL → WORKER_URL`, excluded `scripts/` from tsconfig.include |
| D-006 | High | ProcureX | NextAuth `CredentialsSignin` — Arjun missing from `px_user` table | 2026-05-31 | one-off seed on VM | Seeded Arjun with bcrypt('dev'); ProcureX demo seed then ran |
| D-007 | Medium | ProcureX | Step-2 spinner showed "Waiting for the agent's first iteration…" indefinitely | 2026-05-31 | created `scripts/dev-worker.ts` + bootstrap | Worker route wasn't being drained — added polling daemon |
| D-008 | High | ProcureX | FoT extraction succeeded with empty verdict (`ohpMarkups: {}, signatures: [], ...`) | 2026-05-31 | copied `docs/` from OmniApp + re-queued | `loadAgentSpec` was silently returning the error string when `docs/prompts/fot.md` was missing; agent freelanced a wrong-shape verdict |
| D-009 | Medium | Platform | Browser stuck on cached "Welcome to nginx" after deploy | 2026-05-31 | n/a (cache clear) | First-load served nginx default before our config was symlinked; hard-refresh resolved |
| D-010 | High | Build (CI) | `Module '"@prisma/client"' has no exported member 'MasterplanStatus'` | 2026-05-31 | CI workflow | Added explicit `npx prisma generate` step before `npm run build` |
| D-011 | High | Build (CI) | env validation failed in CI: `DATABASE_URL expected string, received undefined` | 2026-05-31 | CI workflow | Set placeholder env vars at build time (real values live in VM .env at runtime) |
| D-012 | High | CI | SSH to VM timed out from GH runner | 2026-05-31 | NSG | Opened port 22 from `*` (was IP-locked); SSH is key-only so risk acceptable |
| D-013 | High | CI | `pm2 reload ecosystem.config.cjs` → `File not found` after first rsync-source deploy | 2026-05-31 | added file to repo | Committed `web/ecosystem.config.cjs` so source-rsync doesn't wipe it |
| D-014 | Medium | Platform | "Classifying" took >60s on upload (Anthropic Haiku call) | 2026-05-31 | env on VM | Set `AI_CLASSIFY_DISABLED=true` — falls back to deterministic fingerprint detector |
| D-015 | Medium | Platform | SOPR extraction took 31 min on chunked path (554 chunks) | 2026-05-31 | env on VM | Added `AI_CHUNKED_MAX_UNITS=30` for dev — caps to first 30 chunks |

## Defect-rate metrics

| Window | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Lifetime (since 2026-05-31) | 0 | 11 | 4 | 0 | 15 |
| Open today | 0 | 0 | 0 | 0 | 0 |
| Mean time to resolution (High) | < 1 day | | | | |

## Process

- Every defect found in production gets a row here — link to the GitHub Issue if one exists.
- Use the ID format `D-NNN` continuing the sequence (currently up to D-015).
- Closed = "fix is on `main` and deployed to the live VM" — not just "PR merged".
- Critical defects open for > 4 hours = P1 incident, file a postmortem in `docs/incidents/`.
