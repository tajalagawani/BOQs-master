# IOX — Release Procedure

> Closes **C4-SC2 Release management**. Documents the formal release process
> that GitHub Actions executes automatically.

## Overview

IOX uses **continuous deployment** to a single Azure VM. Every push to `main`
that touches `web/**` triggers a build + deploy. No manual release steps.

```
git push origin main
        │
        ▼
GitHub Actions (.github/workflows/deploy.yml)
   1. checkout @ HEAD
   2. npm ci  (+ HEROUI_AUTH_TOKEN postinstall)
   3. npx prisma generate
   4. npm run build                              ← production build
   5. ssh-agent + trust VM host key
   6. rsync source → /home/iox/app/              ← no git on VM
   7. rsync .next/ → /home/iox/app/web/.next/    ← prod build artefact
   8. npm ci on VM (only if package-lock changed)
   9. apply new Drizzle migrations idempotently
  10. pm2 reload ecosystem.config.cjs
  11. smoke test http://20.203.125.83/
        │
        ▼
  Live in ~3 minutes
```

## Release classes

| Class | Trigger | Approval | Notification |
|---|---|---|---|
| **Hotfix** | Push to `main` with `fix:` or `hotfix:` prefix | Tech Lead PR approval | None — straight through |
| **Standard** | Push to `main` with `feat:` / `chore:` / `refactor:` etc. | Tech Lead PR approval | Release-notes entry post-deploy |
| **Schema-changing** | Push that adds files under `web/drizzle/migrations/` or `web/prisma/migrations/` | Tech Lead sign-off | Pre-announce; release-notes entry |
| **Infra-changing** | Push that touches `infra/`, `scripts/azure-bootstrap.sh`, or `.github/workflows/` | Tech Lead | Manual smoke-test post-deploy |

## Pre-deploy checks (developer)

Before pushing to `main`:

- [ ] `npm run build` succeeds locally (or on a feature branch via Actions)
- [ ] No `.env*` secrets in the diff (`.gitignore` covers them but eyeball anyway)
- [ ] Commit message follows conventional-commit style
- [ ] If migration added: applied locally and verified the diff is intentional
- [ ] If a new env var was introduced: documented + added to bootstrap + added to `.github/workflows/deploy.yml` build-time placeholders

## During-deploy (automatic)

- The workflow uses `concurrency: deploy-main` with `cancel-in-progress: false`. A second push during a running deploy queues cleanly; nothing is clobbered.
- A failed step aborts the deploy. The previous build remains on the VM and continues serving via pm2. **No automatic rollback** — investigate, push a fix, re-run.

## Post-deploy verification

The workflow ends with two `curl` smoke checks. If either is not 200, the run fails red.

Manual extras (only required for schema- or infra-changing releases):
- SSH and `pm2 logs iox-web --nostream --lines 50` to confirm clean startup
- `psql $DATABASE_URL_UNPOOLED -c "\dt"` to verify expected tables
- Hit the affected pages in a browser

## Rollback

There is no one-button rollback today. To revert:

1. On your laptop: identify the last-good commit (`git log --oneline`)
2. `gh workflow run deploy.yml --ref <good-sha>` — re-runs the deploy at the previous commit
3. The runner builds from that SHA and rsyncs the result to the VM
4. ~3 minutes to recover

For schema-changing releases, schema rollback is **not automatic** — restore from Postgres backup or write a reverse migration manually.

## Release-notes register

| Release | Date | Commit | Notes |
|---|---|---|---|
| v0.1.0 — go-live | 2026-05-31 | b68a0a4 .. c293ad5 | First live deployment to Azure UAE North. CostX + BOQs + ProcureX + 4 cross-module routes. See [release-notes/2026-05-31-go-live.md](../operations/release-notes/2026-05-31-go-live.md). |

## Approval record template

For releases that require explicit sign-off (schema-changing, infra-changing,
go-live milestones), capture in `docs/operations/release-notes/<date>-<slug>.md`:

```
Approver:        <name>
Role:            <PO / TL / Assessor>
Approved at:     <ISO timestamp>
Approved commit: <SHA>
Notes:           <any conditions>
```
