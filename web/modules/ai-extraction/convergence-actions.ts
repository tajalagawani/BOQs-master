"use server"

import { and, desc, eq } from "drizzle-orm"

import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import { workflowRuns } from "@/modules/workflows/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import {
  reconcileProject,
  type ConvergenceReport,
} from "./convergence"

const SPECS_OF_INTEREST = ["fot", "itt", "coc", "sopr", "specification"]

/**
 * For a project, fetch the latest successful workflow_run per spec,
 * extract `output.verdict`, and reconcile shared fields.
 */
export async function getProjectConvergence(
  projectId: string,
): Promise<ConvergenceReport | null> {
  const userId = await requireUserId()
  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return null

  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return null

  const verdictsByCategory: Record<string, Record<string, unknown> | null> = {}

  for (const specId of SPECS_OF_INTEREST) {
    const rows = await db
      .select({ output: workflowRuns.output })
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.projectId, projectId),
          eq(workflowRuns.kind, `ai.extract:${specId}`),
          eq(workflowRuns.status, "succeeded"),
        ),
      )
      .orderBy(desc(workflowRuns.finishedAt))
      .limit(1)
    const out = rows[0]?.output as { verdict?: unknown } | undefined
    verdictsByCategory[specId] =
      (out?.verdict as Record<string, unknown> | undefined) ?? null
  }

  return reconcileProject(verdictsByCategory)
}
