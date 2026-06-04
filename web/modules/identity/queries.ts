import { asc, eq } from "drizzle-orm"

import { db } from "@/modules/core/db"

import { users, type UserRole } from "./schema"

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  return rows[0] ?? null
}

export async function listDevSeedUsers() {
  return db.select().from(users).where(eq(users.isDevSeed, true))
}

/** Every user, oldest first — for the superadmin Users & Roles screen. */
export async function listAllUsers() {
  return db.select().from(users).orderBy(asc(users.createdAt))
}

export async function setUserRole(userId: string, role: UserRole) {
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function setAiAssistantTester(userId: string, enabled: boolean) {
  await db
    .update(users)
    .set({ aiAssistantTester: enabled, updatedAt: new Date() })
    .where(eq(users.id, userId))
}

export async function createUser(values: {
  email: string
  name: string | null
  role: UserRole
  aiAssistantTester: boolean
  passwordHash: string
}) {
  // Drizzle fills `id` (uuid), createdAt/updatedAt via its defaults.
  await db.insert(users).values({
    email: values.email,
    name: values.name,
    role: values.role,
    aiAssistantTester: values.aiAssistantTester,
    passwordHash: values.passwordHash,
    isDevSeed: false,
    emailVerified: new Date(),
  })
}

/**
 * Promote a user to `superadmin` if their email is in the allowlist. Idempotent
 * and safe to call on every sign-in. Never demotes — a superadmin removed from
 * the allowlist keeps the role until changed in the admin UI.
 */
export async function applySuperadminAllowlist(
  userId: string,
  email: string | null | undefined,
  allowlist: string[],
) {
  if (!email) return
  if (!allowlist.includes(email.trim().toLowerCase())) return
  await db
    .update(users)
    .set({ role: "superadmin", updatedAt: new Date() })
    .where(eq(users.id, userId))
}
