# IOX — Integration Architecture

> Closes **C3-SC1 API and integration design**. Companion narrative to
> `openapi.yaml` — explains the *why* and *how* of each integration surface.

## Surfaces

IOX exposes three kinds of integration points:

| Surface | Mechanism | Audience |
|---|---|---|
| **HTTP API** | Next.js route handlers (`app/**/route.ts`) | External clients, the worker, Cron |
| **Server Actions** | Next.js RPC-style (`modules/*/actions.ts`) | The IOX browser client only |
| **Background worker** | pm2-managed `tsx scripts/dev-worker.ts` + queue table `px_extraction_job` | Internal |

See `openapi.yaml` for the formal HTTP API definition.

## Request flow — authenticated procurex page

```
Browser
   │  GET /procurex/projects/<id>/setup
   ▼
nginx :80 ──proxy_pass──► Next.js :3000
                              │
                              │ requireUserId()
                              ▼
                         NextAuth auth()
                              │
                              │ ✓ valid session cookie
                              ▼
                         Server-component renders
                              │
                              │ Drizzle queries via @/modules/core/db
                              ▼
                         Postgres iox database
                              │
                              ▼
                         HTML response back to browser
```

If the session cookie is missing/expired, `requireUserId()` throws
`UNAUTHENTICATED`; the layout's error boundary redirects to
`/procurex/sign-in`.

## Request flow — extraction pipeline (FoT upload)

```
Browser uploads PDF
   │  POST /procurex/api/documents/upload-local
   ▼
upload-local route
   ├─ writes bytes → /home/iox/app/web/uploads/<workspace>/<doc>-<file>.pdf
   ├─ sets documents.blob_url = http://<host>/procurex/api/files/<doc>
   └─ enqueueExtraction() → INSERT INTO px_extraction_job (status=queued)
                                │
                                ▼
        ┌───────────────────────────────────────────┐
        │  Worker drain (every 5s via dev-worker;  │
        │  every 1 min via Vercel Cron in prod)    │
        │  GET /procurex/api/worker/extraction      │
        └───────────────────────────────────────────┘
                                │
                                │ claim job, status → running
                                ▼
              modules/ai-extraction/queue/worker.ts
                                │
                                │ fetch file bytes (HTTP back to /api/files)
                                ▼
              modules/ai-extraction/agent/runner.ts
                                │
                                │ Anthropic SDK (HTTPS to api.anthropic.com)
                                │   ├─ single-shot path (Sonnet 4.6) ≤ 700k chars
                                │   └─ chunked path (Haiku 4.5) >700k chars
                                ▼
                         submit_verdict tool call
                                │
                                │ persist verdict → px_workflow_run.output
                                ▼
                         UPDATE px_extraction_job (status=succeeded)
                                │
                                ▼
              SSE stream notifies the browser
              (/procurex/api/extraction/stream/<doc>)
```

## Authentication model

- **HTTP API (browser-originated)**: NextAuth session cookie. Set by
  POST to `/api/auth/callback/credentials`.
- **HTTP API (worker / cron)**: Optional shared secret in `CRON_SECRET` env
  var. If set, `/procurex/api/worker/extraction` requires
  `Authorization: Bearer <secret>`.
- **File serving (`/procurex/api/files/<id>`)**: Public — the document ID
  is a UUID and considered unguessable. Acceptable for the demo VM behind a
  known IP; for public production should sit behind a signed-URL gateway.

## Outbound integrations

| Counterparty | Direction | Protocol | Credentials | Code |
|---|---|---|---|---|
| **Anthropic** | Outbound only (request/response) | HTTPS to `api.anthropic.com` | `ANTHROPIC_API_KEY` (env) | `modules/ai-extraction/agent/runner.ts`, `modules/ai-extraction/agent/chunked.ts` |
| **Vercel Blob** | Outbound (put/get/delete) | HTTPS | `BLOB_READ_WRITE_TOKEN` (env, optional) | `app/procurex/api/documents/upload/route.ts` |
| **GitHub Actions** | Inbound (SSH from runner) | SSH (ED25519) | `AZURE_VM_SSH_KEY` (GH secret) | `.github/workflows/deploy.yml` |

No webhook intake today. If we add 3rd-party webhooks (tenderer portal
callback, BIM model push, etc.), follow the pattern in
`docs/integrations/third-party-onboarding.md`.

## Idempotency & retries

| Layer | Idempotency | Retry policy |
|---|---|---|
| File upload | Caller supplies `documentId` (UUID) — re-uploading the same id replaces bytes | None (caller retries on failure) |
| Extraction job | Each enqueue is a new row; the worker uses `FOR UPDATE SKIP LOCKED` to avoid double-claim | `max_attempts` field on `px_extraction_job`; default 1 with manual re-queue on stuck jobs |
| Drizzle migration apply | Tracked in `_iox_drizzle_applied` — re-applied migrations are no-ops | n/a |

## Future integration capability

The architecture is ready for these once products demand them:

- **OAuth providers** — NextAuth providers array currently has only
  `Credentials`. Adding Google / Microsoft is a config change.
- **Webhook intake** — Pattern: new route `/api/webhooks/<vendor>/<event>`,
  signature verification per vendor, write to `px_audit_log` + dispatch
  side effects asynchronously.
- **gRPC / GraphQL** — Not planned. REST + server actions cover today.
