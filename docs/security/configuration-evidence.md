# IOX — Security Configuration Evidence

> Closes the evidence requirement of **C1-SC3** (and supports C1-SC4). Captures
> the security-relevant config as observed on the live VM `iox-vm-01`. Refresh
> after any infra change.

**Captured:** 2026-05-31 · **VM:** iox-vm-01 (UAE North, 20.203.125.83)

## 1. Network — Azure NSG rules (`iox-vm-01NSG`)

| Rule | Priority | Direction | Source | Destination | Port | Protocol | Action |
|---|---|---|---|---|---|---|---|
| `default-allow-ssh` | 1000 | Inbound | `*` (was `80.203.124.44`, opened for GH Actions) | * | 22 | TCP | Allow |
| `allow-http` | 1001 | Inbound | `*` | * | 80 | TCP | Allow |
| `allow-https` | 1002 | Inbound | `*` | * | 443 | TCP | Allow |
| `(default-deny)` | 65500 | Inbound | * | * | * | * | Deny |

**SSH lockdown trade-off**: opened from `80.203.124.44` only → `*` to let GH Actions runners SSH in. SSH is **key-only** (PasswordAuthentication=no on Ubuntu by default), no root login, only `iox` user; brute-force risk = low. Future hardening: fail2ban or Azure Bastion.

**Ports not exposed**:
- `3000` (Next.js) — localhost only, behind nginx
- `5432` (Postgres) — localhost only
- All other ports — denied by the default-deny rule

## 2. Authentication

| Concern | Configuration |
|---|---|
| Auth provider | NextAuth v5 with `@auth/drizzle-adapter` |
| Strategy | JWT (no DB-backed sessions) |
| Trusted host | `AUTH_TRUST_HOST=true` (required because we serve on a bare IP) |
| Secret rotation | `AUTH_SECRET` in `.env`, 56 chars, randomly generated |
| Password hashing | bcryptjs, salt rounds = 10 |
| Session cookie | `authjs.session-token`, HttpOnly, SameSite=Lax |
| Auth handler path | `/api/auth/[...nextauth]` (root, not under /procurex) |
| Sign-in page | `/procurex/sign-in` |

## 3. Secrets management

Secrets live in three places:

| Location | Contents | Permissions |
|---|---|---|
| `web/.env` on VM | DATABASE_URL, AUTH_SECRET, ANTHROPIC_API_KEY, AI_*, AUTH_TRUST_HOST, AI_CLASSIFY_DISABLED | chmod 600, owner `iox` |
| `/tmp/iox-bootstrap.env` on VM | Same keys + HEROUI_AUTH_TOKEN (used for re-installs) | chmod 600, owner `iox` |
| GitHub Actions secrets | AZURE_VM_HOST, AZURE_VM_USER, AZURE_VM_SSH_KEY, HEROUI_AUTH_TOKEN | Encrypted at rest by GitHub; never echoed in logs |

**Not in source control**: `.env*` files are listed in `.gitignore`.

**Rotation cadence** (target): AUTH_SECRET annually; HEROUI_AUTH_TOKEN on license renewal; ANTHROPIC_API_KEY annually or on compromise.

## 4. Data protection

| State | Coverage |
|---|---|
| **At rest** — DB | Azure Premium SSD with platform-managed encryption (always-on). Postgres data files inherit. |
| **At rest** — local file uploads (`web/uploads/`) | Same disk-level encryption. No application-level encryption. |
| **In transit** — public traffic | HTTP only (port 80) today. **HTTPS via Let's Encrypt + certbot scheduled for M5.** |
| **In transit** — internal | Postgres on `localhost:5432` (no transport encryption needed). |
| **In transit** — Anthropic | HTTPS (provider-enforced). |
| **In transit** — GH Actions ↔ VM | SSH (ED25519 keypair, key-only auth). |

## 5. Filesystem permissions on the VM

| Path | Owner | Mode | Notes |
|---|---|---|---|
| `/home/iox/app/` | iox:iox | 755 | App root |
| `/home/iox/app/web/.env` | iox:iox | 600 | Secrets file |
| `/home/iox/app/web/uploads/` | iox:iox | 755 | User-uploaded tender PDFs |
| `/home/iox/.ssh/authorized_keys` | iox:iox | 600 | Single ED25519 public key |
| `/home/iox/.pm2/` | iox:iox | 755 | pm2 daemon state |
| `/etc/nginx/sites-enabled/iox` | root:root | 644 | nginx config |
| `/tmp/iox-bootstrap.env` | iox:iox | 600 | Bootstrap env (re-installs) |

## 6. Running services (pm2)

```
┌────┬───────────────┬─────────┬─────────┬───────────┐
│ id │ name          │ script  │ status  │ user      │
├────┼───────────────┼─────────┼─────────┼───────────┤
│ 0  │ iox-web       │ npm     │ online  │ iox       │
│ 1  │ iox-worker    │ tsx     │ online  │ iox       │
└────┴───────────────┴─────────┴─────────┴───────────┘
```

Both run as `iox` (non-root). `pm2 startup systemd` registers them with `systemd` so they restart on VM reboot.

## 7. Open items

- [ ] Enable HTTPS (M5): certbot + Let's Encrypt + nginx 443 + force-redirect from 80.
- [ ] Install `fail2ban` for SSH brute-force mitigation.
- [ ] Migrate VM secrets to Azure Key Vault + managed identity (Phase: post-M5).
- [ ] Annual rotation calendar for AUTH_SECRET / ANTHROPIC_API_KEY.
