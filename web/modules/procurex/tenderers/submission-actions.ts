"use server"

import { readFile } from "node:fs/promises"

import { and, eq, isNull } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import {
  boqItemRates,
  boqItems,
  boqPricesets,
  boqSections,
  boqTemplates,
} from "@/modules/boq/schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { tendererSubmissions } from "@/modules/analysis/schema"
import {
  extractLineItems,
  parseBoqWorkbook,
} from "@/modules/procurex/boq/parser"
import {
  matchEntity,
  type EntityCandidate,
} from "@/modules/procurex/boq/entity-matcher"
import { projects } from "@/modules/procurex/projects/schema"
import { tenderers } from "@/modules/procurex/tenderers/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { recomputeProjectBidderFlags } from "./flag-actions"

/**
 * Tenderer-priced-BoQ submission pipeline.
 *
 *   parseTendererSubmission(documentId, tendererId)
 *     → parses the uploaded xlsx, matches every row against the
 *       project's effective BoQ entities, returns the review payload.
 *
 *   applyTendererSubmission(...)
 *     → writes a `boq_priceset` (ownerKind='submission') + one
 *       `boq_item_rate` per match (with is_unpriced flag where the
 *       tenderer left the rate blank). Updates the tenderer_submission
 *       summary counts.
 */

export interface TendererMatchedRow {
  /** Index in the parsed file — stable so the apply step can correlate
   *  the confirmed subset back to the original rows. */
  rowIndex: number
  /** Reconstructed sheet/letter identity for display. */
  tendererItemRef: string
  description: string
  unit: string | null
  quantity: string | null
  /** Cents — null when the row is unpriced. */
  rateCents: string | null
  amountCents: string | null
  /** Matched BoQ entity id; null when no match was found. */
  matchedItemId: string | null
  /** "exact" / "fuzzy" / null when matchedItemId is null. */
  matchedVia: "exact" | "fuzzy" | null
  matchedScore: number | null
}

export interface TendererSubmissionPreview {
  ok: true
  documentId: string
  tendererId: string
  templateId: string
  /** What we found in the upload. */
  rows: TendererMatchedRow[]
  /** Items present in the project's BoQ but absent from this tenderer's
   *  submission. Each one represents a "missing" item the tenderer
   *  didn't quote at all. */
  missingFromSubmission: Array<{
    itemId: string
    no: string
    label: string
    unit: string | null
  }>
  /** Aggregate counts for the modal summary. */
  stats: {
    totalUploaded: number
    matched: number
    unmatched: number
    priced: number
    unpriced: number
    missing: number
  }
  /** Sum of all priced amounts in cents. */
  tenderSumCents: string
  warnings: string[]
}
interface TendererSubmissionError {
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

async function loadProjectBoqContext(workspaceId: string, projectId: string) {
  // Find the project's BoQ template (the one created from the empty BoQ
  // upload — NOT the PTE one).
  const rows = await db
    .select({
      templateId: boqTemplates.id,
      sourceDocCategory: documents.category,
    })
    .from(boqTemplates)
    .leftJoin(documents, eq(documents.id, boqTemplates.sourceDocumentId))
    .where(
      and(
        eq(boqTemplates.workspaceId, workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, projectId),
      ),
    )
  const tpl = rows.find(
    (r) => r.sourceDocCategory === "Blank BOQ / Pricing Schedule",
  )
  if (!tpl) return null

  const items = await db
    .select({
      id: boqItems.id,
      no: boqItems.no,
      label: boqItems.label,
      unit: boqItems.unit,
      sectionNo: boqSections.no,
    })
    .from(boqItems)
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
    .where(eq(boqItems.templateId, tpl.templateId))

  const candidates: EntityCandidate[] = items.map((r) => ({
    id: r.id,
    sectionNo: r.sectionNo,
    itemLetter: r.no.slice(r.no.lastIndexOf("/") + 1),
    description: r.label,
    unit: r.unit,
  }))
  return {
    templateId: tpl.templateId,
    candidates,
    boqLookup: new Map(
      items.map((r) => [
        r.id,
        { no: r.no, label: r.label, unit: r.unit, sectionNo: r.sectionNo },
      ]),
    ),
  }
}

export async function parseTendererSubmission(
  documentId: string,
  tendererId: string,
): Promise<TendererSubmissionPreview | TendererSubmissionError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
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

