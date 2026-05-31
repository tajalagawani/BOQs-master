"use server"

import { and, desc, eq, inArray } from "drizzle-orm"

import { boqItems, boqSections, boqTemplates } from "@/modules/boq/schema"
import { db } from "@/modules/core/db"
import { tenderItemEvents } from "@/modules/procurex/boq/events-schema"
import { documents } from "@/modules/documents/schema"
import { projects } from "@/modules/procurex/projects/schema"

/**
 * Project-wide BoQ change events — descriptions + quantities updated
 * by addenda. These are NOT per-bidder (each event applies to the
 * project's BoQ template); they tell the QS what the project's own
 * BoQ has changed since first issue, which feeds the Appendix C
 * "BOQ description changes" + "Quantity changes" tables.
 */

export interface BoqChangeRow {
  id: string
  itemRef: string
  itemLabel: string
  sectionLabel: string
  /** Previous value (text for descriptions, number-as-string for qty). */
  oldValue: string | null
  /** New value after the change. */
  newValue: string | null
  /** Where the change came from — addendum / manual / import. */
  source: string
  /** Source label (e.g. addendum name). Best-effort: addendum
   *  filename when we can resolve it, else "—". */
  sourceLabel: string | null
  effectiveAt: string
}

export interface BoqChangeEvents {
  descriptionChanges: BoqChangeRow[]
  quantityChanges: BoqChangeRow[]
}

export async function getBoqChangeEvents(
  projectId: string,
): Promise<BoqChangeEvents | null> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return null

  const rows = await db
    .select({
      id: tenderItemEvents.id,
      eventKind: tenderItemEvents.eventKind,
      sourceKind: tenderItemEvents.sourceKind,
      sourceId: tenderItemEvents.sourceId,
      payload: tenderItemEvents.payload,
      effectiveAt: tenderItemEvents.effectiveAt,
      itemId: tenderItemEvents.itemId,
      itemNo: boqItems.no,
      itemLabel: boqItems.label,
      sectionLabel: boqSections.label,
      templateId: boqItems.templateId,
    })
    .from(tenderItemEvents)
    .innerJoin(boqItems, eq(boqItems.id, tenderItemEvents.itemId))
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
    .innerJoin(boqTemplates, eq(boqTemplates.id, boqItems.templateId))
    .where(
      and(
        eq(tenderItemEvents.projectId, projectId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, projectId),
        inArray(tenderItemEvents.eventKind, [
          "description_changed",
          "quantity_changed",
        ]),
      ),
    )
    .orderBy(desc(tenderItemEvents.effectiveAt))

  // Resolve source labels for documented addenda. We bulk-fetch
  // documents whose ids match the events' sourceIds (when the source
  // is `boq_import` / `addendum`); silent fallback to "—".
  const sourceIds = Array.from(
    new Set(rows.map((r) => r.sourceId).filter((x): x is string => !!x)),
  )
  const sourceDocs =
    sourceIds.length > 0
      ? await db
          .select({ id: documents.id, filename: documents.filename })
          .from(documents)
          .where(inArray(documents.id, sourceIds))
      : []
  const docNameById = new Map(sourceDocs.map((d) => [d.id, d.filename]))

  const descriptionChanges: BoqChangeRow[] = []
  const quantityChanges: BoqChangeRow[] = []

  for (const r of rows) {
    const payload = (r.payload ?? {}) as Record<string, unknown>
    const oldValue =
      typeof payload.old === "string" || typeof payload.old === "number"
        ? String(payload.old)
        : null
    const newValue =
      typeof payload.new === "string" || typeof payload.new === "number"
        ? String(payload.new)
        : null
    const sourceLabel =
      (r.sourceId && docNameById.get(r.sourceId)) ||
      humaniseSourceKind(r.sourceKind)
    const row: BoqChangeRow = {
      id: r.id,
      itemRef: r.itemNo,
      itemLabel: r.itemLabel,
      sectionLabel: r.sectionLabel,
      oldValue,
      newValue,
      source: r.sourceKind,
      sourceLabel,
      effectiveAt: r.effectiveAt.toISOString(),
    }
    if (r.eventKind === "description_changed") descriptionChanges.push(row)
    else if (r.eventKind === "quantity_changed") quantityChanges.push(row)
  }

  return { descriptionChanges, quantityChanges }
}

function humaniseSourceKind(kind: string): string {
  switch (kind) {
    case "boq_import":
      return "BoQ import"
    case "pte_import":
      return "PTE import"
    case "addendum":
      return "Addendum"
    case "manual":
      return "Manual"
    default:
      return kind
  }
}
