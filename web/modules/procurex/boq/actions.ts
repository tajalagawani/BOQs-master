"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

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
import { projects } from "@/modules/procurex/projects/schema"
import { workspaceMembers } from "@/modules/workspace/schema"
import { tendererSubmissions } from "@/modules/analysis/schema"
import { tenderers } from "@/modules/procurex/tenderers/schema"
import { companies } from "@/modules/companies/schema"
import {
  getProjectBidderFlagCounts,
  getProjectBidderDeviationCounts,
} from "@/modules/procurex/tenderers/flag-actions"
import { getProjectFotCompliance } from "@/modules/procurex/tenderers/compliance-actions"
import type { FotComplianceResult } from "@/modules/procurex/tenderers/compliance-types"

import { sql } from "drizzle-orm"

import { matchEntity, type EntityCandidate } from "./entity-matcher"
import {
  ENTITY_MODEL_ENABLED,
  recordEvents,
  type TenderEventSourceKind,
} from "./events"
import { tenderItemEvents } from "./events-schema"
import {
  extractLineItems,
  parseBoqWorkbook,
  validatePteAgainstBoq,
  type BoqField,
  type BoqStructureSnapshot,
  type ParsedWorkbook,
  type PteValidationReport,
  type SheetMapping,
} from "./parser"

interface ParseResult {
  ok: true
  workbook: ParsedWorkbook
  documentFilename: string
}
interface ParseError {
  ok: false
  error: string
}

/**
 * Server Action — fetches the document's file bytes, runs the deterministic
 * BoQ parser, and returns the modal payload (sheets + previews + auto-mapping).
 *
 * No DB writes. Cheap enough to call on every modal-open (~250 ms for a
 * 1.2 MB workbook).
 */
