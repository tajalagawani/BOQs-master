import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import type { ProjectFotRequirements } from "../types"
import { mapFotVerdictToGrouped } from "./fot-grouping"

/**
 * Project-side FOT requirements — the baseline every bidder must
 * comply against. Pulled from the project's own FOT document
 * (scope=required, target_kind=project, category="Form of Tender")
 * via its most recent successful `ai.extract:fot` workflow run, then
 * reshaped into the canonical 5-group `FotGrouped` shape.
 *
 * Returns null when no project FOT has been extracted yet.
 */

export async function getProjectFotRequirements(
  projectId: string,
): Promise<ProjectFotRequirements | null> {
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.scope, "required"),
        eq(documents.targetKind, "project"),
        eq(documents.category, "Form of Tender"),
        isNull(documents.deletedAt),
      ),
    )
  if (docRows.length === 0) return null
  const docIds = new Set(docRows.map((d) => d.id))

  const runs = await db
    .select({
      output: workflowRuns.output,
      input: workflowRuns.input,
      finishedAt: workflowRuns.finishedAt,
    })
    .from(workflowRuns)
    .where(
      and(
        eq(workflowRuns.kind, "ai.extract:fot"),
        eq(workflowRuns.status, "succeeded"),
      ),
    )
    .orderBy(desc(workflowRuns.finishedAt))

  const latest = runs.find((r) => {
    const docId = (r.input as { documentId?: string } | null)?.documentId
    return docId ? docIds.has(docId) : false
  })
  if (!latest) return null

  const verdict = (latest.output as { verdict?: unknown } | null)?.verdict
  return mapFotVerdictToGrouped(verdict)
}
