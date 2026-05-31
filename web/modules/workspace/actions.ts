import { and, eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { recordAudit } from "@/modules/audit"
import { getUserById } from "@/modules/identity/queries"

import { workspaceMembers, workspaces, type WorkspaceRole } from "./schema"

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40)
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "workspace"
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`
    const existing = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, candidate))
      .limit(1)
    if (existing.length === 0) return candidate
  }
  return `${root}-${Date.now()}`
}

/**
 * If the user has no workspace membership yet, create a personal workspace
 * and add them as owner. Idempotent — safe to call on every sign-in.
 */
export async function ensureWorkspaceForUser(userId: string): Promise<string> {
  const existing = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)

  if (existing[0]) return existing[0].workspaceId

  const user = await getUserById(userId)
  const displayName = user?.name ?? user?.email ?? "Workspace"
  const slug = await uniqueSlug(displayName)
  const name = user?.name ? `${user.name}'s Workspace` : "Personal Workspace"

  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug, createdByUserId: userId })
    .returning({ id: workspaces.id })

  if (!workspace) throw new Error("Failed to create workspace")

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  })

  await recordAudit({
    workspaceId: workspace.id,
    actorUserId: userId,
    actorKind: "user",
    action: "workspace.bootstrap",
    targetKind: "workspace",
    targetId: workspace.id,
    payload: { slug, name },
  })

  return workspace.id
}

/**
 * Return the user's role in a given workspace, or null if not a member.
 */
export async function getUserRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1)
  return rows[0]?.role ?? null
}

/**
 * Return the list of workspaces the user is a member of (with their role).
 */
export async function getMyWorkspaces(userId: string) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
}
