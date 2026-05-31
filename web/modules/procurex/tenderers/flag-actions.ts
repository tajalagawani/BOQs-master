"use server"

import { and, eq, inArray, isNull } from "drizzle-orm"

import {
  boqItemRates,
  boqItems,
  boqPricesets,
  boqTemplates,
} from "@/modules/boq/schema"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { projects } from "@/modules/procurex/projects/schema"
import { tenderers } from "@/modules/procurex/tenderers/schema"
import {
  tenderDeviationKindEnum,
  tenderDeviations,
  tenderFlags,
  tendererSubmissions,
  type TenderFlagKind,
} from "@/modules/analysis/schema"

/**
 * Deterministic per-bidder flag computation.
 *
 * Triggered after each `applyTendererSubmission` so the BoQ viewer's
 * Summary tab can render counts without re-walking the priceset on
 * every page load. The pass is intentionally cheap — no model calls,
 * one SQL fetch per submission, then a single bulk insert.
 *
 * Thresholds are configurable per-call so the user-selected baseline
 * mode in the UI can drive the same pass off-line (e.g. an exec asks
 * "what would the high-rate count look like at median?").
 */
export interface ComputeFlagsOptions {
  /** Variance is flagged when |rate-baseline| / baseline ≥ this fraction.
   *  Default 0.15 (15%). */
  varianceThreshold: number
  /** High-rate cutoff above baseline (fraction). Default 0.25. */
  highRateThreshold: number
  /** Low-rate cutoff below baseline (fraction). Default 0.25. */
  lowRateThreshold: number
  /** Baseline mode tag stored on the flag row for audit. */
  baselineMode: string
}

const DEFAULT_OPTIONS: ComputeFlagsOptions = {
  varianceThreshold: 0.15,
  highRateThreshold: 0.25,
  lowRateThreshold: 0.25,
  baselineMode: "avg_lowest_three",
}

interface FlagInsert {
  tendererId: string
  submissionId: string
  itemId: string | null
  kind: TenderFlagKind
  severity: "info" | "warn" | "critical"
  baselineMode: string
  payload: Record<string, unknown>
}

/**
 * Walks every priced row from every applied submission on the project
 * and emits flags. Replaces any prior flag rows in one transaction so
 * the table always reflects the latest state. Returns counts per
 * tenderer per kind (handy for the caller's response payload).
 */
