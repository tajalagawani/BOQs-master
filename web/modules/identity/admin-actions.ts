"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

import { requireSuperadmin } from "@/modules/core/authz"
import {
  createUser,
  getUserByEmail,
  setAiAssistantTester,
  setUserRole,
} from "@/modules/identity/queries"
import { userRoleEnum, type UserRole } from "@/modules/identity/schema"

/**
 * Create a new IOX user with an email + password. Superadmin only. Returns a
 * structured result the form can surface (no throw on validation errors).
 */
export async function createUserAction(input: {
  email: string
  name: string
  role: UserRole
  aiAssistantTester: boolean
  password: string
}): Promise<{ ok: true } | { error: string }> {
  await requireSuperadmin()

  const email = input.email.trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Enter a valid email address." }
  }
  if (!userRoleEnum.enumValues.includes(input.role)) {
    return { error: "Pick a valid role." }
  }
  if (!input.password || input.password.length < 4) {
    return { error: "Password must be at least 4 characters." }
  }
  if (await getUserByEmail(email)) {
    return { error: "A user with that email already exists." }
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  await createUser({
    email,
    name: input.name.trim() || null,
    role: input.role,
    aiAssistantTester: input.aiAssistantTester,
    passwordHash,
  })
  revalidatePath("/platform/users")
  return { ok: true }
}

/** Change a user's IOX role. Superadmin only. */
export async function setUserRoleAction(userId: string, role: UserRole) {
  const me = await requireSuperadmin()
  if (!userRoleEnum.enumValues.includes(role)) {
    throw new Error("INVALID_ROLE")
  }
  // Guard: a superadmin cannot demote themselves (avoid locking out the last admin).
  if (userId === me.id && role !== "superadmin") {
    throw new Error("CANNOT_DEMOTE_SELF")
  }
  await setUserRole(userId, role)
  revalidatePath("/platform/users")
}

/** Toggle whether a user may use the RatesX AI assistant. Superadmin only. */
export async function setAiAssistantTesterAction(
  userId: string,
  enabled: boolean,
) {
  await requireSuperadmin()
  await setAiAssistantTester(userId, enabled)
  revalidatePath("/platform/users")
}
