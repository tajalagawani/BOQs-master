# ADR-0005 — HeroUI Pro is a runtime license dependency

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Taj Noah

## Context

OmniApp components used `@heroui-pro/react` for a handful of Pro-only widgets: `Segment`, `ActionBar`, `ListView`, `FloatingToc` (4 source files). The npm package is a stub — the actual compiled components are downloaded by a `postinstall` script that authenticates with a HeroUI Pro license token.

Three options:

| # | Approach | Cost |
|---|---|---|
| A | Keep HeroUI Pro, provide token to CI + VM | License fee, ongoing |
| B | Reimplement the 4 components in IOX zinc style | One-time dev cost, free thereafter |
| C | Strip the HeroUI Pro features (lose Segment / ActionBar / etc.) | Reduces ProcureX UX richness |

## Decision

Option **A**. Keep HeroUI Pro. Inject `HEROUI_AUTH_TOKEN` into:

1. The Azure VM via `/tmp/iox-bootstrap.env` (chmod 600), sourced by the bootstrap script
2. The GitHub Actions runner via `secrets.HEROUI_AUTH_TOKEN`

The postinstall runs in both places, fetches the real component code, and the build succeeds.

## Consequences

**Positive**
- The 4 ported OmniApp pages render with their original look-and-feel (faithful-port rule).
- No reimplementation work; no risk of subtle behaviour drift from a manual rewrite.

**Negative**
- The build is **license-gated** — anyone cloning the repo without the token gets a stub install and the build fails.
- The token is a long-lived secret stored in GitHub Actions secrets + on the VM filesystem.
- License renewal lapses → next deploy fails.

## Operational implications

- The token lives in 3 places: HeroUI dashboard (source), GitHub Actions secret, VM `/tmp/iox-bootstrap.env`.
- Rotation: regenerate in HeroUI dashboard → `gh secret set HEROUI_AUTH_TOKEN` → SSH and update `/tmp/iox-bootstrap.env` → next deploy uses new token.
- Renewal: track in support model (see `docs/governance/support-model.md`).