  const [tenderer] = await db
    .select({ id: tenderers.id, projectId: tenderers.projectId })
    .from(tenderers)
    .where(and(eq(tenderers.id, tendererId), isNull(tenderers.deletedAt)))
    .limit(1)
  if (!tenderer) return { ok: false, error: "Tenderer not found" }
  if (tenderer.projectId !== doc.projectId) {
    return { ok: false, error: "Tenderer and document belong to different projects" }
  }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }
  const buf = await fetchBuffer(doc.blobUrl)
  if (!buf) return { ok: false, error: "Could not read uploaded file" }

  const ctx = await loadProjectBoqContext(doc.workspaceId, doc.projectId)
  if (!ctx) {
    return {
      ok: false,
      error: "No BoQ has been imported for this project yet. Import the empty BoQ first.",
    }
  }

  // Parse the xlsx via the existing BoQ parser
  const parsed = parseBoqWorkbook(buf)
  const sheetCfgs = parsed.sheets
    .filter((s) => !s.skipByDefault && s.headerRow !== null)
    .map((s) => ({
      name: s.name,
      included: true,
      headerRow: s.headerRow ?? 0,
      columnMap: s.columnMap,
      extraColumns: {},
    }))
  const { itemsBySheet, totalItems } = extractLineItems(buf, sheetCfgs)

  // Match each row against the project's BoQ entities
  const rows: TendererMatchedRow[] = []
  let priced = 0
  let unpriced = 0
  let matched = 0
  let unmatched = 0
  let tenderSumCents = 0n
  const matchedItemIds = new Set<string>()
  let rowIndex = 0

  for (const [sheet, items] of Object.entries(itemsBySheet)) {
    for (const it of items) {
      const m = matchEntity(
        {
          sectionNo: sheet,
          itemLetter: it.itemRef,
          description: it.description,
          unit: it.unit,
        },
        ctx.candidates,
      )
      if (m) {
        matched += 1
        matchedItemIds.add(m.id)
      } else {
        unmatched += 1
      }
      const isPriced = it.rateCents !== null
      if (isPriced) {
        priced += 1
        if (it.amountCents !== null) tenderSumCents += it.amountCents
      } else {
        unpriced += 1
      }
      rows.push({
        rowIndex: rowIndex++,
        tendererItemRef: `${sheet}/${it.itemRef}`,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        rateCents: it.rateCents !== null ? it.rateCents.toString() : null,
        amountCents: it.amountCents !== null ? it.amountCents.toString() : null,
        matchedItemId: m?.id ?? null,
        matchedVia: m?.via ?? null,
        matchedScore: m?.score ?? null,
      })
    }
  }

  // Compute "missing" — items in the project's BoQ that the tenderer
  // didn't submit a row for at all.
  const missingFromSubmission: TendererSubmissionPreview["missingFromSubmission"] =
    []
  for (const c of ctx.candidates) {
    if (matchedItemIds.has(c.id)) continue
    missingFromSubmission.push({
      itemId: c.id,
      no: `${c.sectionNo}/${c.itemLetter}`,
      label: c.description,
      unit: c.unit,
    })
  }

  void totalItems
  return {
    ok: true,
    documentId: doc.id,
    tendererId: tenderer.id,
    templateId: ctx.templateId,
    rows,
    missingFromSubmission,
    stats: {
      totalUploaded: rows.length,
      matched,
      unmatched,
      priced,
      unpriced,
      missing: missingFromSubmission.length,
    },
    tenderSumCents: tenderSumCents.toString(),
    warnings: [],
  }
}

/**
 * Soft-delete a document row that was uploaded but not applied. Used
 * when a user uploads the wrong file on a tenderer card and wants to
 * pick a different one — we mark the row deleted so it doesn't pollute
 * the tenderer's submission later.
 */
export async function discardTendererUpload(
  documentId: string,
): Promise<{ ok: true } | TendererSubmissionError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      workspaceId: documents.workspaceId,
      projectId: documents.projectId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }

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

  await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(eq(documents.id, documentId))

  if (doc.projectId) {
    await recordAudit({
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      actorUserId: userId,
      actorKind: "user",
      action: "tenderer.submission.discard",
      targetKind: "document",
      targetId: doc.id,
      payload: {},
    })
  }

  return { ok: true }
}

export interface ApplyTendererSubmissionInput {
  documentId: string
  tendererId: string
}

export interface ApplyTendererSubmissionResult {
  ok: true
  pricesetId: string
  submissionId: string
  matched: number
  unpriced: number
  tenderSumCents: string
}

