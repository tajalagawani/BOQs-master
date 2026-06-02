# ADR-0004 — Mock-session shim for IOX-native modules

- **Status:** Accepted (interim)
- **Date:** 2026-05-30
- **Supersedes:** none. **Superseded by:** Phase 9 (planned)

## Context

IOX-native modules (CostX, BOQs, summary screens) were ported from the source app, which has its own NextAuth wiring. To get IOX live quickly, we replaced the source app's `auth()` calls with a thin shim that always returns "Arjun Mehta" (the seeded admin).

When ProcureX joined and required real NextAuth, the two systems had to coexist.

## Decision

Keep `web/lib/session.ts` as a **mock** that returns Arjun. IOX-native code uses `getSession()` from this file; ProcureX code uses NextAuth's `auth()` directly. Both resolve to the same person (Arjun) by email convention.

Implementation today:

```ts
// web/lib/session.ts
export async function getSession() {
  return { user: { id: "<arjun's prisma user.id>", email: "arjun.mehta@iox.local", role: "ADMIN" } };
}
```

```ts
// modules/core/auth.ts (NextAuth)
export const { handlers, auth } = NextAuth({ ...authConfig, providers: [Credentials(...)] });
```

## Consequences

**Positive**
- ProcureX got real auth without forcing IOX-native modules to be re-plumbed.
- The seam is one file (`lib/session.ts`) — easy to swap.
- Local development is friction-free for the IOX-native side: no need to sign in to see CostX / BOQs / Summary.

**Negative**
- Two notions of "current user" in the codebase. Activity logs across modules might temporarily attribute the wrong user.id (Prisma `users` row vs Drizzle `px_user` row).
- A determined attacker hitting `/costx` directly bypasses NextAuth. Acceptable for the demo VM behind a known IP; not acceptable for public production.

## Resolution path (Phase 9)

Replace `lib/session.ts` with:

```ts
import { auth } from "@/modules/core/auth";
export async function getSession() {
  const real = await auth();
  if (real?.user) return real;
  if (process.env.NODE_ENV !== "production") {
    // dev fallback only
    return { user: { id: <arjun id>, email: "arjun.mehta@iox.local", role: "ADMIN" } };
  }
  return null;
}
```

And merge the two `users` tables into one (the Prisma one is the source of truth; NextAuth's Drizzle adapter points at it via a custom adapter).

Until then, **don't expose IOX-native routes publicly without auth**. Today the VM is acceptable because it's a demo accessed via known IP.
