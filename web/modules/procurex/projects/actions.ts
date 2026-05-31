"use server"

import { and, eq, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import { z } from "zod"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import {
  revisions,
  rounds,
} from "@/modules/procurex/revisions/schema"
import { getMyWorkspaces } from "@/modules/workspace/actions"

import { projectMembers, projects } from "./schema"

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currency: z.string().max(8).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  projectType: z.string().max(120).optional().nullable(),
  basisOfTender: z.string().max(120).optional().nullable(),
  conditionsOfContract: z.string().max(200).optional().nullable(),
  gfa: z.string().max(40).optional().nullable(),
  bua: z.string().max(40).optional().nullable(),
  budgetCents: z.bigint().optional().nullable(),
  projectLeadUserId: z.string().optional().nullable(),
  procurementLeadUserId: z.string().optional().nullable(),
  tenderCoordinatorUserId: z.string().optional().nullable(),
  tenderIssuedAt: z.string().optional().nullable(),
  originalReturnAt: z.string().optional().nullable(),
  adjustedReturnAt: z.string().optional().nullable(),
})

type UpdateInput = z.infer<typeof updateSchema>

/**
 * Create a draft project + revision 0 + initial round for the current
 * user's active workspace, then redirect into the wizard.
 *
 * Called from /projects/new (Server Component).
 */
export async function createProjectAndOpenWizard(): Promise<never> {
  const userId = await requireUserId()

  // Pick the first workspace the user belongs to (multi-workspace UX comes later).
  const myWorkspaces = await getMyWorkspaces(userId)
  const workspaceId = myWorkspaces[0]?.id
  if (!workspaceId) {
    throw new Error("No workspace found for current user")
  }

  // Sequential inserts (neon-http driver doesn't support multi-statement
  // transactions). If a later insert fails, the user retries — the orphan
  // draft project will be cleaned up by a future maintenance task.
  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      name: "Untitled tender",
      status: "draft",
      createdByUserId: userId,
    })
    .returning({ id: projects.id })
  if (!project) throw new Error("Failed to create project")

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId,
    role: "owner",
  })

  const [revision] = await db
    .insert(revisions)
    .values({
      projectId: project.id,
      label: "Revision 0 — Initial Submission",
      position: 0,
    })
    .returning({ id: revisions.id })
  if (!revision) throw new Error("Failed to create revision")

  await db.insert(rounds).values({
    revisionId: revision.id,
    key: "initial",
    label: "Initial",
    status: "open",
  })

  const projectId = project.id

  await recordAudit({
    workspaceId,
    projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "project.create",
    targetKind: "project",
    targetId: projectId,
    payload: null,
  })

  redirect(`/procurex/projects/${projectId}/setup?step=1`)
}

/**
 * Update fields on a project. Used by the wizard's "Save & Continue".
 * Only members of the owning workspace may write.
 */
export async function updateProject(
  projectId: string,
  patch: UpdateInput,
): Promise<void> {
  const userId = await requireUserId()
  const parsed = updateSchema.parse(patch)

  // Authorise: project must be in one of the user's workspaces.
  const rows = await db
    .select({
      workspaceId: projects.workspaceId,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)

  const proj = rows[0]
  if (!proj) throw new Error("Project not found")

  const myWorkspaces = await getMyWorkspaces(userId)
  const member = myWorkspaces.find((w) => w.id === proj.workspaceId)
  if (!member) throw new Error("FORBIDDEN")

  await db
    .update(projects)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  await recordAudit({
    workspaceId: proj.workspaceId,
    projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "project.update",
    targetKind: "project",
    targetId: projectId,
    payload: parsed as Record<string, unknown>,
  })
}
