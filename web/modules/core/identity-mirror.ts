import "server-only"

import { prisma } from "@/lib/prisma"
import { getUserById } from "@/modules/identity/queries"
import type { UserRole } from "@/modules/identity/schema"

/**
 * IOX has one login identity — the Auth.js `px_user` table. A number of
 * roshn-ported features (activity logs, CostX teams, RatesX uploads) still
 * reference the legacy Prisma `users` table by email. To keep them working
 * for real (non-mock) users, we mirror the authenticated user into that table
 * on sign-in. This is a bridge, not a second source of truth — role always
 * flows from `px_user`.
 */

const ROLE_TO_LEGACY: Record<UserRole, "ADMIN" | "DEVELOPMENT_MANAGER" | "VIEWER"> = {
  superadmin: "ADMIN",
  director: "DEVELOPMENT_MANAGER",
  user: "VIEWER",
}

export async function mirrorUserToLegacy(userId: string): Promise<void> {
  const u = await getUserById(userId)
  if (!u?.email) return
  const legacyRole = ROLE_TO_LEGACY[u.role]
  const email = u.email.toLowerCase()
  await prisma.user.upsert({
    where: { email },
    update: { name: u.name, role: legacyRole, isActive: true, lastLoginAt: new Date() },
    create: { email, name: u.name, role: legacyRole, isActive: true, lastLoginAt: new Date() },
  })
}
