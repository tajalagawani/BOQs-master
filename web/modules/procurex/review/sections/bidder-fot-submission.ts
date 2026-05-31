import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import type { BidderFotSubmission } from "../types"
import { mapFotVerdictToGrouped } from "./fot-grouping"

/**
 * Per-bidder submitted FOT — pulls the latest successful
 * `ai.extract:fot` verdict for the bidder's uploaded Form of Tender
 * document (scope=bidder_submission, target_kind=tenderer,
 * category="Form of Tender") and returns it in the canonical 5-group
 * shape so callers can render it next to `getProjectFotRequirements`.
 */

export async function getBidderFotSubmission(
  bidderId: string,
): Promise<BidderFotSubmission | null> {
  const docRows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(
      and(
        eq(documents.scope, "bidder_submission"),
        eq(documents.targetKind, "tenderer"),
        eq(documents.category, "Form of Tender"),
        eq(documents.targetId, bidderId),
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
