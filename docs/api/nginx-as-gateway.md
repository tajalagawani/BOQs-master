# IOX — nginx as the API Gateway

> Closes **C3-SC2 API gateway implementation** via explicit acceptance of
> nginx as the gateway, with the security + routing features it already
> provides.

## Decision

We **accept nginx as the IOX API gateway** for the current phase. Full Azure
API Management (APIM) is reserved for future scale (multi-tenant, multi-region,
external customer-facing APIs). For an internal demo + first-live-service
deployment, nginx provides the gateway features the framework KPI calls for.

## What "gateway" means and how nginx provides it

| Gateway capability | Required by KPI? | nginx solution today |
|---|---|---|
| **Reverse proxy / routing** | Yes | `proxy_pass http://127.0.0.1:3000` — every request to ports 80/443 lands at the single Next.js process |
| **TLS termination** | Yes (in transit) | `listen 443 ssl http2` — config in `infra/nginx/iox-https.conf`. Activate once a domain is assigned (see `docs/operations/https-setup.md`) |
| **Request size limits** | Implicit (DOS protection) | `client_max_body_size 1024M` — needed for tender PDFs; 1 GB hard cap |
| **Timeouts** | Yes | `proxy_read_timeout 900s` — allows long-running AI extraction responses |
| **Forwarded headers** | Yes (correct client IP) | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` set on every proxied request |
| **Security headers** | Recommended | HTTPS template adds HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **WebSocket upgrade** | Yes (SSE / future websocket) | `Upgrade $http_upgrade` / `Connection 'upgrade'` |
| **Auth** | Yes | Delegated to NextAuth (the application layer). nginx doesn't terminate auth — appropriate for our model since the session cookie has to round-trip to Next.js anyway. |

## Capabilities nginx doesn't natively provide (gaps + mitigation)

| Capability | Nginx OSS gap | Mitigation today |
|---|---|---|
| **Rate limiting per consumer / API key** | Available via `limit_req_zone` (per-IP) but not per-key | Add per-IP limit (below) — sufficient for current scale. APIM if we expose APIs to external paying customers. |
| **Quotas + throttling tiers** | Not built-in | Defer until externally-monetised APIs exist. |
| **Request/response transformation** | Limited (lua-nginx-module not in default Ubuntu nginx) | We don't need it; client speaks JSON, server speaks JSON. |
| **Centralised analytics dashboard** | Access log only | Pair with Azure Monitor + Log Analytics for log-based metrics. |
| **OpenAPI-driven validation** | None | The Zod schemas at the route handler boundary do this. |

## Rate-limit add-on (planned, ~1 hr)

Add to `infra/nginx/iox-https.conf` (or `iox` HTTP config) when ready:

```nginx
# At http {} level (in main nginx.conf)
limit_req_zone $binary_remote_addr zone=iox_per_ip:10m rate=30r/s;

# Inside server {} → location / {}
limit_req zone=iox_per_ip burst=60 nodelay;
limit_req_status 429;
```

30 req/s sustained / 60 burst — high enough for normal browsing, low enough
that a single hostile IP can't exhaust the upstream.

## What's already implemented (live on `iox-vm-01`)

Active nginx config at `/etc/nginx/sites-enabled/iox`:

```nginx
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name _;
  client_max_body_size 1024M;
  proxy_read_timeout 900s;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## When we'd switch to Azure API Management

Triggers that would push us off nginx:

- We need to publish APIs to external paying tenants with per-key billing
- We need centralised developer-portal docs (auto-rendered from OpenAPI)
- Per-route quotas / rate-limit tiers become a business requirement
- We need request/response transformation layers (rare)

Until those land, **nginx is the gateway** and this document is the formal
acceptance.

## Verification (assessor evidence)

```bash
# Live gateway responds + sets correct headers
curl -sI http://20.203.125.83/                   # → HTTP/1.1 200, Server: nginx
curl -sI http://20.203.125.83/procurex/sign-in   # → HTTP/1.1 200

# Body size limit honoured
dd if=/dev/zero of=/tmp/big.bin bs=1M count=1200 2>/dev/null
curl -s -o /dev/null -w "%{http_code}\n" -X POST --data-binary @/tmp/big.bin http://20.203.125.83/  # → 413 (request entity too large) once over 1024M
```