export async function parseBoqDocument(
  documentId: string,
): Promise<ParseResult | ParseError> {
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

  // Authorise via workspace membership.
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

  const buffer = await fetchDocumentBuffer(doc.blobUrl)
  if (!buffer.ok) return { ok: false, error: buffer.error }

  try {
    const workbook = parseBoqWorkbook(buffer.value)
    return { ok: true, workbook, documentFilename: doc.filename }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse failed"
    return { ok: false, error: msg }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Import — apply user-confirmed mapping and persist line items.
// ─────────────────────────────────────────────────────────────────────────

export interface ImportBoqInput {
  documentId: string
  /** Display name for the boq_template row ("EMR DCH Public Realm BoQ"). */
  templateName: string
  /** Currency code stored on the template ("AED"). */
  currency: string | null
  /** One entry per sheet — only included ones are imported. */
  sheets: Array<{
    name: string
    included: boolean
    headerRow: number
    columnMap: Partial<Record<string, BoqField>>
    extraColumns: Record<string, string>
  }>
}

export interface ImportBoqResult {
  ok: true
  templateId: string
  sectionsCreated: number
  itemsCreated: number
}
interface ImportBoqError {
  ok: false
  error: string
}

/**
 * Server Action — write the user-confirmed BoQ mapping to the analysis
 * schema (boq_template + boq_section per sheet + boq_item per line).
 *
 * If a template already exists for this document, it's replaced
 * (delete-then-insert) so re-imports stay idempotent.
 */
export async function importBoqMapping(
  input: ImportBoqInput,
): Promise<ImportBoqResult | ImportBoqError> {
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
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(eq(projects.id, doc.projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }
  const buffer = await fetchDocumentBuffer(doc.blobUrl)
  if (!buffer.ok) return { ok: false, error: buffer.error }

  // Strict guard — at minimum every included sheet must have itemRef and
  // description mapped, otherwise we'd silently write rows with no labels.
  for (const s of input.sheets) {
    if (!s.included) continue
    const fields = new Set(Object.values(s.columnMap))
    if (!fields.has("itemRef") || !fields.has("description")) {
      return {
        ok: false,
        error: `Sheet '${s.name}' is included but is missing the Item and/or Description column mapping`,
      }
    }
  }

  const mappings: SheetMapping[] = input.sheets.map((s) => ({
    name: s.name,
    included: s.included,
    headerRow: s.headerRow,
    columnMap: s.columnMap,
    extraColumns: s.extraColumns,
  }))

  const { itemsBySheet, totalItems } = extractLineItems(buffer.value, mappings)
  if (totalItems === 0) {
    return {
      ok: false,
      error: "No line items found with the current mapping. Check the header row and column assignments.",
    }
  }

  // Replace any prior template parsed from THIS document (idempotent re-
  // imports). We scope by sourceDocumentId so a PTE template doesn't get
  // clobbered when the user re-imports the empty BoQ, and vice versa.
  await db
    .delete(boqTemplates)
    .where(
      and(
        eq(boqTemplates.workspaceId, project.workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, project.id),
        eq(boqTemplates.sourceDocumentId, doc.id),
      ),
    )

  const [template] = await db
    .insert(boqTemplates)
    .values({
      workspaceId: project.workspaceId,
      name: input.templateName || doc.filename,
      ownerKind: "project",
      ownerId: project.id,
      currency: input.currency,
      sourceDocumentId: doc.id,
      createdByUserId: userId,
    })
    .returning({ id: boqTemplates.id })

  if (!template) {
    return { ok: false, error: "Failed to create BoQ template row" }
  }

  // Sections + items
  let sectionsCreated = 0
  let itemsCreated = 0
  let sectionPosition = 0
  // Uniqueness is template-wide (UNIQUE(template_id, no)), not per-section.
  // Track every issued `no` so an item ref repeated across sheets (every
  // sheet starts at "A") doesn't collide.
  const noSeen = new Set<string>()

  for (const sheetCfg of mappings) {
    if (!sheetCfg.included) continue
    const items = itemsBySheet[sheetCfg.name] ?? []
    if (items.length === 0) continue

    const [section] = await db
      .insert(boqSections)
      .values({
        templateId: template.id,
        position: sectionPosition++,
        no: sheetCfg.name,
        label: sheetCfg.name,
        pricingMode:
          /gen\s*req|general\s*req/i.test(sheetCfg.name)
            ? "general_req"
            : "measured",
      })
      .returning({ id: boqSections.id })
    if (!section) continue
    sectionsCreated += 1

    // Build `no` as "<sheet>/<itemRef>" so items are unique across
    // sheets. Within one sheet, an itemRef can still legitimately
    // repeat (some BoQs reuse letters per sub-bill) — those get an
    // extra "#sourceRow" suffix.
    // Pre-generate matching item + event ids so we can wire each row's
    // entity_origin_event_id without a per-item UPDATE loop afterwards.
    const itemEventPairs = items.map((it) => {
      let no = `${sheetCfg.name}/${it.itemRef}`
      if (noSeen.has(no)) no = `${no}#${it.sourceRow}`
      noSeen.add(no)
      const itemId = crypto.randomUUID()
      const eventId = crypto.randomUUID()
      return {
        item: {
          id: itemId,
          templateId: template.id,
          sectionId: section.id,
          no,
          label: it.description,
          unit: it.unit,
          quantityPlanned: it.quantity,
          notes: it.extra ? JSON.stringify(it.extra) : null,
          entityOriginEventId: eventId,
        },
        event: {
          id: eventId,
          projectId: project.id,
          itemId,
          eventKind: "created" as const,
          sourceKind: "boq_import" as TenderEventSourceKind,
          sourceId: template.id,
          payload: { templateId: template.id, sheet: sheetCfg.name },
          recordedByUserId: userId,
        },
      }
    })

    if (itemEventPairs.length > 0) {
      const itemRows = itemEventPairs.map((p) => p.item)
      const eventRows = itemEventPairs.map((p) => p.event)
      // Chunked batched inserts.
      for (let i = 0; i < itemRows.length; i += 500) {
        await db.insert(boqItems).values(itemRows.slice(i, i + 500))
      }
      await recordEvents(eventRows)
      itemsCreated += itemRows.length
    }
  }

  await recordAudit({
    workspaceId: project.workspaceId,
    projectId: project.id,
    actorUserId: userId,
    actorKind: "user",
    action: "boq.import",
    targetKind: "document",
    targetId: doc.id,
    payload: {
      templateId: template.id,
      sectionsCreated,
      itemsCreated,
      currency: input.currency,
      entityModelEnabled: ENTITY_MODEL_ENABLED,
    },
  })

  // Mark the document as scanned so the Step 2 UI shows it as completed.
  await db
    .update(documents)
    .set({ status: "scanned" })
    .where(eq(documents.id, doc.id))

  return {
    ok: true,
    templateId: template.id,
    sectionsCreated,
    itemsCreated,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// Read — fetch every line item under a project's BoQ template for the
// full-page viewer. Returns null when no template exists yet.
// ─────────────────────────────────────────────────────────────────────────

export interface BoqViewerSection {
  id: string
  no: string
  label: string
  position: number
  itemCount: number
}

export interface BoqViewerItem {
  id: string
  sectionId: string
  no: string
  label: string
  unit: string | null
  quantityPlanned: string | null
  /** PTE only — populated when the item has a row in boq_item_rate
   *  under the project's PTE priceset. NULL otherwise. */
  rateCents: string | null
  amountCents: string | null
  /** Total number of recorded events for this entity. Drives the
   *  "show history" affordance in the viewer. */
  eventCount: number
}

export interface BoqViewerItemEvent {
  id: string
  itemId: string | null
  eventKind: string
  sourceKind: string
  sourceId: string | null
  payload: unknown
  recordedAt: string
}

export interface BoqViewerTemplate {
  id: string
  name: string
  currency: string | null
  createdAt: string
  sections: BoqViewerSection[]
  items: BoqViewerItem[]
}

/** One tenderer's applied PTC submission, expressed as a BoQ template view
 *  with the tenderer's rates overlaid on the project's BoQ items. */
export interface BoqViewerSubmission {
  tendererId: string
  tendererCode: string
  tendererName: string
  template: BoqViewerTemplate
}

/** Per-bidder roll-up row for the analysis-summary view. All cent
 *  amounts are bigint-as-string so they cross the server boundary. */
export interface BoqViewerSummaryRow {
  tendererId: string
  tendererCode: string
  tendererName: string
  tenderSumCents: string
  adjustedSumCents: string | null
  /** Percent deviation vs PTE; null when no PTE is loaded. Positive =
   *  higher than the estimate. */
  variancePctVsPte: number | null
  pricedItems: number
  unpricedItems: number
  arithmeticalErrors: number
  highRatesCount: number
  lowRatesCount: number
  /** Counts that drive the "Flags & Deviations" cards on the Summary
   *  view. The first five are materialised by the deterministic
   *  recompute (`recomputeProjectBidderFlags`); the last three come
   *  from the AI `deviations` agent once it runs against the bidder's
   *  docs. All default to 0 when no analysis has happened yet. */
  flagCounts: {
    variance: number
    highRate: number
    lowRate: number
    unpriced: number
    arithmeticalError: number
    commercial: number
    technical: number
    contractual: number
  }
}

export interface BoqViewerData {
  /** Empty-BoQ template imported on Step 2 (the source-of-truth structure). */
  boq: BoqViewerTemplate | null
  /** PTE template — same shape, plus rates on items where available. */
  pte: BoqViewerTemplate | null
  /** Per-tenderer applied submissions (priceset.ownerKind = 'submission'). */
  submissions: BoqViewerSubmission[]
  /** Rates from the PTE priceset, re-keyed against BoQ item ids via the
   *  entity matcher — so the side-by-side compare view can render PTE
   *  rates on BoQ rows even when the two templates use different sheet
   *  naming (e.g. PTE `2P10` vs BoQ `2B`). Submission rates are already
   *  BoQ-id-aligned because applyTendererSubmission writes them against
   *  the BoQ template directly. */
  pteRatesByBoqItemId: Record<
    string,
    { rateCents: string | null; amountCents: string | null }
  >
  /** Per-bidder roll-up — one row per applied submission. Used by the
   *  Summary view in the BoQ viewer. */
  summary: BoqViewerSummaryRow[]
  /** Per-bidder FOT clause compliance verdicts (Compliant / Partial /
   *  Non-compliant / Missing) derived from the existing FOT extraction
   *  verdicts. Empty when no FOT runs have completed. */
  fotComplianceByTendererId: Record<string, FotComplianceResult>
}

export async function getProjectBoq(
  projectId: string,
): Promise<{ ok: true; data: BoqViewerData } | { ok: false; error: string }> {
  const userId = await requireUserId()

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  // Pull all of the project's BoQ-like templates (BoQ + PTE) along with
  // the source-document category so we can tell them apart.
  const templates = await db
    .select({
      id: boqTemplates.id,
      name: boqTemplates.name,
      currency: boqTemplates.currency,
      createdAt: boqTemplates.createdAt,
      docCategory: documents.category,
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

  const boqRow = templates.find(
    (r) => r.docCategory === "Blank BOQ / Pricing Schedule",
  )
  const pteRow = templates.find(
    (r) => r.docCategory === "Pre-Tender Estimate",
  )

  const boq = boqRow ? await hydrateTemplate(boqRow, false) : null
  const pte = pteRow ? await hydrateTemplate(pteRow, true) : null
  const submissions = boq
    ? await hydrateSubmissionsForBoq(boq, project.id)
    : []
  const pteRatesByBoqItemId =
    boq && pte ? buildPteOverlay(boq, pte) : {}
  const [summary, fotComplianceByTendererId] = await Promise.all([
    buildBidderSummary(project.id, pte),
    getProjectFotCompliance(project.id),
  ])

  return {
    ok: true,
    data: {
      boq,
      pte,
      submissions,
      pteRatesByBoqItemId,
      summary,
      fotComplianceByTendererId,
    },
  }
}

/**
 * One row per applied tenderer submission with the metrics the analysis
 * dashboard expects. Variance is computed vs the PTE's total amount —
 * null when PTE is missing.
 */
async function buildBidderSummary(
  projectId: string,
  pte: BoqViewerTemplate | null,
): Promise<BoqViewerSummaryRow[]> {
  const tenRows = await db
    .select({
      tendererId: tenderers.id,
      code: tenderers.code,
      companyName: companies.name,
    })
    .from(tenderers)
    .innerJoin(companies, eq(companies.id, tenderers.companyId))
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  if (tenRows.length === 0) return []

  const tenderIds = tenRows.map((t) => t.tendererId)
  const subs = await db
    .select({
      tendererId: tendererSubmissions.tendererId,
      submittedAt: tendererSubmissions.submittedAt,
      tenderSumCents: tendererSubmissions.tenderSumCents,
      adjustedSumCents: tendererSubmissions.adjustedSumCents,
      pricedItems: tendererSubmissions.pricedItems,
      unpricedItems: tendererSubmissions.unpricedItems,
      arithmeticalErrors: tendererSubmissions.arithmeticalErrors,
      highRatesCount: tendererSubmissions.highRatesCount,
      lowRatesCount: tendererSubmissions.lowRatesCount,
    })
    .from(tendererSubmissions)
    .where(inArray(tendererSubmissions.tendererId, tenderIds))
  const byTenderer = new Map<string, (typeof subs)[number]>()
  for (const s of subs) {
    const prev = byTenderer.get(s.tendererId)
    if (
      !prev ||
      (s.submittedAt && prev.submittedAt && s.submittedAt > prev.submittedAt) ||
      (s.submittedAt && !prev.submittedAt)
    ) {
      byTenderer.set(s.tendererId, s)
    }
  }

  // PTE total — sum of all priced amounts. Used as the variance baseline.
  let pteTotal: bigint | null = null
  if (pte) {
    let t = 0n
    for (const it of pte.items) {
      if (it.amountCents) {
        try {
          t += BigInt(it.amountCents)
        } catch {
          /* skip */
        }
      }
    }
    pteTotal = t > 0n ? t : null
  }

  // Phase-A deterministic flags + Phase-C AI deviations counts.
  const [flagCountsByTenderer, deviationCountsByTenderer] = await Promise.all([
    getProjectBidderFlagCounts(projectId),
    getProjectBidderDeviationCounts(projectId),
  ])

  const rows: BoqViewerSummaryRow[] = []
  for (const t of tenRows) {
    const s = byTenderer.get(t.tendererId)
    if (!s) continue
    const tenderSum = s.tenderSumCents ?? 0n
    const adjusted = s.adjustedSumCents
    let variance: number | null = null
    if (pteTotal && pteTotal > 0n) {
      const base = adjusted ?? tenderSum
      const diff = base - pteTotal
      variance = Number((diff * 10000n) / pteTotal) / 100
    }
    const f = flagCountsByTenderer[t.tendererId]
    const d = deviationCountsByTenderer[t.tendererId]
    const flagCounts = {
      variance: f?.variance ?? 0,
      highRate: f?.high_rate ?? 0,
      lowRate: f?.low_rate ?? 0,
      unpriced: f?.unpriced ?? 0,
      arithmeticalError: f?.arithmetical_error ?? 0,
      commercial: d?.commercial ?? 0,
      technical: d?.technical ?? 0,
      contractual: d?.contractual ?? 0,
    }
    rows.push({
      tendererId: t.tendererId,
      tendererCode: t.code,
      tendererName: t.companyName,
      tenderSumCents: tenderSum.toString(),
      adjustedSumCents: adjusted ? adjusted.toString() : null,
      variancePctVsPte: variance,
      // Prefer the materialised flag counts over the submission-row
      // counters — those were written by the upload step before
      // baseline-aware analysis ran. Fall back when no flags computed.
      pricedItems: Number(s.pricedItems ?? "0"),
      unpricedItems: flagCounts.unpriced || Number(s.unpricedItems ?? "0"),
      arithmeticalErrors:
        flagCounts.arithmeticalError || Number(s.arithmeticalErrors ?? "0"),
      highRatesCount: flagCounts.highRate || Number(s.highRatesCount ?? "0"),
      lowRatesCount: flagCounts.lowRate || Number(s.lowRatesCount ?? "0"),
      flagCounts,
    })
  }
  rows.sort((a, b) =>
    a.tendererCode.localeCompare(b.tendererCode, undefined, { numeric: true }),
  )
  return rows
}

/**
 * Walk PTE items, match each one to a BoQ item via the entity matcher
 * (same logic the addenda / tenderer pipelines use) and return a map of
 * BoQ-item-id → { rate, amount } from the PTE.
 *
 * O(n × m) with n = PTE items, m = BoQ items per section. Fine for
 * 2,000-row templates; if we ever go higher we can index `candidates`
 * by section.
 */
function buildPteOverlay(
  boq: BoqViewerTemplate,
  pte: BoqViewerTemplate,
): Record<string, { rateCents: string | null; amountCents: string | null }> {
  const candidates: EntityCandidate[] = boq.items.map((it) => ({
    id: it.id,
    sectionNo: it.no.includes("/")
      ? it.no.slice(0, it.no.lastIndexOf("/"))
      : "",
    itemLetter: it.no.includes("/")
      ? it.no.slice(it.no.lastIndexOf("/") + 1)
      : it.no,
    description: it.label,
    unit: it.unit,
  }))
  const out: Record<
    string,
    { rateCents: string | null; amountCents: string | null }
  > = {}
  for (const it of pte.items) {
    if (!it.rateCents && !it.amountCents) continue
    const m = matchEntity(
      {
        sectionNo: it.no.includes("/")
          ? it.no.slice(0, it.no.lastIndexOf("/"))
          : "",
        itemLetter: it.no.includes("/")
          ? it.no.slice(it.no.lastIndexOf("/") + 1)
          : it.no,
        description: it.label,
        unit: it.unit,
      },
      candidates,
    )
    if (!m) continue
    // First match wins. PTE shouldn't have multiple lines collapsing to
    // one BoQ item, but be defensive.
    if (out[m.id]) continue
    out[m.id] = { rateCents: it.rateCents, amountCents: it.amountCents }
  }
  return out
}

/**
 * For every applied tenderer submission on the project, return a BoQ
 * template view whose items reuse the project's BoQ structure but with
 * the submission's rates/amounts overlaid. Items the tenderer didn't
 * price (or didn't submit at all) keep their null rate/amount.
 */
async function hydrateSubmissionsForBoq(
  boq: BoqViewerTemplate,
  projectId: string,
): Promise<BoqViewerSubmission[]> {
  // 1) Tenderers + companies for this project (ordered by code).
  const tenRows = await db
    .select({
      tendererId: tenderers.id,
      code: tenderers.code,
      companyName: companies.name,
    })
    .from(tenderers)
    .innerJoin(companies, eq(companies.id, tenderers.companyId))
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  if (tenRows.length === 0) return []

  const tenderIds = tenRows.map((t) => t.tendererId)

  // 2) Latest submission per tenderer (the apply path replaces priceset
  //    rows on re-upload but a tenderer may still have an older
  //    submission row; we use the latest by submittedAt).
  const subs = await db
    .select({
      id: tendererSubmissions.id,
      tendererId: tendererSubmissions.tendererId,
      tenderSumCents: tendererSubmissions.tenderSumCents,
      submittedAt: tendererSubmissions.submittedAt,
    })
    .from(tendererSubmissions)
    .where(inArray(tendererSubmissions.tendererId, tenderIds))
  const subByTenderer = new Map<string, (typeof subs)[number]>()
  for (const s of subs) {
    const prev = subByTenderer.get(s.tendererId)
    if (
      !prev ||
      (s.submittedAt &&
        prev.submittedAt &&
        s.submittedAt > prev.submittedAt) ||
      (s.submittedAt && !prev.submittedAt)
    ) {
      subByTenderer.set(s.tendererId, s)
    }
  }

  // 3) For each submission, fetch its priceset (ownerKind='submission')
  //    plus the rates indexed by item id.
  const result: BoqViewerSubmission[] = []
  for (const t of tenRows) {
    const sub = subByTenderer.get(t.tendererId)
    if (!sub) continue
    const [priceset] = await db
      .select({ id: boqPricesets.id })
      .from(boqPricesets)
      .where(
        and(
          eq(boqPricesets.ownerKind, "submission"),
          eq(boqPricesets.ownerId, sub.id),
        ),
      )
      .orderBy(desc(boqPricesets.createdAt))
      .limit(1)
    if (!priceset) continue

    const rateRows = await db
      .select({
        itemId: boqItemRates.itemId,
        unitRateCents: boqItemRates.unitRateCents,
        amountCents: boqItemRates.amountCents,
      })
      .from(boqItemRates)
      .where(eq(boqItemRates.pricesetId, priceset.id))
    const rateByItemId = new Map<
      string,
      { rateCents: bigint | null; amountCents: bigint | null }
    >()
    for (const r of rateRows) {
      rateByItemId.set(r.itemId, {
        rateCents: r.unitRateCents,
        amountCents: r.amountCents,
      })
    }

    const items: BoqViewerItem[] = boq.items.map((it) => {
      const r = rateByItemId.get(it.id)
      return {
        ...it,
        rateCents: r?.rateCents ? r.rateCents.toString() : null,
        amountCents: r?.amountCents ? r.amountCents.toString() : null,
      }
    })

    result.push({
      tendererId: t.tendererId,
      tendererCode: t.code,
      tendererName: t.companyName,
      template: {
        id: priceset.id,
        name: `${t.code} — ${t.companyName}`,
        currency: boq.currency,
        createdAt: (sub.submittedAt ?? new Date()).toISOString(),
        sections: boq.sections,
        items,
      },
    })
  }

  // Sort by tenderer code for a stable T1 → T2 → … display order.
  result.sort((a, b) =>
    a.tendererCode.localeCompare(b.tendererCode, undefined, { numeric: true }),
  )
  return result
}

/**
 * Hydrate a single boq_template into the BoqViewerTemplate shape used by
 * the viewer page. When `withRates` is true we also join boq_item_rate
 * via the template's priceset so rate + amount columns are populated
 * (PTE mode).
 */
async function hydrateTemplate(
  templateRow: {
    id: string
    name: string
    currency: string | null
    createdAt: Date | string
  },
  withRates: boolean,
): Promise<BoqViewerTemplate> {
  const sectionRows = await db
    .select({
      id: boqSections.id,
      no: boqSections.no,
      label: boqSections.label,
      position: boqSections.position,
    })
    .from(boqSections)
    .where(eq(boqSections.templateId, templateRow.id))
    .orderBy(boqSections.position)

  const itemRows = await db
    .select({
      id: boqItems.id,
      sectionId: boqItems.sectionId,
      no: boqItems.no,
      label: boqItems.label,
      unit: boqItems.unit,
      quantityPlanned: boqItems.quantityPlanned,
    })
    .from(boqItems)
    .where(eq(boqItems.templateId, templateRow.id))

  // Phase 2 — event counts per item so the viewer can show a history
  // affordance only on rows that actually have events.
  const eventCountByItem = new Map<string, number>()
  if (itemRows.length > 0) {
    const itemIds = itemRows.map((r) => r.id)
    const counts = await db
      .select({
        itemId: tenderItemEvents.itemId,
        n: sql<number>`count(*)::int`,
      })
      .from(tenderItemEvents)
      .where(inArray(tenderItemEvents.itemId, itemIds))
      .groupBy(tenderItemEvents.itemId)
    for (const r of counts) {
      if (r.itemId) eventCountByItem.set(r.itemId, Number(r.n))
    }
  }
  void eventCountByItem // silence "unused" if downstream skips it

  // Optional rate join — pick the most-recent estimate priceset for this
  // template and pull its rates.
  const rateByItemId = new Map<
    string,
    { rateCents: bigint | null; amountCents: bigint | null }
  >()
  if (withRates) {
    const [priceset] = await db
      .select({ id: boqPricesets.id })
      .from(boqPricesets)
      .where(
        and(
          eq(boqPricesets.templateId, templateRow.id),
          eq(boqPricesets.ownerKind, "estimate"),
        ),
      )
      .orderBy(desc(boqPricesets.createdAt))
      .limit(1)
    if (priceset) {
      const rateRows = await db
        .select({
          itemId: boqItemRates.itemId,
          unitRateCents: boqItemRates.unitRateCents,
          amountCents: boqItemRates.amountCents,
        })
        .from(boqItemRates)
        .where(eq(boqItemRates.pricesetId, priceset.id))
      for (const r of rateRows) {
        rateByItemId.set(r.itemId, {
          rateCents: r.unitRateCents,
          amountCents: r.amountCents,
        })
      }
    }
  }

  const countBySection = new Map<string, number>()
  for (const r of itemRows) {
    countBySection.set(r.sectionId, (countBySection.get(r.sectionId) ?? 0) + 1)
  }
  const sections: BoqViewerSection[] = sectionRows.map((s) => ({
    id: s.id,
    no: s.no,
    label: s.label,
    position: s.position,
    itemCount: countBySection.get(s.id) ?? 0,
  }))

  const sectionOrder = new Map(sectionRows.map((s, i) => [s.id, i]))
  const items: BoqViewerItem[] = itemRows
    .map((r) => {
      const rate = rateByItemId.get(r.id)
      return {
        id: r.id,
        sectionId: r.sectionId,
        no: r.no,
        label: r.label,
        unit: r.unit,
        quantityPlanned:
          r.quantityPlanned !== null && r.quantityPlanned !== undefined
            ? String(r.quantityPlanned)
            : null,
        rateCents: rate?.rateCents ? rate.rateCents.toString() : null,
        amountCents: rate?.amountCents ? rate.amountCents.toString() : null,
        eventCount: eventCountByItem.get(r.id) ?? 0,
      }
    })
    .sort((a, b) => {
      const sa = sectionOrder.get(a.sectionId) ?? 0
      const sb = sectionOrder.get(b.sectionId) ?? 0
      if (sa !== sb) return sa - sb
      return a.no.localeCompare(b.no, undefined, { numeric: true })
    })

  return {
    id: templateRow.id,
    name: templateRow.name,
    currency: templateRow.currency,
    createdAt:
      templateRow.createdAt instanceof Date
        ? templateRow.createdAt.toISOString()
        : String(templateRow.createdAt),
    sections,
    items,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// History — fetch the event timeline for one entity.
// ─────────────────────────────────────────────────────────────────────────

export async function getItemHistory(
  itemId: string,
): Promise<{ ok: true; events: BoqViewerItemEvent[] } | { ok: false; error: string }> {
  const userId = await requireUserId()
  void userId // we authorise via the item's project below

  const [item] = await db
    .select({
      id: boqItems.id,
      templateId: boqItems.templateId,
    })
    .from(boqItems)
    .where(eq(boqItems.id, itemId))
    .limit(1)
  if (!item) return { ok: false, error: "Item not found" }

  const [template] = await db
    .select({ workspaceId: boqTemplates.workspaceId, ownerId: boqTemplates.ownerId })
    .from(boqTemplates)
    .where(eq(boqTemplates.id, item.templateId))
    .limit(1)
  if (!template) return { ok: false, error: "Template not found" }

  // Workspace authorisation
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, template.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  const rows = await db
    .select({
      id: tenderItemEvents.id,
      itemId: tenderItemEvents.itemId,
      eventKind: tenderItemEvents.eventKind,
      sourceKind: tenderItemEvents.sourceKind,
      sourceId: tenderItemEvents.sourceId,
      payload: tenderItemEvents.payload,
      recordedAt: tenderItemEvents.recordedAt,
    })
    .from(tenderItemEvents)
    .where(eq(tenderItemEvents.itemId, itemId))

  rows.sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1))

  return {
    ok: true,
    events: rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      eventKind: r.eventKind,
      sourceKind: r.sourceKind,
      sourceId: r.sourceId,
      payload: r.payload,
      recordedAt:
        r.recordedAt instanceof Date
          ? r.recordedAt.toISOString()
          : String(r.recordedAt),
    })),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PTE — parse + validate against the project's empty BoQ.
// ─────────────────────────────────────────────────────────────────────────

interface PteParseResult {
  ok: true
  workbook: ParsedWorkbook
  documentFilename: string
  /** null when no empty-BoQ template exists yet for this project. */
  validation: PteValidationReport | null
}

/**
 * PTE-mode equivalent of parseBoqDocument. Returns the same workbook
 * payload the modal needs PLUS a validation report against the project's
 * already-imported empty BoQ. If no BoQ exists for the project, validation
 * is null and the modal just shows a "no BoQ to validate against" note.
 */
export async function parsePteDocument(
  documentId: string,
): Promise<PteParseResult | ParseError> {
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

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }

  const buffer = await fetchDocumentBuffer(doc.blobUrl)
  if (!buffer.ok) return { ok: false, error: buffer.error }

  let workbook: ParsedWorkbook
  try {
    workbook = parseBoqWorkbook(buffer.value)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse failed" }
  }

  // Find the project's empty-BoQ template (the one the user imported
  // earlier via the BoQ modal). We tell it apart from the PTE template by
  // checking the source document's category — the BoQ row uses category
  // "Blank BOQ / Pricing Schedule" while PTE uses "Pre-Tender Estimate".
  const boqRows = await db
    .select({
      templateId: boqTemplates.id,
      sourceDocumentId: boqTemplates.sourceDocumentId,
      docCategory: documents.category,
    })
    .from(boqTemplates)
    .leftJoin(documents, eq(documents.id, boqTemplates.sourceDocumentId))
    .where(
      and(
        eq(boqTemplates.workspaceId, doc.workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, doc.projectId),
      ),
    )
  const boqTemplate = boqRows.find(
    (r) => r.docCategory === "Blank BOQ / Pricing Schedule",
  )

  let validation: PteValidationReport | null = null
  if (boqTemplate) {
    const snapshot = await buildBoqSnapshot(boqTemplate.templateId)

    // Run extraction with the default auto-detected mapping so the
    // validator sees real items. The user can tweak in the modal — at
    // that point they'd re-run by clicking Import; the import-time
    // validation rerun guards against a tweak that breaks alignment.
    const defaultMappings: SheetMapping[] = workbook.sheets
      .filter((s) => !s.skipByDefault && s.headerRow !== null)
      .map((s) => ({
        name: s.name,
        included: true,
        headerRow: s.headerRow ?? 0,
        columnMap: s.columnMap,
        extraColumns: {},
      }))
    const { itemsBySheet } = extractLineItems(buffer.value, defaultMappings)
    validation = validatePteAgainstBoq(itemsBySheet, snapshot)
  }

  return {
    ok: true,
    workbook,
    documentFilename: doc.filename,
    validation,
  }
}

export interface ImportPteResult {
  ok: true
  templateId: string
  pricesetId: string
  sectionsCreated: number
  itemsCreated: number
  ratesCreated: number
  validation: PteValidationReport | null
}

/**
 * Import the user-confirmed PTE mapping. Writes:
 *   - a `boq_template` row tagged with sourceDocumentId = this PTE doc
 *   - one `boq_section` per included sheet
 *   - one `boq_item` per line item (same as BoQ flow)
 *   - one `boq_priceset` with ownerKind='estimate' linked to the template
 *   - one `boq_item_rate` per item with unit_rate_cents + amount_cents
 *
 * Idempotent: re-imports of the same PTE doc replace any prior data
 * via the (sourceDocumentId) scope.
 */
export async function importPteMapping(
  input: ImportBoqInput,
): Promise<ImportPteResult | ImportBoqError> {
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
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [project] = await db
    .select({ id: projects.id, workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(eq(projects.id, doc.projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }

  for (const s of input.sheets) {
    if (!s.included) continue
    const fields = new Set(Object.values(s.columnMap))
    if (!fields.has("itemRef") || !fields.has("description")) {
      return {
        ok: false,
        error: `Sheet '${s.name}' is included but is missing the Item and/or Description column mapping`,
      }
    }
  }

  const buffer = await fetchDocumentBuffer(doc.blobUrl)
  if (!buffer.ok) return { ok: false, error: buffer.error }

  const mappings: SheetMapping[] = input.sheets.map((s) => ({
    name: s.name,
    included: s.included,
    headerRow: s.headerRow,
    columnMap: s.columnMap,
    extraColumns: s.extraColumns,
  }))

  const { itemsBySheet, totalItems } = extractLineItems(buffer.value, mappings)
  if (totalItems === 0) {
    return {
      ok: false,
      error: "No line items found with the current mapping. Check the header row and column assignments.",
    }
  }

  // Validation against the project's empty BoQ template (if any).
  // Per the chosen "show warnings, allow override" mode we report the
  // outcome but don't block the import.
  const boqRows = await db
    .select({
      templateId: boqTemplates.id,
      docCategory: documents.category,
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
  const boqTemplate = boqRows.find(
    (r) => r.docCategory === "Blank BOQ / Pricing Schedule",
  )
  let validation: PteValidationReport | null = null
  if (boqTemplate) {
    const snapshot = await buildBoqSnapshot(boqTemplate.templateId)
    validation = validatePteAgainstBoq(itemsBySheet, snapshot)
  }

  // Drop any prior template that came from THIS document (idempotent
  // re-imports). Cascades down through section/item/priceset/rate.
  await db
    .delete(boqTemplates)
    .where(
      and(
        eq(boqTemplates.workspaceId, project.workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, project.id),
        eq(boqTemplates.sourceDocumentId, doc.id),
      ),
    )

  const [template] = await db
    .insert(boqTemplates)
    .values({
      workspaceId: project.workspaceId,
      name: input.templateName || `PTE — ${doc.filename}`,
      ownerKind: "project",
      ownerId: project.id,
      currency: input.currency,
      sourceDocumentId: doc.id,
      createdByUserId: userId,
    })
    .returning({ id: boqTemplates.id })
  if (!template) return { ok: false, error: "Failed to create BoQ template row" }

  // A priceset captures THIS PTE's prices over the template structure.
  const [priceset] = await db
    .insert(boqPricesets)
    .values({
      templateId: template.id,
      ownerKind: "estimate",
      ownerId: project.id,
      label: input.templateName || `PTE — ${doc.filename}`,
      currency: input.currency,
    })
    .returning({ id: boqPricesets.id })
  if (!priceset) return { ok: false, error: "Failed to create priceset row" }

  // Pre-load existing BoQ entities for matching. We try to LINK the
  // PTE's per-row prices onto the same entity that the empty BoQ
  // created — so cross-document analyses (tenderer compare, addenda)
  // can pivot by entity id, not by template id.
  const candidates: EntityCandidate[] = boqTemplate
    ? await loadEntityCandidates(boqTemplate.templateId)
    : []
  // Pull the full BoQ rows (qty + description) for the matched entities
  // so we can detect WHAT changed between the empty BoQ and the PTE.
  // Each diff lands as a separate event (quantity_changed,
  // description_changed, unit_changed) attributed to source_kind='pte_import'.
  const boqRowMap = new Map<
    string,
    { quantityPlanned: string | null; label: string; unit: string | null }
  >()
  if (boqTemplate && candidates.length > 0) {
    const boqItemRows = await db
      .select({
        id: boqItems.id,
        quantityPlanned: boqItems.quantityPlanned,
        label: boqItems.label,
        unit: boqItems.unit,
      })
      .from(boqItems)
      .where(eq(boqItems.templateId, boqTemplate.templateId))
    for (const r of boqItemRows) {
      boqRowMap.set(r.id, {
        quantityPlanned:
          r.quantityPlanned !== null && r.quantityPlanned !== undefined
            ? String(r.quantityPlanned)
            : null,
        label: r.label,
        unit: r.unit,
      })
    }
  }

  let sectionsCreated = 0
  let itemsCreated = 0
  let ratesCreated = 0
  let linkedToBoq = 0
  let sectionPosition = 0
  const noSeen = new Set<string>()

  for (const sheetCfg of mappings) {
    if (!sheetCfg.included) continue
    const items = itemsBySheet[sheetCfg.name] ?? []
    if (items.length === 0) continue

    const [section] = await db
      .insert(boqSections)
      .values({
        templateId: template.id,
        position: sectionPosition++,
        no: sheetCfg.name,
        label: sheetCfg.name,
        pricingMode:
          /gen\s*req|general\s*req|preamble/i.test(sheetCfg.name)
            ? "general_req"
            : "measured",
      })
      .returning({ id: boqSections.id })
    if (!section) continue
    sectionsCreated += 1

    // Build the per-row plan: each row either LINKS to an existing
    // entity (we record events against the BoQ's `boq_item.id`) or
    // CREATES a new entity scoped to the PTE template.
    interface RowPlan {
      no: string
      label: string
      unit: string | null
      quantity: string | null
      rateCents: bigint | null
      amountCents: bigint | null
      // either link OR create
      linkedItemId: string | null
      createId: string | null
      createEventId: string | null
    }
    const rowPlans: RowPlan[] = items.map((it) => {
      let no = `${sheetCfg.name}/${it.itemRef}`
      if (noSeen.has(no)) no = `${no}#${it.sourceRow}`
      noSeen.add(no)
      const match = matchEntity(
        {
          sectionNo: sheetCfg.name,
          itemLetter: it.itemRef,
          description: it.description,
          unit: it.unit,
        },
        candidates,
      )
      if (match) {
        return {
          no,
          label: it.description,
          unit: it.unit,
          quantity: it.quantity,
          rateCents: it.rateCents,
          amountCents: it.amountCents,
          linkedItemId: match.id,
          createId: null,
          createEventId: null,
        }
      }
      return {
        no,
        label: it.description,
        unit: it.unit,
        quantity: it.quantity,
        rateCents: it.rateCents,
        amountCents: it.amountCents,
        linkedItemId: null,
        createId: crypto.randomUUID(),
        createEventId: crypto.randomUUID(),
      }
    })

    // 1. Insert the NEW entities (boq_items + their `created` events).
    const newRows = rowPlans.filter((r) => r.createId !== null)
    if (newRows.length > 0) {
      const itemRows = newRows.map((r) => ({
        id: r.createId!,
        templateId: template.id,
        sectionId: section.id,
        no: r.no,
        label: r.label,
        unit: r.unit,
        quantityPlanned: r.quantity,
        entityOriginEventId: r.createEventId!,
      }))
      for (let i = 0; i < itemRows.length; i += 500) {
        await db.insert(boqItems).values(itemRows.slice(i, i + 500))
      }
      const eventRows = newRows.map((r) => ({
        id: r.createEventId!,
        projectId: project.id,
        itemId: r.createId!,
        eventKind: "created" as const,
        sourceKind: "pte_import" as TenderEventSourceKind,
        sourceId: template.id,
        payload: { templateId: template.id, sheet: sheetCfg.name },
        recordedByUserId: userId,
      }))
      await recordEvents(eventRows)
    }
    itemsCreated += rowPlans.length

    // 2. Record a `priced` event for EVERY row that carries a rate.
    //    PLUS, for rows that LINKED to a pre-existing BoQ entity, emit
    //    diff events whenever the PTE's qty / description / unit
    //    differ from the BoQ's. This is the "first wave of changes"
    //    between empty BoQ and PTE that would otherwise vanish.
    const pricedEvents: Parameters<typeof recordEvents>[0] = []
    for (const r of rowPlans) {
      const itemId = r.linkedItemId ?? r.createId!
      if (r.linkedItemId) {
        linkedToBoq += 1
        const boqRow = boqRowMap.get(r.linkedItemId)
        if (boqRow) {
          if (
            r.quantity !== null &&
            boqRow.quantityPlanned !== null &&
            normaliseNumeric(r.quantity) !==
              normaliseNumeric(boqRow.quantityPlanned)
          ) {
            pricedEvents.push({
              projectId: project.id,
              itemId,
              eventKind: "quantity_changed" as const,
              sourceKind: "pte_import" as TenderEventSourceKind,
              sourceId: priceset.id,
              payload: { old: boqRow.quantityPlanned, new: r.quantity },
              recordedByUserId: userId,
            })
          }
          if (r.label !== boqRow.label) {
            pricedEvents.push({
              projectId: project.id,
              itemId,
              eventKind: "description_changed" as const,
              sourceKind: "pte_import" as TenderEventSourceKind,
              sourceId: priceset.id,
              payload: { old: boqRow.label, new: r.label },
              recordedByUserId: userId,
            })
          }
          if (
            r.unit !== null &&
            boqRow.unit !== null &&
            r.unit !== boqRow.unit
          ) {
            pricedEvents.push({
              projectId: project.id,
              itemId,
              eventKind: "unit_changed" as const,
              sourceKind: "pte_import" as TenderEventSourceKind,
              sourceId: priceset.id,
              payload: { old: boqRow.unit, new: r.unit },
              recordedByUserId: userId,
            })
          }
        }
      }
      if (r.rateCents !== null || r.amountCents !== null) {
        pricedEvents.push({
          projectId: project.id,
          itemId,
          eventKind: "priced" as const,
          sourceKind: "pte_import" as TenderEventSourceKind,
          sourceId: priceset.id,
          payload: {
            rate_cents: r.rateCents?.toString() ?? null,
            amount_cents: r.amountCents?.toString() ?? null,
            currency: input.currency,
            sheet: sheetCfg.name,
            pte_no: r.no,
          },
          recordedByUserId: userId,
        })
      }
    }
    if (pricedEvents.length > 0) await recordEvents(pricedEvents)

    // 3. Insert into boq_item_rate so the existing PTE viewer keeps
    //    working. Rate references the canonical entity id.
    const rateValues = rowPlans
      .filter((r) => r.rateCents !== null || r.amountCents !== null)
      .map((r) => ({
        pricesetId: priceset.id,
        itemId: r.linkedItemId ?? r.createId!,
        unitRateCents: r.rateCents,
        amountCents: r.amountCents,
      }))
    for (let i = 0; i < rateValues.length; i += 500) {
      await db.insert(boqItemRates).values(rateValues.slice(i, i + 500))
    }
    ratesCreated += rateValues.length
  }

  await recordAudit({
    workspaceId: project.workspaceId,
    projectId: project.id,
    actorUserId: userId,
    actorKind: "user",
    action: "pte.import",
    targetKind: "document",
    targetId: doc.id,
    payload: {
      templateId: template.id,
      pricesetId: priceset.id,
      sectionsCreated,
      itemsCreated,
      ratesCreated,
      validationScore: validation?.overallScore,
      validationVerdict: validation?.verdict,
    },
  })

  await db
    .update(documents)
    .set({ status: "scanned" })
    .where(eq(documents.id, doc.id))

  return {
    ok: true,
    templateId: template.id,
    pricesetId: priceset.id,
    sectionsCreated,
    itemsCreated,
    ratesCreated,
    validation,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers (private)
// ─────────────────────────────────────────────────────────────────────────

/** Normalise numeric strings for equality — "42268" vs "42,268.00" should
 *  compare as equal even though the strings differ. Returns null for
 *  unparseable input. */
function normaliseNumeric(s: string | null): string | null {
  if (s === null) return null
  const cleaned = s.replace(/,/g, "").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return n.toString()
}

/** Load every item under a BoQ template as an EntityCandidate so the
 *  matcher can pick which existing entity an incoming row links to. */
async function loadEntityCandidates(
  templateId: string,
): Promise<EntityCandidate[]> {
  const rows = await db
    .select({
      id: boqItems.id,
      no: boqItems.no,
      label: boqItems.label,
      unit: boqItems.unit,
      sectionNo: boqSections.no,
    })
    .from(boqItems)
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
    .where(eq(boqItems.templateId, templateId))
  return rows.map((r) => ({
    id: r.id,
    sectionNo: r.sectionNo,
    itemLetter: r.no.slice(r.no.lastIndexOf("/") + 1),
    description: r.label,
    unit: r.unit,
  }))
}

async function buildBoqSnapshot(templateId: string): Promise<BoqStructureSnapshot> {
  const sectionRows = await db
    .select({ id: boqSections.id, no: boqSections.no })
    .from(boqSections)
    .where(eq(boqSections.templateId, templateId))
    .orderBy(boqSections.position)

  const itemRows = await db
    .select({
      sectionId: boqItems.sectionId,
      no: boqItems.no,
      label: boqItems.label,
    })
    .from(boqItems)
    .where(eq(boqItems.templateId, templateId))

  const itemsBySection = new Map<string, Array<{ no: string; label: string }>>()
  for (const r of itemRows) {
    const list = itemsBySection.get(r.sectionId) ?? []
    list.push({ no: r.no, label: r.label })
    itemsBySection.set(r.sectionId, list)
  }
  return {
    sections: sectionRows.map((s) => ({
      no: s.no,
      items: itemsBySection.get(s.id) ?? [],
    })),
  }
}

async function fetchDocumentBuffer(
  blobUrl: string,
): Promise<{ ok: true; value: Buffer } | { ok: false; error: string }> {
  try {
    if (blobUrl.startsWith("file://")) {
      const { readFile } = await import("node:fs/promises")
      const localPath = blobUrl.replace(/^file:\/\//, "")
      const value = await readFile(localPath)
      return { ok: true, value }
    }
    const res = await fetch(blobUrl)
    if (!res.ok) return { ok: false, error: `Blob fetch ${res.status}` }
    const value = Buffer.from(await res.arrayBuffer())
    return { ok: true, value }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Could not read uploaded file: ${msg}` }
  }
}
