import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { tenderers } from "@/modules/procurex/tenderers/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { projects } from "./schema"

export async function getProjectById(projectId: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)
  return rows[0] ?? null
}

export async function getProjectsForUser(userId: string) {
  // Projects in any workspace the user belongs to.
  const workspaceIds = (
    await db
      .select({ id: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, userId))
  ).map((r) => r.id)

  if (workspaceIds.length === 0) return []

  return db
    .select()
    .from(projects)
    .where(
      and(
        inArray(projects.workspaceId, workspaceIds),
        isNull(projects.deletedAt),
      ),
    )
    .orderBy(desc(projects.createdAt))
}

/**
 * Counts active tenderers per project for a given set of project ids.
 * Returns a `{ projectId → count }` map for O(1) lookup at the call
 * site. Empty input → empty map (no DB hit).
 */
export async function getBidderCountsByProjectId(
  projectIds: string[],
): Promise<Record<string, number>> {
  if (projectIds.length === 0) return {}
  const rows = await db
    .select({
      projectId: tenderers.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(tenderers)
    .where(
      and(
        inArray(tenderers.projectId, projectIds),
        isNull(tenderers.deletedAt),
      ),
    )
    .groupBy(tenderers.projectId)
  const out: Record<string, number> = {}
  for (const r of rows) out[r.projectId] = Number(r.count)
  return out
}
