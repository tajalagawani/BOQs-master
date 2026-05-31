import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe Auth.js config. Imported by middleware.ts — must NOT pull in
 * the Drizzle adapter, bcryptjs, or anything else that needs Node APIs.
 *
 * Providers and adapter are added in `auth.ts` (which is Node-only).
 */
export const authConfig = {
  pages: {
    // ProcureX route group lives under /procurex inside IOX.
    signIn: "/procurex/sign-in",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized: ({ auth }) => Boolean(auth?.user),
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub
      }
      return session
    },
  },
} satisfies NextAuthConfig
