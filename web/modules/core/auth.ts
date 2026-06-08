import { DrizzleAdapter } from "@auth/drizzle-adapter"
import bcrypt from "bcryptjs"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id"

import { db } from "@/modules/core/db"
import { env } from "@/modules/core/env"
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  type UserRole,
} from "@/modules/identity/schema"
import {
  applySuperadminAllowlist,
  getUserByEmail,
  getUserById,
} from "@/modules/identity/queries"
import { ensureWorkspaceForUser } from "@/modules/workspace/actions"

import { authConfig } from "./auth.config"
import { mirrorUserToLegacy } from "./identity-mirror"
import { HARDCODED_SUPERADMIN_EMAILS } from "./superadmins"

// Hardcoded super-admins + the SUPERADMIN_EMAILS env allowlist (parsed inline,
// not imported from ./authz, to avoid an auth ⇄ authz import cycle).
const SUPERADMIN_EMAILS = [
  ...HARDCODED_SUPERADMIN_EMAILS,
  ...env.SUPERADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
]

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(creds) {
      const email = String(creds?.email ?? "").trim().toLowerCase()
      const password = String(creds?.password ?? "")
      if (!email || !password) return null

      const user = await getUserByEmail(email)
      if (!user || !user.passwordHash) return null

      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) return null

      return {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
      }
    },
  }),
]

// Register Microsoft Entra ID only when configured, so the app still boots in
// dev without SSO secrets. The provider auto-reads the AUTH_MICROSOFT_ENTRA_ID_*
// env vars; the issuer is passed explicitly for clarity.
export const ssoEnabled = Boolean(env.AUTH_MICROSOFT_ENTRA_ID_ID)
if (ssoEnabled) {
  providers.push(
    MicrosoftEntraId({
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  callbacks: {
    ...authConfig.callbacks,
    // DB-backed: load the IOX role + capability into the token on sign-in and
    // whenever the session is explicitly refreshed (`update`).
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id
      const id = user?.id ?? token.sub
      if (id && (user || trigger === "update" || token.role === undefined)) {
        const row = await getUserById(id)
        if (row) {
          token.role = row.role
          token.aiAssistantTester = row.aiAssistantTester
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub
        if (token.role) session.user.role = token.role as UserRole
        session.user.aiAssistantTester = Boolean(token.aiAssistantTester)
      }
      return session
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return
      // Bootstrap the superadmin allowlist, then bring up the user's workspace
      // and mirror them into the legacy identity table. Each step is isolated so
      // one failure never blocks login.
      try {
        await applySuperadminAllowlist(user.id, user.email, SUPERADMIN_EMAILS)
      } catch (err) {
        console.error("[auth] superadmin allowlist failed", err)
      }
      try {
        await ensureWorkspaceForUser(user.id)
      } catch (err) {
        console.error("[auth] workspace bootstrap failed", err)
      }
      try {
        await mirrorUserToLegacy(user.id)
      } catch (err) {
        console.error("[auth] legacy identity mirror failed", err)
      }
    },
  },
})

/** Returns the current user id or throws `UNAUTHENTICATED`. */
export async function requireUserId(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("UNAUTHENTICATED")
  return userId
}
