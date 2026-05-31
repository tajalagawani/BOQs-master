import { DrizzleAdapter } from "@auth/drizzle-adapter"
import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { db } from "@/modules/core/db"
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/modules/identity/schema"
import { getUserByEmail } from "@/modules/identity/queries"
import { ensureWorkspaceForUser } from "@/modules/workspace/actions"

import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
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
  ],
  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          await ensureWorkspaceForUser(user.id)
        } catch (err) {
          console.error("[auth] workspace bootstrap failed", err)
        }
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
