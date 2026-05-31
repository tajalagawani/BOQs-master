# ADR-0003 — ProcureX lives in an isolated namespace

- **Status:** Accepted
- **Date:** 2026-05-30
- **Deciders:** Taj Noah

## Context

OmniApp's source uses paths like `/projects/<id>/setup`, `/api/files/<id>`, `/api/extraction/stream/<id>`. Dropped into IOX, those would collide with IOX-native routes (notably `/projects/` which already exists as the cross-module project list).

Three options for the port:

| # | Approach |
|---|---|
| A | Replace IOX's `/projects/` with the OmniApp one |
| B | Merge the two `/projects/` pages |
| C | Mount everything OmniApp under `/procurex` and prefix all OmniApp internal paths |

## Decision

Option **C**. Everything OmniApp moves to `web/app/procurex/*`, `web/components/procurex/*`, and `web/modules/procurex/*` (the latter colocates with shared modules — `web/modules/identity/`, `web/modules/workflows/` etc.). All hard-coded OmniApp paths get a `/procurex` prefix via a one-shot sed pass.

## Consequences

**Positive**
- Zero collision with IOX-native routes.
- ProcureX is grep-able: anything under `procurex/` is OmniApp lineage.
- Easy to reason about which routes need NextAuth (anything under `/procurex/*` does, the rest use the mock session for now).
- HeroUI Pro components scoped to ProcureX — the rest of IOX uses its own zinc design language.

**Negative**
- Path rewrites required: ~16 source files needed `s|/projects/|/procurex/projects/|` and `s|/api/(extraction\|files\|...)|/procurex/api/\1|`. One-time cost, captured in the migration history.
- Procurex layout has to be a *nested* Next.js layout (`<div>...` not `<html>`) since the root layout already provides the shell.
- Slight visual inconsistency: ProcureX retains some HeroUI Pro chrome (Segment chips, ActionBar, ListView) while the rest of IOX uses native pills.

## Implementation notes

- The `app/procurex/api/auth` path is the *only* exception — auth lives at root per ADR-0002. The folder `web/app/api/auth/` holds the actual handler.
- `web/modules/` (no `procurex/` prefix) holds OmniApp's foundation modules (identity, workspace, audit, companies, documents, comments, notifications, workflows). They live at the top of `modules/` to keep imports like `@/modules/identity/schema` working unchanged.
- Only `web/modules/procurex/*` carries the explicit prefix.
