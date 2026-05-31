import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"

import { users } from "./schema"

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
