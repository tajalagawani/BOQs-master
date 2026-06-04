import type { NextAuthConfig } from "next-auth"

import type { UserRole } from "@/modules/identity/schema"

/**
 * Edge-safe Auth.js config. Imported by `middleware.ts` — must NOT pull in the
 * Drizzle adapter, bcryptjs, the DB, or anything else that needs Node APIs.
 *
 * Providers, the adapter, and the DB-backed role callbacks are added in
 * `auth.ts` (which is Node-only). The callbacks here are the minimal,
 * DB-free versions the middleware runs on every request.
 */

/** Path prefixes that never require a session (auth endpoints, sign-in). */
const PUBLIC_PREFIXES = ["/sign-in", "/procurex/sign-in", "/api/auth"]

export const authConfig = {
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
      return Boolean(auth?.user)
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub
        if (token.role) session.user.role = token.role as UserRole
        if (typeof token.aiAssistantTester === "boolean") {
          session.user.aiAssistantTester = token.aiAssistantTester
        }
      }
      return session
    },
  },
} satisfies NextAuthConfig
