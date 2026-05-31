import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import type { Itt } from "@/modules/ai-extraction/specs/itt"

import { recordEvents } from "@/modules/procurex/boq/events"
import type { TenderEventSourceKind } from "@/modules/procurex/boq/events-schema"

import { diffScalar } from "./scalar"
import type { ProposedFieldEvent, SpecDiffer } from "./types"

/** Fields the ITT persistor sets on the project row. Keeping the
 *  mapping in one constant means adding a new ITT column requires a
 *  single touch — the diff + apply both pick it up. */
const ITT_COLUMN_FIELDS = [
  { col: "currency", verdict: "currency", label: "Currency" },
  { col: "requiredValidityDays", verdict: "requiredValidityDays", label: "Tender validity (days)" },
  { col: "ittAddendaCutoffDays", verdict: "addendaCutoffDays", label: "Addenda cutoff (days)" },
  { col: "ittClarificationCutoffDays", verdict: "clarificationCutoffDays", label: "Clarification cutoff (days)" },
  { col: "vatTreatment", verdict: "vatTreatment", label: "VAT treatment" },
  { col: "language", verdict: "language", label: "Language" },
  { col: "alternativeTenderAllowed", verdict: "alternativeTenderAllowed", label: "Alternative tender allowed" },
  { col: "reraTrustAccountRequired", verdict: "reraTrustAccountRequired", label: "RERA trust account required" },
  { col: "performanceBondRequired", verdict: "bondsPerformanceRequired", label: "Performance bond required" },
  { col: "engineerName", verdict: "engineerName", label: "Engineer name" },
] as const

export const ittDiffer: SpecDiffer<Itt> = {
  async loadCurrent(projectId: string): Promise<Partial<Itt>> {
    const [row] = await db
      .select({
        currency: projects.currency,
        requiredValidityDays: projects.requiredValidityDays,
        ittAddendaCutoffDays: projects.ittAddendaCutoffDays,
        ittClarificationCutoffDays: projects.ittClarificationCutoffDays,
        vatTreatment: projects.vatTreatment,
        language: projects.language,
        alternativeTenderAllowed: projects.alternativeTenderAllowed,
        reraTrustAccountRequired: projects.reraTrustAccountRequired,
        performanceBondRequired: projects.performanceBondRequired,
        engineerName: projects.engineerName,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
    if (!row) return {}
    return {
      currency: row.currency ?? undefined,
      requiredValidityDays: row.requiredValidityDays ?? undefined,
      addendaCutoffDays: row.ittAddendaCutoffDays ?? undefined,
      clarificationCutoffDays: row.ittClarificationCutoffDays ?? undefined,
      vatTreatment: row.vatTreatment ?? undefined,
      language: row.language ?? undefined,
      alternativeTenderAllowed: row.alternativeTenderAllowed ?? undefined,
      reraTrustAccountRequired: row.reraTrustAccountRequired ?? undefined,
      bondsPerformanceRequired: row.performanceBondRequired ?? undefined,
      engineerName: row.engineerName ?? undefined,
    } as Partial<Itt>
  },

  diff(current, next): ProposedFieldEvent[] {
    const events: ProposedFieldEvent[] = []
    const cur = current as Record<string, unknown>
    const nxt = next as unknown as Record<string, unknown>
    for (const f of ITT_COLUMN_FIELDS) {
      diffScalar({
        spec: "itt",
        field: f.col,
        label: f.label,
        current: cur[f.verdict],
        next: nxt[f.verdict],
        events,
      })
    }
    return events
  },

  async applyEvents(projectId, events, addendumId, userId) {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    for (const ev of events) {
      const ref = ev.targetRef as { spec: string; field: string }
      if (ref.spec !== "itt") continue
      patch[ref.field] = ev.payload.new ?? null
    }
    if (Object.keys(patch).length > 1) {
      await db.update(projects).set(patch).where(eq(projects.id, projectId))
    }
    const rows = events.map((ev) => ({
      projectId,
      itemId: null,
      targetKind: ev.targetKind,
      targetRef: ev.targetRef,
      eventKind: "description_changed" as const,
      sourceKind: "addendum" as TenderEventSourceKind,
      sourceId: addendumId,
      payload: ev.payload,
      recordedByUserId: userId,
    }))
    if (rows.length > 0) await recordEvents(rows)
  },
}
