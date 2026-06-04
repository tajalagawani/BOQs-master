import "server-only"

import { redirect } from "next/navigation"

import { auth } from "@/modules/core/auth"
import { env } from "@/modules/core/env"
import { getUserById } from "@/modules/identity/queries"
import type { UserRole } from "@/modules/identity/schema"

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  aiAssistantTester: boolean
}

/** Parsed, lower-cased superadmin email allowlist from the environment. */
export const SUPERADMIN_EMAILS: string[] = env.SUPERADMIN_EMAILS.split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * The authenticated user, read fresh from the database (so role / capability
 * changes take effect immediately, without waiting for a token refresh).
 * Returns null when there is no session.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  const u = await getUserById(id)
  if (!u) return null
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    aiAssistantTester: u.aiAssistantTester,
  }
}

/** A logged-in user is required; otherwise bounce to sign-in. */
export async function requireUser(callbackUrl = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  return user
}

export function isSuperadmin(user: { role: UserRole } | null): boolean {
  return user?.role === "superadmin"
}

/** Superadmin-only gate for management screens / actions. */
export async function requireSuperadmin(): Promise<CurrentUser> {
  const user = await requireUser("/platform/users")
  if (user.role !== "superadmin") redirect("/platform/access-denied")
  return user
}

/** Superadmins can always use the assistant; everyone else needs the flag. */
export function canUseRatesAssistant(
  user: { role: UserRole; aiAssistantTester: boolean } | null,
): boolean {
  if (!user) return false
  return user.role === "superadmin" || user.aiAssistantTester
}
