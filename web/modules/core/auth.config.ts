import { NextResponse } from "next/server"
import type { NextAuthConfig } from "next-auth"

import type { UserRole } from "@/modules/identity/schema"
import {
  ASSISTANT_ONLY_ALLOW_PREFIXES,
  isAssistantOnly,
} from "@/modules/core/assistant-only"

/**
 * Edge-safe Auth.js config. Imported by `middleware.ts` — must NOT pull in the
 * Drizzle adapter, bcryptjs, the DB, or anything else that needs Node APIs.
 *
 * Providers, the adapter, and the DB-backed role callbacks are added in
 * `auth.ts` (which is Node-only). The callbacks here are the minimal,
 * DB-free versions the middleware runs on every request.
 */

/** Path prefixes that never require a session (auth endpoints, sign-in).
 * /api/session-check is the nginx auth_request probe for the co-hosted ProcureX
 * app — it must be reachable un-redirected so it can return a clean 200/401. */
const PUBLIC_PREFIXES = ["/sign-in", "/sign-out", "/api/auth", "/api/session-check"]

export const authConfig = {
  // Trust the reverse-proxy forwarded Host so the edge proxy + Auth.js build
  // redirect URLs from the real prod origin (not localhost). Also set in
  // auth.ts for the Node instance.
  trustHost: true,
  pages: {
    // IOX-wide sign-in (any IOX user can reach every module once authenticated).
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const { pathname } = request.nextUrl
      if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return true
      if (!auth?.user) {
        // Non-users who hit the portal ROOT get the public marketing website
        // rather than the login wall. Deep links fall through to the /sign-in
        // redirect (with callbackUrl) below, so they return here after signing in.
        if (pathname === "/") {
          return NextResponse.redirect(new URL("https://www.iox-solutions.com"))
        }
        return false
      }
      // Assistant-only users are confined to the AI assistant + its API; any
      // other path bounces them back to the chat.
      if (isAssistantOnly(auth.user.email)) {
        const allowed = ASSISTANT_ONLY_ALLOW_PREFIXES.some(
          (p) => pathname === p || pathname.startsWith(p + "/"),
        )
        if (!allowed) {
          return NextResponse.redirect(
            new URL("/rates/assistant", request.nextUrl.origin),
          )
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      if (user?.email) token.email = user.email
      return token
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub
        // Email drives the assistant-only gate in `authorized` (runs in the
        // edge proxy), so make sure it is always present on the session.
        if (token.email) session.user.email = token.email
        if (token.role) session.user.role = token.role as UserRole
        if (typeof token.aiAssistantTester === "boolean") {
          session.user.aiAssistantTester = token.aiAssistantTester
        }
      }
      return session
    },
  },
} satisfies NextAuthConfig
