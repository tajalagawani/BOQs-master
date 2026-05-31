"use server"

import { readFile } from "node:fs/promises"

import { and, eq, isNull } from "drizzle-orm"

import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { extractDocumentWorkflow } from "@/modules/ai-extraction/workflows/extract-document"

/**
 * Run an extraction agent INLINE — bypassing the queue + worker — for
 * a bidder doc the QS just uploaded. Returns the verdict directly so
 * the upload wizard can render results without polling.
 *
 * Same code path the worker takes (`extractDocumentWorkflow`), just
 * called from the request thread. Heavy: each call hits the model.
 * Use sparingly — only when the UX requires an immediate verdict
 * (the upload wizard).
 */

export interface RunExtractionNowSuccess {
  ok: true
  workflowRunId: string
  verdict: unknown
  iterations: number
}
export interface RunExtractionNowError {
  ok: false
  error: string
}

async function fetchBuffer(blobUrl: string): Promise<Buffer | null> {
  try {
    if (blobUrl.startsWith("file://")) {
      return await readFile(blobUrl.replace(/^file:\/\//, ""))
    }
    const res = await fetch(blobUrl)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function runExtractionNow(input: {
  documentId: string
  /** Spec id override — when set, runs that spec instead of the one
   *  derived from `document.category`. Used for the secondary
   *  `deviations` pass on bidder docs. */
  specOverride?: string
  /** Tenderer the doc belongs to. Surfaced to the persistor so
   *  bidder-scoped verdicts (e.g. `tender_deviation`) attribute
   *  correctly. */
  tendererId: string
}): Promise<RunExtractionNowSuccess | RunExtractionNowError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      blobUrl: documents.blobUrl,
      mimeType: documents.mimeType,
      workspaceId: documents.workspaceId,
      projectId: documents.projectId,
      category: documents.category,
    })
    .from(documents)
    .where(
      and(eq(documents.id, input.documentId), isNull(documents.deletedAt)),
    )
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }
  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }

  const buffer = await fetchBuffer(doc.blobUrl)
  if (!buffer) {
    return { ok: false, error: "Could not read uploaded file" }
  }

  const result = await extractDocumentWorkflow({
    documentId: doc.id,
    specOverride: input.specOverride,
    buffer,
    filename: doc.filename,
    mimeType: doc.mimeType,
    context: {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      roundId: `${doc.projectId}::initial`,
      userId,
      documentId: doc.id,
      tendererId: input.tendererId,
    },
  })

  if (!result.ok) {
    return {
      ok: false,
      error: result.error ?? "Extraction failed",
    }
  }
  return {
    ok: true,
    workflowRunId: result.workflowRunId,
    verdict: result.verdict,
    iterations: result.iterations,
  }
}
