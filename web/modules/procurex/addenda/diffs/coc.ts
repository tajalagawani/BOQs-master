import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import type { Coc } from "@/modules/ai-extraction/specs/coc"

import { recordEvents } from "@/modules/procurex/boq/events"
import type { TenderEventSourceKind } from "@/modules/procurex/boq/events-schema"

import { diffJsonbObject, diffScalar } from "./scalar"
import type { ProposedFieldEvent, SpecDiffer } from "./types"

/** Columns the COC persistor writes — see _persistors.ts for the
 *  source of truth. Adding a new COC field means appending here AND
 *  to the loadCurrent select; the diff + apply pick it up automatically. */
const COC_COLUMN_FIELDS = [
  { col: "contractFormCode", verdict: "contractFormCode", label: "Contract form code" },
  { col: "contractForm", verdict: "contractForm", label: "Contract form" },
  { col: "contractFormVersion", verdict: "contractFormVersion", label: "Contract form version" },
  { col: "contractSumCents", verdict: "contractSumCents", label: "Contract sum (cents)" },
  { col: "engineerName", verdict: "engineerName", label: "Engineer name" },
  { col: "governingLaw", verdict: "governingLaw", label: "Governing law" },
  { col: "disputeForum", verdict: "disputeForum", label: "Dispute forum" },
  { col: "language", verdict: "language", label: "Language" },
  { col: "advancePaymentPercent", verdict: "advancePaymentPercent", label: "Advance payment %" },
  { col: "advancePaymentBondPercent", verdict: "advancePaymentBondPercent", label: "Advance payment bond %" },
  { col: "performanceBondPercent", verdict: "performanceBondPercent", label: "Performance bond %" },
  { col: "retentionPercent", verdict: "retentionPercent", label: "Retention %" },
  { col: "retentionCapCents", verdict: "retentionCapCents", label: "Retention cap (cents)" },
  { col: "retentionCapPercent", verdict: "retentionCapPercent", label: "Retention cap %" },
  { col: "ldPerDayCents", verdict: "ldPerDayCents", label: "LD per day (cents)" },
  { col: "ldCapCents", verdict: "ldCapCents", label: "LD cap (cents)" },
  { col: "ldCapPercent", verdict: "ldCapPercent", label: "LD cap %" },
  { col: "dlpMonths", verdict: "dlpMonths", label: "DLP (months)" },
  { col: "decennialLiabilityYears", verdict: "decennialLiabilityYears", label: "Decennial liability (years)" },
  { col: "fixedPrice", verdict: "fixedPrice", label: "Fixed price" },
] as const

export const cocDiffer: SpecDiffer<Coc> = {
  async loadCurrent(projectId: string): Promise<Partial<Coc>> {
    const [row] = await db
      .select({
        contractFormCode: projects.contractFormCode,
        contractForm: projects.contractForm,
        contractFormVersion: projects.contractFormVersion,
        contractSumCents: projects.contractSumCents,
        engineerName: projects.engineerName,
        governingLaw: projects.governingLaw,
        disputeForum: projects.disputeForum,
        language: projects.language,
        advancePaymentPercent: projects.advancePaymentPercent,
        advancePaymentBondPercent: projects.advancePaymentBondPercent,
        performanceBondPercent: projects.performanceBondPercent,
        retentionPercent: projects.retentionPercent,
        retentionCapCents: projects.retentionCapCents,
        retentionCapPercent: projects.retentionCapPercent,
        ldPerDayCents: projects.ldPerDayCents,
        ldCapCents: projects.ldCapCents,
        ldCapPercent: projects.ldCapPercent,
        dlpMonths: projects.dlpMonths,
        decennialLiabilityYears: projects.decennialLiabilityYears,
        fixedPrice: projects.fixedPrice,
        insuranceMinimums: projects.insuranceMinimums,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
    if (!row) return {}
    // Drizzle returns nulls; we want undefineds for the diff.
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = v ?? undefined
    }
    return out as Partial<Coc>
  },

  diff(current, next): ProposedFieldEvent[] {
    const events: ProposedFieldEvent[] = []
    const cur = current as Record<string, unknown>
    const nxt = next as unknown as Record<string, unknown>
    for (const f of COC_COLUMN_FIELDS) {
      diffScalar({
        spec: "coc",
        field: f.col,
        label: f.label,
        current: cur[f.verdict],
        next: nxt[f.verdict],
        events,
      })
    }
    // Insurance minimums is a jsonb sub-object
    const curIns = cur.insuranceMinimums as Record<string, unknown> | null | undefined
    // The verdict shape uses three separate fields; reconstruct the
    // same nested object the persistor builds.
    const nxtIns: Record<string, unknown> = {}
    if (nxt.insuranceMachineryAllRisksMinCents != null)
      nxtIns.machineryAllRisksMinCents = String(nxt.insuranceMachineryAllRisksMinCents)
    if (nxt.insuranceWorkmensCompMinCents != null)
      nxtIns.workmensCompMinCents = String(nxt.insuranceWorkmensCompMinCents)
    if (nxt.insuranceContractorAllRiskMinCents != null)
      nxtIns.contractorAllRiskMinCents = String(nxt.insuranceContractorAllRiskMinCents)
    if (Object.keys(nxtIns).length > 0 || curIns) {
      diffJsonbObject({
        spec: "coc",
        field: "insuranceMinimums",
        label: "Insurance minimums",
        current: curIns ?? null,
        next: nxtIns,
        events,
      })
    }
    return events
  },

  async applyEvents(projectId, events, addendumId, userId) {
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    const insurancePatch: Record<string, unknown> = {}
    for (const ev of events) {
      const ref = ev.targetRef as { spec: string; field: string }
      if (ref.spec !== "coc") continue
      if (ref.field.startsWith("insuranceMinimums.")) {
        const subKey = ref.field.slice("insuranceMinimums.".length)
        insurancePatch[subKey] = ev.payload.new
        continue
      }
      patch[ref.field] = ev.payload.new ?? null
    }
    if (Object.keys(insurancePatch).length > 0) {
      patch.insuranceMinimums = insurancePatch
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
