# IOX — Third-Party Application Onboarding

> Closes **C3-SC5 Integration readiness for applications**. Step-by-step for
> a hypothetical third-party app (think: ERP, BIM viewer, CRM) to integrate
> with IOX.

## Integration patterns supported today

| Pattern | When to use | Endpoint(s) |
|---|---|---|
| **Read project data** (pull) | 3rd party syncs IOX projects nightly | `/procurex/api/projects/{id}/snapshot`, `/procurex/api/projects/{id}/full` |
| **Push document** (file upload) | External pipeline emits a tender PDF for IOX to extract | `/procurex/api/documents/upload` (Blob) or `/procurex/api/documents/upload-local` |
| **Subscribe to live progress** | 3rd-party dashboard shows extraction status | `/procurex/api/extraction/stream-project/{id}` (SSE) |
| **Read auth session** | Single-sign-on shared with another web app | `/api/auth/session` (cookie required) |

## Onboarding checklist

### 1. Get a user account

Each 3rd-party integration is a **named user** in `px_user`. Request via the
Tech Lead (see `docs/governance/raci.md`). Receive:

- Email + temporary password
- Sign-in URL: `http://20.203.125.83/procurex/sign-in`

> Future: OAuth + per-app service-account tokens. Today: human-style credentials per integration.

### 2. Sign in + capture the session cookie

```bash
# 1) Get a CSRF token
csrf=$(curl -s -c jar.txt http://20.203.125.83/api/auth/csrf | jq -r .csrfToken)

# 2) POST credentials (saves authjs.session-token to jar.txt)
curl -s -b jar.txt -c jar.txt -X POST \
  -d "email=svc-integration@example.com&password=<your-pw>&csrfToken=$csrf&callbackUrl=/procurex" \
  http://20.203.125.83/api/auth/callback/credentials

# 3) Verify
curl -s -b jar.txt http://20.203.125.83/api/auth/session | jq
# → {"user":{...}, "expires":"..."}
```

The session cookie is valid until `expires` (default: 30 days). Refresh by
re-running step 2 before expiry.

### 3. Make authenticated requests

```bash
# Pull a project snapshot
curl -s -b jar.txt http://20.203.125.83/procurex/api/projects/<projectId>/snapshot

# Push a document (multipart upload)
curl -s -b jar.txt -X POST \
  -F "file=@./tender.pdf" -F "documentId=$(uuidgen)" \
  http://20.203.125.83/procurex/api/documents/upload-local
```

### 4. Subscribe to live extraction progress (SSE)

```bash
curl -s -N -b jar.txt http://20.203.125.83/procurex/api/extraction/stream-project/<projectId>
# event: progress
# data: {"jobId":"...","status":"running","iteration":3,"maxIterations":500,"lastAction":"Reading section 4.2"}
# ...
```

Server-Sent Events stream open until the page (or client) closes the
connection. Reconnect on disconnect; the server replays the latest state.

## What 3rd parties CANNOT do today

- **Modify CostX masterplans** (read-only API not yet exposed; server actions are browser-only)
- **Modify Configuration values** (admin UI only)
- **Bypass the workspace boundary** (every ProcureX entity is scoped to a workspace)
- **Mass-export data** (rate-limited at the application layer once C3-SC2 API gateway lands)

## Sample integration: BIM viewer pulls tender packages

A BIM viewer wants to display each project's tender documents alongside the
model. Recommended flow:

```
BIM viewer (server-side)
   │  nightly cron @ 02:00 UAE
   ▼
GET /procurex/api/projects/<id>/full       # full project snapshot
   │
   ├─ enumerate documents[]
   │     └─ for each doc:
   │            GET /procurex/api/files/<docId>   # raw bytes
   │            (no auth — UUID-only access)
   ▼
Mirror into BIM viewer's storage
```

Total: 1 + N calls per project per sync. Cache aggressively; the BIM viewer
shouldn't re-pull unchanged docs.

## Integration support

| Issue | Contact |
|---|---|
| New endpoint needed | File a Feature issue (`.github/ISSUE_TEMPLATE/feature.yml`) |
| Auth not working | Tech Lead — `docs/governance/support-model.md` |
| Rate limit / 429 | Currently no app-layer limit; future API gateway will publish quotas |
| Sample code / language client | None today — use raw HTTP. Happy to ship a TS client if needed |

## Acceptance demo

To show "at least one application service ready to integrate with a third
party application" per the KPI sign-off:

1. Create a `svc-integration@example.com` user with `VIEWER` role + access to one workspace
2. Run the cookie-jar script in §2 against the live VM
3. Show curl output from §3 returning project JSON
4. Capture the terminal session as the evidence artefact (`docs/integrations/acceptance-demo.txt`)
