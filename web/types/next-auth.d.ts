import type { DefaultSession } from "next-auth"
import type { UserRole } from "@/modules/identity/schema"

/**
 * Augment Auth.js types so `session.user.role` / `token.role` are typed
 * everywhere. Values are populated by the callbacks in `modules/core/auth.ts`.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      aiAssistantTester: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role?: UserRole
    aiAssistantTester?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    aiAssistantTester?: boolean
  }
}
