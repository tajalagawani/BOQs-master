// POST /api/account/password — let the signed-in user change their own
// password. Verifies the current password (when one is set) then stores a new
// bcrypt hash. Available to every signed-in user, incl. assistant-only testers.
import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { getUserById } from "@/modules/identity/queries"
import { users } from "@/modules/identity/schema"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let userId: string
  try {
    userId = await requireUserId()
  } catch {
    return Response.json({ error: "Not signed in." }, { status: 401 })
  }

  let body: { currentPassword?: string; newPassword?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 })
  }

  const current = String(body.currentPassword ?? "")
  const next = String(body.newPassword ?? "")
  if (next.length < 8) {
    return Response.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    )
  }

  const user = await getUserById(userId)
  if (!user) return Response.json({ error: "User not found." }, { status: 404 })

  // If they already have a password, the current one must match.
  if (user.passwordHash) {
    const ok = await bcrypt.compare(current, user.passwordHash)
    if (!ok) {
      return Response.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      )
    }
  }

  const hash = await bcrypt.hash(next, 10)
  await db
    .update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return Response.json({ ok: true })
}
