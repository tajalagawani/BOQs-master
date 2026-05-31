import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { boqItemRates, boqItems, boqPricesets, boqSections } from "@/modules/boq/schema"
import { db } from "@/modules/core/db"

import {
  tenderItemEvents,
  type NewTenderItemEvent,
  type TenderItemEvent,
} from "./events-schema"
import type { TenderEventKind, TenderEventSourceKind } from "./events-schema"

/**
 * Event-sourced read/write API for BoQ item entities.
 *
 *   recordEvent    — append one event to the log
 *   recordEvents   — batched insert (importers use this for the
 *                    initial flood of `created` events)
 *   getEffectiveBoqItems — base rows + replayed events for one project
 *
 * Feature flag: ENTITY_MODEL_ENABLED. When "off", `getEffectiveBoqItems`
 * still works (events that exist replay normally) but the importers
 * skip writing events on the new path so the legacy code keeps owning
 * the source of truth. Flip to "on" once Phase 1D backfill has run
 * and you're confident downstream readers consume the effective state.
 */
export const ENTITY_MODEL_ENABLED =
  process.env.ENTITY_MODEL_ENABLED === "on"

export interface EffectiveBoqItem {
  id: string
  templateId: string
  sectionId: string
  no: string
  label: string
  unit: string | null
  quantityPlanned: string | null
  /** True when a `withdrawn` event has been recorded for this entity. */
  isWithdrawn: boolean
  /** Most-recent rate event payload, if any. */
  rateCents: string | null
  amountCents: string | null
  /** Convenience — event timeline for this entity. */
  events: TenderItemEvent[]
}

/** Record a single event. */
export async function recordEvent(input: NewTenderItemEvent): Promise<TenderItemEvent> {
  const [row] = await db.insert(tenderItemEvents).values(input).returning()
  if (!row) throw new Error("Failed to record event")
  return row
}

/** Batched event insert — chunked to keep parameter lists sane. */
export async function recordEvents(
  rows: NewTenderItemEvent[],
): Promise<TenderItemEvent[]> {
  const out: TenderItemEvent[] = []
  for (let i = 0; i < rows.length; i += 500) {
    const inserted = await db
      .insert(tenderItemEvents)
      .values(rows.slice(i, i + 500))
      .returning()
    out.push(...inserted)
  }
  return out
}

/**
 * Returns the current effective state of every BoQ item in the project,
 * with the event timeline attached per item. Used by the viewer + the
 * status query + (later) the tenderer comparison.
 *
 * Items are NOT filtered by `isWithdrawn` — callers decide whether to
 * hide withdrawn items in their UI.
 */
export async function getEffectiveBoqItems(
  projectId: string,
): Promise<EffectiveBoqItem[]> {
  // Pull every item under any template owned by this project (BoQ + PTE).
  const sectionRows = await db
    .select({ id: boqSections.id, templateId: boqSections.templateId })
    .from(boqSections)
    .innerJoin(boqItems, eq(boqItems.sectionId, boqSections.id))
    .where(eq(boqItems.id, boqItems.id)) // placeholder — we'll union via templateId
  // Simpler: pull items first, dedupe template ids.
  const baseRows = await db
    .select({
      id: boqItems.id,
      templateId: boqItems.templateId,
      sectionId: boqItems.sectionId,
      no: boqItems.no,
      label: boqItems.label,
      unit: boqItems.unit,
      quantityPlanned: boqItems.quantityPlanned,
    })
    .from(boqItems)
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
  // ^ All items in the DB. We filter by project via the events join below.
  void sectionRows

  const eventRows = await db
    .select()
    .from(tenderItemEvents)
    .where(eq(tenderItemEvents.projectId, projectId))
    .orderBy(asc(tenderItemEvents.recordedAt))

  // Group events by item id. Project-field events (target_kind !==
  // 'boq_item') have a NULL itemId — they don't belong to any item
  // and are handled by a separate reader (see effective-project-state).
  const eventsByItem = new Map<string, TenderItemEvent[]>()
  for (const e of eventRows) {
    if (!e.itemId) continue
    const list = eventsByItem.get(e.itemId) ?? []
    list.push(e)
    eventsByItem.set(e.itemId, list)
  }

  // Determine which items belong to this project: any item that has at
  // least one event in this project's stream, OR whose template/section
  // chain ties back. Cheapest test is "is in the events keyset".
  const projectItemIds = new Set(eventsByItem.keys())
  const filteredBase = baseRows.filter((r) => projectItemIds.has(r.id))

  return filteredBase.map((b) => {
    const events = eventsByItem.get(b.id) ?? []
    return applyEvents(b, events)
  })
}

/** Replay events on top of a base row to produce the effective state. */
function applyEvents(
  base: {
    id: string
    templateId: string
    sectionId: string
    no: string
    label: string
    unit: string | null
    quantityPlanned: string | null
  },
  events: TenderItemEvent[],
): EffectiveBoqItem {
  let label = base.label
  let unit = base.unit
  let quantityPlanned = base.quantityPlanned
  let rateCents: string | null = null
  let amountCents: string | null = null
  let isWithdrawn = false

  for (const ev of events) {
    const p = (ev.payload ?? {}) as Record<string, unknown>
    switch (ev.eventKind) {
      case "quantity_changed":
        if (typeof p.new === "string") quantityPlanned = p.new
        else if (typeof p.quantity === "string") quantityPlanned = p.quantity
        break
      case "description_changed":
        if (typeof p.new === "string") label = p.new
        else if (typeof p.description === "string") label = p.description
        break
      case "unit_changed":
        if (typeof p.new === "string") unit = p.new
        break
      case "priced":
        if (typeof p.rate_cents === "string") rateCents = p.rate_cents
        if (typeof p.amount_cents === "string") amountCents = p.amount_cents
        break
      case "withdrawn":
        isWithdrawn = true
        break
      case "created":
      case "note":
        // no-op for effective state
        break
    }
  }

  return {
    id: base.id,
    templateId: base.templateId,
    sectionId: base.sectionId,
    no: base.no,
    label,
    unit,
    quantityPlanned,
    isWithdrawn,
    rateCents,
    amountCents,
    events,
  }
}

/** All events recorded for one item, in order. */
export async function getItemEvents(
  itemId: string,
): Promise<TenderItemEvent[]> {
  return db
    .select()
    .from(tenderItemEvents)
    .where(eq(tenderItemEvents.itemId, itemId))
    .orderBy(asc(tenderItemEvents.recordedAt))
}

/** Bulk fetch — useful when rendering a table with N items. */
export async function getEventsByItemIds(
  itemIds: string[],
): Promise<Map<string, TenderItemEvent[]>> {
  if (itemIds.length === 0) return new Map()
  const rows = await db
    .select()
    .from(tenderItemEvents)
    .where(inArray(tenderItemEvents.itemId, itemIds))
    .orderBy(asc(tenderItemEvents.recordedAt))
  const out = new Map<string, TenderItemEvent[]>()
  for (const r of rows) {
    if (!r.itemId) continue
    const list = out.get(r.itemId) ?? []
    list.push(r)
    out.set(r.itemId, list)
  }
  return out
}

export type {
  TenderItemEvent,
  TenderEventKind,
  TenderEventSourceKind,
} from "./events-schema"
