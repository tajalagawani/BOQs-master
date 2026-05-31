"use server"

import { readFile } from "node:fs/promises"

import { and, eq, isNull } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { extractDocumentWorkflow } from "@/modules/ai-extraction/workflows/extract-document"
import { getDocSpec } from "@/modules/ai-extraction/specs/registry"
import { projects } from "@/modules/procurex/projects/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { tenderAddenda } from "./schema"
import { getSpecDiffer, specHasDiffer } from "./diffs/registry"
import type { ProposedFieldEvent } from "./diffs/types"

/**
 * Run the existing extraction agent on an addendum's amendment file
 * (FOT/ITT/COC/SOPR/Spec PDF) with `persist: false`, then diff the
 * verdict against the project's current persisted state.
 *
 * Returns the proposed field-level events for the wizard to render.
 * Apply happens in `applyAddendaSpecDiff` after the user confirms.
 */

export interface SpecDiffPreview {
  ok: true
  documentId: string
  specId: string
  events: ProposedFieldEvent[]
  workflowRunId: string | null
  iterations: number
}
interface SpecDiffError {
  ok: false
  error: string
}

async function fetchBufferFromBlobUrl(blobUrl: string): Promise<Buffer | null> {
  try {
    if (blobUrl.startsWith("file://")) {
      const path = blobUrl.replace(/^file:\/\//, "")
      return await readFile(path)
    }
    const res = await fetch(blobUrl)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function previewAddendaSpecDiff(
  documentId: string,
  specId: string,
): Promise<SpecDiffPreview | SpecDiffError> {
  const userId = await requireUserId()

  if (!specHasDiffer(specId)) {
    return { ok: false, error: `No differ implementation for spec '${specId}'` }
  }
  const spec = getDocSpec(specId)
  if (!spec) return { ok: false, error: `Unknown spec '${specId}'` }
  const differ = getSpecDiffer(specId)!

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      mimeType: documents.mimeType,
      blobUrl: documents.blobUrl,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, doc.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }
  const buf = await fetchBufferFromBlobUrl(doc.blobUrl)
  if (!buf) return { ok: false, error: "Could not read uploaded file" }

  // Run the extraction with persist=false — we want the verdict only.
  const result = await extractDocumentWorkflow({
    documentId: doc.id,
    buffer: buf,
    filename: doc.filename,
    mimeType: doc.mimeType,
    persist: false,
    context: {
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      roundId: `${doc.projectId}::initial`,
      userId,
      documentId: doc.id,
    },
  })

  if (!result.ok || result.verdict === undefined) {
    return {
      ok: false,
      error: result.error ?? "Extraction did not produce a verdict",
    }
  }

  const current = await differ.loadCurrent(doc.projectId)
  const events = differ.diff(current, result.verdict as unknown as never)

  return {
    ok: true,
    documentId: doc.id,
    specId,
    events,
    workflowRunId: result.workflowRunId,
    iterations: result.iterations,
  }
}

export interface ApplyAddendaSpecDiffInput {
  documentId: string
  specId: string
  confirmedIndices: number[]
}

export interface ApplyAddendaSpecDiffResult {
  ok: true
  addendumId: string
  addendumNo: string
  eventsApplied: number
}

export async function applyAddendaSpecDiff(
  input: ApplyAddendaSpecDiffInput,
): Promise<ApplyAddendaSpecDiffResult | SpecDiffError> {
  const userId = await requireUserId()

  // Re-run the diff server-side so we never trust client-supplied
  // payloads. The client only confirms which indices to apply.
  const preview = await previewAddendaSpecDiff(
    input.documentId,
    input.specId,
  )
  if (!preview.ok) return preview
  const selected = input.confirmedIndices
    .map((i) => preview.events[i])
    .filter((e): e is ProposedFieldEvent => Boolean(e))
  if (selected.length === 0) {
    return { ok: false, error: "No events selected" }
  }

  const differ = getSpecDiffer(input.specId)!

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc?.projectId) return { ok: false, error: "Document not found" }

  // Reserve next TA-N for this project
  const { sql } = await import("drizzle-orm")
  const [nextRow] = await db
    .select({
      n: sql<number>`coalesce(max(cast(regexp_replace(no, '^TA', '') as int)), 0)::int`,
    })
    .from(tenderAddenda)
    .where(
      and(
        eq(tenderAddenda.projectId, doc.projectId),
        sql`${tenderAddenda.no} ~ '^TA[0-9]+$'`,
      ),
    )
  const nextNo = `TA${Number(nextRow?.n ?? 0) + 1}`

  // Find a project row to confirm the workspace (and re-verify auth)
  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, doc.projectId))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  // Create the addendum row to anchor the events
  const [addendum] = await db
    .insert(tenderAddenda)
    .values({
      projectId: doc.projectId,
      no: nextNo,
      status: "applied",
      sourceZipFilename: doc.filename,
      sourceDocumentId: doc.id,
      appliedAt: new Date(),
      appliedByUserId: userId,
    })
    .returning({ id: tenderAddenda.id, no: tenderAddenda.no })
  if (!addendum) return { ok: false, error: "Failed to create addendum row" }

  // Delegate to the spec's apply implementation
  await differ.applyEvents(doc.projectId, selected, addendum.id, userId)

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: `addenda.spec_diff.apply:${input.specId}`,
    targetKind: "document",
    targetId: doc.id,
    payload: {
      addendumId: addendum.id,
      addendumNo: addendum.no,
      specId: input.specId,
      eventsApplied: selected.length,
    },
  })

  return {
    ok: true,
    addendumId: addendum.id,
    addendumNo: addendum.no,
    eventsApplied: selected.length,
  }
}