export async function recomputeProjectBidderFlags(
  projectId: string,
  partial: Partial<ComputeFlagsOptions> = {},
): Promise<{
  ok: true
  countsByTenderer: Record<string, Record<TenderFlagKind, number>>
}> {
  const opts = { ...DEFAULT_OPTIONS, ...partial }

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    return { ok: true, countsByTenderer: {} }
  }

  // 1) Find the project's BoQ template — needed to look up
  //    quantity_planned on each item (the arithmetical check requires it).
  const tplRows = await db
    .select({
      templateId: boqTemplates.id,
      sourceCategory: documents.category,
    })
    .from(boqTemplates)
    .leftJoin(documents, eq(documents.id, boqTemplates.sourceDocumentId))
    .where(
      and(
        eq(boqTemplates.workspaceId, project.workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, project.id),
      ),
    )
  const boqTpl = tplRows.find(
    (r) => r.sourceCategory === "Blank BOQ / Pricing Schedule",
  )
  if (!boqTpl) return { ok: true, countsByTenderer: {} }

  // 2) Load all items with their planned quantities.
  const items = await db
    .select({
      id: boqItems.id,
      quantityPlanned: boqItems.quantityPlanned,
    })
    .from(boqItems)
    .where(eq(boqItems.templateId, boqTpl.templateId))
  const itemQtyById = new Map<string, number | null>()
  for (const it of items) {
    const q = it.quantityPlanned
    itemQtyById.set(
      it.id,
      q !== null && q !== undefined ? Number(q) : null,
    )
  }

  // 3) Load every applied submission's priceset + rates in one round-trip.
  const tendererRows = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(and(eq(tenderers.projectId, project.id), isNull(tenderers.deletedAt)))
  const tendererIds = tendererRows.map((t) => t.id)
  if (tendererIds.length === 0) {
    return { ok: true, countsByTenderer: {} }
  }

  const submissions = await db
    .select({
      id: tendererSubmissions.id,
      tendererId: tendererSubmissions.tendererId,
    })
    .from(tendererSubmissions)
    .where(inArray(tendererSubmissions.tendererId, tendererIds))
  if (submissions.length === 0) {
    return { ok: true, countsByTenderer: {} }
  }
  const submissionIds = submissions.map((s) => s.id)
  const submissionToTenderer = new Map(submissions.map((s) => [s.id, s.tendererId]))

  const pricesets = await db
    .select({
      id: boqPricesets.id,
      ownerId: boqPricesets.ownerId,
    })
    .from(boqPricesets)
    .where(
      and(
        eq(boqPricesets.templateId, boqTpl.templateId),
        eq(boqPricesets.ownerKind, "submission"),
        inArray(boqPricesets.ownerId, submissionIds),
      ),
    )
  if (pricesets.length === 0) {
    return { ok: true, countsByTenderer: {} }
  }
  const pricesetToSubmission = new Map(pricesets.map((p) => [p.id, p.ownerId]))

  const rates = await db
    .select({
      pricesetId: boqItemRates.pricesetId,
      itemId: boqItemRates.itemId,
      unitRateCents: boqItemRates.unitRateCents,
      amountCents: boqItemRates.amountCents,
      isUnpriced: boqItemRates.isUnpriced,
    })
    .from(boqItemRates)
    .where(inArray(boqItemRates.pricesetId, pricesets.map((p) => p.id)))

  // 4) Compute the per-item baseline across tenderers (avg of lowest 3).
  const ratesByItem = new Map<string, bigint[]>()
  for (const r of rates) {
    if (!r.unitRateCents) continue
    const arr = ratesByItem.get(r.itemId) ?? []
    arr.push(r.unitRateCents)
    ratesByItem.set(r.itemId, arr)
  }
  const baselineByItem = new Map<string, bigint>()
  for (const [itemId, arr] of ratesByItem) {
    const sorted = [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    if (opts.baselineMode === "median") {
      const mid = Math.floor(sorted.length / 2)
      baselineByItem.set(
        itemId,
        sorted.length % 2 === 1
          ? sorted[mid]!
          : (sorted[mid - 1]! + sorted[mid]!) / 2n,
      )
    } else if (opts.baselineMode === "average") {
      const sum = sorted.reduce((s, v) => s + v, 0n)
      baselineByItem.set(itemId, sum / BigInt(sorted.length))
    } else {
      // avg_lowest_three (default)
      const pick = sorted.slice(0, Math.min(3, sorted.length))
      const sum = pick.reduce((s, v) => s + v, 0n)
      baselineByItem.set(itemId, sum / BigInt(pick.length))
    }
  }

  // 5) Score each rate row.
  const flagsToInsert: FlagInsert[] = []
  const ARITHM_TOLERANCE_CENTS = 100n // 1.00 AED — rounding slack
  for (const r of rates) {
    const submissionId = pricesetToSubmission.get(r.pricesetId)
    if (!submissionId) continue
    const tendererId = submissionToTenderer.get(submissionId)
    if (!tendererId) continue

    if (r.isUnpriced || !r.unitRateCents) {
      flagsToInsert.push({
        tendererId,
        submissionId,
        itemId: r.itemId,
        kind: "unpriced",
        severity: "warn",
        baselineMode: opts.baselineMode,
        payload: {},
      })
      continue
    }

    const baseline = baselineByItem.get(r.itemId)
    if (baseline && baseline > 0n) {
      const rate = r.unitRateCents
      const diff = rate - baseline
      const absDiff = diff < 0n ? -diff : diff
      const varPct = Number((absDiff * 10000n) / baseline) / 100
      if (varPct >= opts.varianceThreshold * 100) {
        flagsToInsert.push({
          tendererId,
          submissionId,
          itemId: r.itemId,
          kind: "variance",
          severity: varPct >= 50 ? "critical" : "warn",
          baselineMode: opts.baselineMode,
          payload: { variancePct: varPct },
        })
      }
      if (
        rate > baseline &&
        Number((diff * 10000n) / baseline) / 100 >= opts.highRateThreshold * 100
      ) {
        flagsToInsert.push({
          tendererId,
          submissionId,
          itemId: r.itemId,
          kind: "high_rate",
          severity: "warn",
          baselineMode: opts.baselineMode,
          payload: { variancePct: varPct },
        })
      }
      if (
        rate < baseline &&
        Number((-diff * 10000n) / baseline) / 100 >= opts.lowRateThreshold * 100
      ) {
        flagsToInsert.push({
          tendererId,
          submissionId,
          itemId: r.itemId,
          kind: "low_rate",
          severity: "info",
          baselineMode: opts.baselineMode,
          payload: { variancePct: varPct },
        })
      }
    }

    // Arithmetical error: rate × quantity ≠ stored amount.
    const qty = itemQtyById.get(r.itemId)
    if (
      qty !== null &&
      qty !== undefined &&
      Number.isFinite(qty) &&
      r.amountCents
    ) {
      // BigInt math via integer-cents × integer-qty isn't safe when qty
      // has decimals, so we use floats here with a 1-cent tolerance.
      const expected = Math.round(Number(r.unitRateCents) * qty)
      const got = Number(r.amountCents)
      const slack = Number(ARITHM_TOLERANCE_CENTS)
      if (Math.abs(expected - got) > slack) {
        flagsToInsert.push({
          tendererId,
          submissionId,
          itemId: r.itemId,
          kind: "arithmetical_error",
          severity: "warn",
          baselineMode: opts.baselineMode,
          payload: {
            expectedCents: String(expected),
            gotCents: String(got),
          },
        })
      }
    }
  }

  // 6) Replace existing flags atomically and insert the new batch.
  await db
    .delete(tenderFlags)
    .where(inArray(tenderFlags.submissionId, submissionIds))
  for (let i = 0; i < flagsToInsert.length; i += 500) {
    const chunk = flagsToInsert.slice(i, i + 500)
    if (chunk.length === 0) continue
    await db.insert(tenderFlags).values(chunk)
  }

  // 7) Tally per tenderer for the response payload.
  const countsByTenderer: Record<string, Record<TenderFlagKind, number>> = {}
  for (const f of flagsToInsert) {
    const t = (countsByTenderer[f.tendererId] ??= {
      variance: 0,
      high_rate: 0,
      low_rate: 0,
      unpriced: 0,
      arithmetical_error: 0,
    })
    t[f.kind] += 1
  }
  return { ok: true, countsByTenderer }
}