export async function applyTendererSubmission(
  input: ApplyTendererSubmissionInput,
): Promise<ApplyTendererSubmissionResult | TendererSubmissionError> {
  const userId = await requireUserId()

  // Re-run the parse server-side so we never trust client-supplied prices.
  const preview = await parseTendererSubmission(input.documentId, input.tendererId)
  if (!preview.ok) return preview

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

  // Confirm there's a submission shell row for this tenderer; create
  // one if not (the QS-upload flow creates this row, but the email
  // flow may not have triggered it yet).
  const roundId = `${doc.projectId}::initial`
  let [submission] = await db
    .select({ id: tendererSubmissions.id })
    .from(tendererSubmissions)
    .where(
      and(
        eq(tendererSubmissions.tendererId, input.tendererId),
        eq(tendererSubmissions.roundId, roundId),
      ),
    )
    .limit(1)
  if (!submission) {
    const inserted = await db
      .insert(tendererSubmissions)
      .values({
        tendererId: input.tendererId,
        roundId,
        status: "uploaded",
        sourceDocumentId: doc.id,
      })
      .returning({ id: tendererSubmissions.id })
    submission = inserted[0]
  }
  if (!submission) return { ok: false, error: "Failed to create submission row" }

  // Project workspace for the priceset
  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, doc.projectId))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  // Replace any prior priceset for this submission (idempotent re-uploads)
  await db
    .delete(boqPricesets)
    .where(
      and(
        eq(boqPricesets.templateId, preview.templateId),
        eq(boqPricesets.ownerKind, "submission"),
        eq(boqPricesets.ownerId, submission.id),
      ),
    )

  const [priceset] = await db
    .insert(boqPricesets)
    .values({
      templateId: preview.templateId,
      ownerKind: "submission",
      ownerId: submission.id,
      label: `${doc.filename} — submission`,
      currency: "AED",
    })
    .returning({ id: boqPricesets.id })
  if (!priceset) return { ok: false, error: "Failed to create priceset" }

  // Insert one boq_item_rate per matched row
  const rateRows: Array<{
    pricesetId: string
    itemId: string
    unitRateCents: bigint | null
    amountCents: bigint | null
    isUnpriced: boolean
  }> = []
  for (const r of preview.rows) {
    if (!r.matchedItemId) continue
    const rateCents = r.rateCents ? BigInt(r.rateCents) : null
    const amountCents = r.amountCents ? BigInt(r.amountCents) : null
    rateRows.push({
      pricesetId: priceset.id,
      itemId: r.matchedItemId,
      unitRateCents: rateCents,
      amountCents,
      isUnpriced: rateCents === null,
    })
  }
  for (let i = 0; i < rateRows.length; i += 500) {
    await db.insert(boqItemRates).values(rateRows.slice(i, i + 500))
  }

  // Update the submission shell with aggregate counts + tender sum
  await db
    .update(tendererSubmissions)
    .set({
      tenderSumCents: BigInt(preview.tenderSumCents),
      pricedItems: String(preview.stats.priced),
      unpricedItems: String(preview.stats.unpriced),
      status: "uploaded",
      sourceDocumentId: doc.id,
      submittedAt: new Date(),
    })
    .where(eq(tendererSubmissions.id, submission.id))

  await recordAudit({
    workspaceId: project.workspaceId,
    projectId: project.id,
    actorUserId: userId,
    actorKind: "user",
    action: "tenderer.submission.upload",
    targetKind: "tenderer",
    targetId: input.tendererId,
    payload: {
      submissionId: submission.id,
      pricesetId: priceset.id,
      matched: preview.stats.matched,
      unmatched: preview.stats.unmatched,
      unpriced: preview.stats.unpriced,
      missing: preview.stats.missing,
      tenderSumCents: preview.tenderSumCents,
    },
  })

  await db
    .update(documents)
    .set({ status: "scanned" })
    .where(eq(documents.id, doc.id))

  // Recompute deterministic flags across the project — cheap (one SQL
  // fetch + bulk insert) and means the Summary view's counts are in
  // sync the moment the user lands on it.
  try {
    await recomputeProjectBidderFlags(doc.projectId)
  } catch (err) {
    // Best-effort — never fail the apply on a flag-recompute error.
    console.warn("[applyTendererSubmission] flag recompute failed", err)
  }

  return {
    ok: true,
    pricesetId: priceset.id,
    submissionId: submission.id,
    matched: preview.stats.matched,
    unpriced: preview.stats.unpriced,
    tenderSumCents: preview.tenderSumCents,
  }
}
