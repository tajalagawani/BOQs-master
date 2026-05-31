"use server"

import { and, eq, inArray, isNull, sql } from "drizzle-orm"

import { tenderReviewRows } from "@/modules/analysis/schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { tenderers } from "@/modules/procurex/tenderers/schema"

/**
 * Persistence for the per-bidder per-compliance-section QS state —
 * the textarea + Include-in-PTC toggle that used to live only in
 * client state. One row per (tendererId, sectionKey).
 */

export interface ReviewRowSnapshot {
  tendererId: string
  sectionKey: string
  qsComment: string | null
  includeInPtc: boolean
  updatedAt: Date
}

/**
 * Load every persisted review-row state across a project's tenderers.
 * Used to hydrate the compliance grid on the bidder page so persisted
 * comments + toggles render on first paint.
 */
export async function getProjectReviewRows(
  projectId: string,
): Promise<ReviewRowSnapshot[]> {
  const tenderIds = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  const ids = tenderIds.map((t) => t.id)
  if (ids.length === 0) return []
  const rows = await db
    .select({
      tendererId: tenderReviewRows.tendererId,
      sectionKey: tenderReviewRows.sectionKey,
      qsComment: tenderReviewRows.qsComment,
      includeInPtc: tenderReviewRows.includeInPtc,
      updatedAt: tenderReviewRows.updatedAt,
    })
    .from(tenderReviewRows)
    .where(inArray(tenderReviewRows.tendererId, ids))
  return rows
}

/**
 * Idempotent upsert keyed on `(tendererId, sectionKey)`. Either field
 * (`qsComment`, `includeInPtc`) can be omitted; only the supplied
 * fields are written. Used by the textarea (debounced) and the toggle
 * (immediate) — both call the same action.
 *
 * Returns the persisted row so the caller can reconcile UI state.
 */
export interface UpsertReviewRowInput {
  tendererId: string
  sectionKey: string
  qsComment?: string | null
  includeInPtc?: boolean
}

export async function upsertReviewRow(
  input: UpsertReviewRowInput,
): Promise<
  | { ok: true; row: ReviewRowSnapshot }
  | { ok: false; error: string }
> {
  const userId = await requireUserId()
  if (!input.tendererId) return { ok: false, error: "tendererId required" }
  if (!input.sectionKey) return { ok: false, error: "sectionKey required" }
  if (input.qsComment === undefined && input.includeInPtc === undefined) {
    return { ok: false, error: "Nothing to persist" }
  }

  // Insert-or-update via ON CONFLICT on the unique (tenderer, section).
  // Only updates the columns the caller actually passed — drizzle's
  // .onConflictDoUpdate set is used to write any of comment / toggle.
  const setOnConflict: Record<string, unknown> = {
    updatedAt: sql`now()`,
    updatedByUserId: userId,
  }
  if (input.qsComment !== undefined) {
    setOnConflict.qsComment = input.qsComment
  }
  if (input.includeInPtc !== undefined) {
    setOnConflict.includeInPtc = input.includeInPtc
  }

  const inserted = await db
    .insert(tenderReviewRows)
    .values({
      tendererId: input.tendererId,
      sectionKey: input.sectionKey,
      qsComment: input.qsComment ?? null,
      includeInPtc: input.includeInPtc ?? true,
      updatedByUserId: userId,
    })
    .onConflictDoUpdate({
      target: [tenderReviewRows.tendererId, tenderReviewRows.sectionKey],
      set: setOnConflict,
    })
    .returning({
      tendererId: tenderReviewRows.tendererId,
      sectionKey: tenderReviewRows.sectionKey,
      qsComment: tenderReviewRows.qsComment,
      includeInPtc: tenderReviewRows.includeInPtc,
      updatedAt: tenderReviewRows.updatedAt,
    })

  const row = inserted[0]
  if (!row) return { ok: false, error: "Upsert returned no row" }
  return { ok: true, row }
}
