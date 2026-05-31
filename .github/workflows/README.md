# IOX CI/CD

`deploy.yml` redeploys the app to the Azure VM on every push to `main` (touching `web/**`).

## Pipeline

```
push to main
  └─→ GH runner: checkout → npm ci → npm run build
        └─→ ssh: git reset --hard on VM
        └─→ rsync .next/  (build artefact)
        └─→ ssh: npm ci on VM only if package-lock changed
        └─→ ssh: apply new Drizzle migrations (tracked, idempotent)
        └─→ ssh: pm2 reload
        └─→ smoke-test public IP
```

End-to-end deploy: **~2–3 min** (build on the GH runner is much faster than on
the D2s_v3 VM, and we never rebuild on the VM).

## Required GitHub secrets

Add at **Settings → Secrets and variables → Actions** in your repo:

| Secret | Value | How to get it |
|---|---|---|
| `AZURE_VM_HOST` | `20.203.125.83` | `az vm show -d -g iox-rg -n iox-vm-01 --query publicIps -o tsv` |
| `AZURE_VM_USER` | `iox` | (fixed — the admin user on the VM) |
| `AZURE_VM_SSH_KEY` | the **private** key | `cat ~/.ssh/iox_vm` and paste **including** the `-----BEGIN`/`-----END` lines |
| `HEROUI_AUTH_TOKEN` | `feab8712-…` | Your HeroUI Pro CI/CD token (from the HeroUI dashboard) |

To paste the SSH private key safely:
```
pbcopy < ~/.ssh/iox_vm
# Then in GitHub: New repository secret → name=AZURE_VM_SSH_KEY → paste from clipboard
```

## Trigger manually

In GitHub: **Actions tab → Deploy to Azure VM → Run workflow → main**. Useful
for re-deploying without a code change (e.g., after rotating env vars on the
VM).

## What's NOT auto-deployed

- **Env vars** (`.env` on the VM) — edit by SSH, then `pm2 reload --update-env`.
  CI never touches `.env`.
- **System packages** (apt) — bootstrap runs once per VM. Re-run
  `bash /tmp/azure-bootstrap.sh` if you need fresh apt installs.
- **Postgres schema for Prisma side** — Prisma migrations are dev-time. Run
  `npx prisma migrate deploy` manually on the VM if schema changes.

## Rollback

If a deploy breaks the app:

```
ssh iox@<vm-ip>
cd /home/iox/app
git log --oneline -5         # find the last-good commit
git reset --hard <sha>
# Re-rsync .next/ from your machine, or trigger Actions → Run workflow on the prior commit
pm2 reload ecosystem.config.cjs
```