/** Counts-only read for the Summary view. Cheap — pure SQL group-by. */
export async function getProjectBidderFlagCounts(
  projectId: string,
): Promise<Record<string, Record<TenderFlagKind, number>>> {
  const tendererRows = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  const tendererIds = tendererRows.map((t) => t.id)
  if (tendererIds.length === 0) return {}
  const rows = await db
    .select({
      tendererId: tenderFlags.tendererId,
      kind: tenderFlags.kind,
    })
    .from(tenderFlags)
    .where(inArray(tenderFlags.tendererId, tendererIds))
  const out: Record<string, Record<TenderFlagKind, number>> = {}
  for (const r of rows) {
    const t = (out[r.tendererId] ??= {
      variance: 0,
      high_rate: 0,
      low_rate: 0,
      unpriced: 0,
      arithmetical_error: 0,
    })
    t[r.kind] += 1
  }
  return out
}

/** Deviation counts per tenderer per kind — populated by the
 *  AI-extraction `deviations` spec once it runs. Returns zeros for
 *  tenderers with no run yet. */
export async function getProjectBidderDeviationCounts(
  projectId: string,
): Promise<
  Record<
    string,
    Record<(typeof tenderDeviationKindEnum.enumValues)[number], number>
  >
> {
  const tendererRows = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  const tendererIds = tendererRows.map((t) => t.id)
  if (tendererIds.length === 0) return {}
  const rows = await db
    .select({
      tendererId: tenderDeviations.tendererId,
      kind: tenderDeviations.kind,
    })
    .from(tenderDeviations)
    .where(inArray(tenderDeviations.tendererId, tendererIds))
  const out: Record<
    string,
    Record<(typeof tenderDeviationKindEnum.enumValues)[number], number>
  > = {}
  for (const r of rows) {
    const t = (out[r.tendererId] ??= {
      commercial: 0,
      technical: 0,
      contractual: 0,
    })
    t[r.kind] += 1
  }
  return out
}
