# IOX — Access Control Matrix

> Closes **C1-SC3 Identity and access management**. Maps every role to every
> module action.

## Role definitions

| Role | Defined in | Granted to today | Intent |
|---|---|---|---|
| `SUPER_ADMIN` | `px_user.dev_role_label` (ProcureX) + `users.role = "ADMIN"` (Prisma) | Arjun Mehta (seed) | Platform-wide; bypasses all per-module checks |
| `ADMIN` | Prisma enum `UserRole` | — | Module-level admin; create masterplans, manage users, see all data |
| `DEVELOPMENT_MANAGER` | Prisma enum `UserRole` | — | Can create masterplans + manage assigned projects |
| `VIEWER` | Prisma enum `UserRole` | — | Read-only access to assigned masterplans |
| `MANAGER` (project-scoped) | Prisma enum `TeamRole` | — | Project-level write access |
| `VIEWER` (project-scoped) | Prisma enum `TeamRole` | — | Project-level read |

ProcureX role labels are free-text on `px_user.dev_role_label` (used by the dev quick-fill sign-in panel). The enforced enum is Prisma's `UserRole`; ProcureX permission checks short-circuit when the IOX-side user has `role = "ADMIN"` (the super-admin rule).

## Module × Action × Role matrix

✅ allowed · ⛔ denied · ★ requires team membership

### Home (`/`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| Land on home, see module cards | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open any module (auth handled per module) | ✅ | ✅ | ✅ | ✅ | ⛔ |

### CostX (`/costx`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| List masterplans | ✅ | ✅ all | ✅ assigned | ✅ assigned | ⛔ |
| Open masterplan editor | ✅ | ✅ all | ★ MANAGER | ★ VIEWER | ⛔ |
| Create new masterplan | ✅ | ✅ | ✅ (if project access) | ⛔ | ⛔ |
| Edit masterplan name / phases | ✅ | ✅ all | ★ MANAGER | ⛔ | ⛔ |
| Delete masterplan | ✅ | ✅ | ⛔ | ⛔ | ⛔ |
| View summary page | ✅ | ✅ all | ★ either role | ★ either role | ⛔ |
| Edit cost rows | ✅ | ✅ all | ★ MANAGER | ⛔ | ⛔ |

### BOQs (`/boqs`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| List runs | ✅ | ✅ all | ✅ own | ✅ own | ⛔ |
| Create import run | ✅ | ✅ | ✅ | ⛔ | ⛔ |
| Open run dashboard | ✅ | ✅ | ✅ own | ✅ own | ⛔ |
| Download coded XLSX | ✅ | ✅ | ✅ own | ✅ own | ⛔ |

### ProcureX (`/procurex`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| Sign in | ✅ | ✅ | ✅ | ✅ | ⛔ (must sign in) |
| List projects | ✅ | ✅ workspace | ★ owner/qs | ★ viewer | ⛔ |
| Create project | ✅ | ✅ | ✅ | ⛔ | ⛔ |
| Edit project setup | ✅ | ✅ | ★ owner/qs | ⛔ | ⛔ |
| Upload tender docs | ✅ | ✅ | ★ owner/qs | ⛔ | ⛔ |
| View BoQ viewer | ✅ | ✅ | ★ any | ★ any | ⛔ |
| Edit PTC / clarifications | ✅ | ✅ | ★ owner/qs | ⛔ | ⛔ |
| View analysis | ✅ | ✅ | ★ any | ★ any | ⛔ |
| Approve tender report | ✅ | ✅ | ★ owner | ⛔ | ⛔ |

### Projects (`/projects`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| Cross-module project list | ✅ | ✅ all | ✅ assigned masterplans + benchmarks | ✅ assigned | ⛔ |

### Benchmarking (`/benchmarking`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| List benchmarks | ✅ | ✅ all | ✅ accessible | ✅ accessible | ⛔ |
| Upload Excel benchmark | ✅ | ✅ | ✅ | ⛔ | ⛔ |
| View RCDC baseline | ✅ | ✅ | ✅ | ✅ | ⛔ |

### Rate Analysis (`/cost-model-rate-analysis`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| Browse 960-entry rate library | ✅ | ✅ | ✅ | ✅ | ⛔ |

### Configuration (`/configuration`)
| Action | SUPER_ADMIN | ADMIN | DEV_MANAGER | VIEWER | Anonymous |
|---|---|---|---|---|---|
| View all 9 panels | ✅ | ✅ | ⛔ | ⛔ | ⛔ |
| Edit cost-modelling tree | ✅ | ✅ | ⛔ | ⛔ | ⛔ |
| Edit parametric matrix / cost factors / S-curve / parking / etc. | ✅ | ✅ | ⛔ | ⛔ | ⛔ |

## How the matrix is enforced in code

| Layer | Helper | File |
|---|---|---|
| Server-component gate | `getSession()` (mock) / `auth()` (NextAuth) | `web/lib/session.ts`, `web/modules/core/auth.ts` |
| Per-masterplan check | `canAccessMasterplan(userId, masterplanId)` | `web/lib/permissions.ts` |
| Per-project (ProcureX) | `canAccessProject(userId, projectId, action)` | `web/lib/permissions.ts` |
| Create-permission | `canCreateMasterplanForProject(userId, projectId)` | `web/lib/permissions.ts` |
| Aggregate user view | `getUserPermissions(userId)` → `{ canCreate*, isAdmin, isDevelopmentManager, isViewer }` | `web/lib/permissions.ts` |

All helpers short-circuit to `true` when `user.role === "ADMIN"` — that's the super-admin rule.

## Test evidence

| Test | Result | Date |
|---|---|---|
| Sign in as Arjun (SUPER_ADMIN) → see every module | ✅ | 2026-05-31 |
| Unauthenticated GET `/procurex` | Redirects to `/procurex/sign-in` ✅ | 2026-05-31 |
| Unauthenticated GET `/costx` | Returns 200 (mock session active in dev) ⚠ | 2026-05-31 |
| Wrong password sign-in attempt | NextAuth `CredentialsSignin` error, page re-renders with banner ✅ | 2026-05-31 |

The 2nd "anonymous → /costx" case is the dev-only gap noted in [ADR-0004](../architecture/decisions/0004-mock-session-shim.md). Acceptable on the demo VM (single-IP access), must close before public production launch.

## Outstanding items (M1 doesn't close these)

- [ ] Seed at least one user per non-admin role (DEV_MANAGER, VIEWER) and re-run the test matrix above with each — needed to actually demonstrate "2 distinct roles in active use" per the framework.
- [ ] Replace mock session in production (Phase 9).
- [ ] Add a `tests/` suite that asserts each row of this matrix programmatically (planned for M2).
