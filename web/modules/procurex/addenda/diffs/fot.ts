import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import type { Fot } from "@/modules/ai-extraction/specs/fot"

import { recordEvents } from "@/modules/procurex/boq/events"
import type { TenderEventSourceKind } from "@/modules/procurex/boq/events-schema"

import { diffJsonbObject, diffScalar } from "./scalar"
import type { ProposedFieldEvent, SpecDiffer } from "./types"

/**
 * FOT differ.
 *
 * Persistor sets: projects.currency, projects.requiredValidityDays.
 * Other FOT fields (timesForCompletion, ohpMarkups, signatures…) live
 * in the workflow_run output but aren't persisted as columns yet — when
 * we add columns for them, just append to the walker below and the
 * differ picks them up.
 */
export const fotDiffer: SpecDiffer<Fot> = {
  async loadCurrent(projectId: string): Promise<Partial<Fot>> {
    const [row] = await db
      .select({
        currency: projects.currency,
        requiredValidityDays: projects.requiredValidityDays,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
    if (!row) return {}
    return {
      currency: row.currency ?? undefined,
      validityDays: row.requiredValidityDays ?? undefined,
    }
  },

  diff(current, next): ProposedFieldEvent[] {
    const events: ProposedFieldEvent[] = []
    const ctx = { spec: "fot", events }

    diffScalar({
      ...ctx,
      field: "currency",
      label: "Currency",
      current: current.currency,
      next: next.currency,
    })
    diffScalar({
      ...ctx,
      field: "validityDays",
      label: "Tender validity (days)",
      current: current.validityDays,
      next: next.validityDays,
    })
    // OHP markups live in an object — diff each sub-key
    diffJsonbObject({
      ...ctx,
      field: "ohpMarkups",
      label: "OH&P markups",
      current: (current.ohpMarkups ?? null) as Record<string, unknown> | null,
      next: (next.ohpMarkups ?? null) as Record<string, unknown> | null,
    })
    return events
  },

  async applyEvents(projectId, events, addendumId, userId) {
    // 1. Mutate the project columns in place.
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    for (const ev of events) {
      const ref = ev.targetRef as { spec: string; field: string }
      if (ref.spec !== "fot") continue
      const nextVal = ev.payload.new
      switch (ref.field) {
        case "currency":
          patch.currency = nextVal ?? null
          break
        case "validityDays":
          patch.requiredValidityDays =
            typeof nextVal === "number" ? nextVal : null
          break
        // ohpMarkups sub-keys — when project columns exist for them,
        // wire here. For now, they're not persisted as columns, so we
        // emit the event but skip the in-place update.
      }
    }
    if (Object.keys(patch).length > 1) {
      await db.update(projects).set(patch).where(eq(projects.id, projectId))
    }

    // 2. Append events to the log so the history is preserved.
    const rows = events.map((ev) => ({
      projectId,
      itemId: null,
      targetKind: ev.targetKind,
      targetRef: ev.targetRef,
      eventKind: mapToEventKind(ev.eventKind),
      sourceKind: "addendum" as TenderEventSourceKind,
      sourceId: addendumId,
      payload: ev.payload,
      recordedByUserId: userId,
    }))
    if (rows.length > 0) await recordEvents(rows)
  },
}

/** Map our coarser event kinds to the schema enum. */
function mapToEventKind(
  k: ProposedFieldEvent["eventKind"],
):
  | "created"
  | "quantity_changed"
  | "description_changed"
  | "unit_changed"
  | "priced"
  | "withdrawn"
  | "note" {
  switch (k) {
    case "field_added":
    case "row_added":
      return "created"
    case "field_removed":
    case "row_removed":
      return "withdrawn"
    case "field_changed":
    case "row_changed":
    default:
      // Generic "description_changed" is the closest fit for arbitrary
      // field changes; the payload's `label` carries the specifics.
      return "description_changed"
  }
}
