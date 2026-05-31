import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import type { Sopr } from "@/modules/ai-extraction/specs/sopr"

import { recordEvents } from "@/modules/procurex/boq/events"
import type { TenderEventSourceKind } from "@/modules/procurex/boq/events-schema"

import { diffJsonbObject, diffScalar } from "./scalar"
import type { ProposedFieldEvent, SpecDiffer } from "./types"

/**
 * SOPR differ — covers the scalar + jsonb columns the persistor writes.
 *
 * NOTE: SOPR child tables (project_phases, responsibility_matrix_rows,
 * compliance_record_templates) are intentionally NOT diffed in this
 * MVP. The persistor today wipes + re-inserts on every save, so we
 * have no stable child-row identity to diff against. A follow-up
 * needs row-level entity matching (similar to the BoQ matcher) before
 * we can surface row-level events for these tables.
 *
 * For now, scalar/jsonb changes (working hours, site conditions, BIM,
 * EV, sustainability) are fully diffed.
 */
export const soprDiffer: SpecDiffer<Sopr> = {
  async loadCurrent(projectId: string): Promise<Partial<Sopr>> {
    const [row] = await db
      .select({
        workingHours: projects.workingHours,
        siteConditions: projects.siteConditions,
        bimRequirements: projects.bimRequirements,
        earnedValueConfig: projects.earnedValueConfig,
        sustainabilityConfig: projects.sustainabilityConfig,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
    if (!row) return {}
    // Re-flatten jsonb objects back into the verdict's flat shape so
    // the differ can compare apples-to-apples.
    const wh = (row.workingHours ?? {}) as Record<string, unknown>
    const sc = (row.siteConditions ?? {}) as Record<string, unknown>
    const bim = (row.bimRequirements ?? {}) as Record<string, unknown>
    const ev = (row.earnedValueConfig ?? {}) as Record<string, unknown>
    const sust = (row.sustainabilityConfig ?? {}) as Record<string, unknown>
    return {
      workingHoursStart: (wh.startTime as string) ?? undefined,
      workingHoursEnd: (wh.endTime as string) ?? undefined,
      weekendWorkAllowed: (wh.weekendWork as boolean) ?? undefined,
      ambientTempMaxC: (sc.ambientTempMaxC as number) ?? undefined,
      ambientTempMinC: (sc.ambientTempMinC as number) ?? undefined,
      relativeHumidityMaxPct: (sc.relativeHumidityMaxPct as number) ?? undefined,
      seawaterTempMaxC: (sc.seawaterTempMaxC as number) ?? undefined,
      seawaterTempMinC: (sc.seawaterTempMinC as number) ?? undefined,
      windGust3sec50yrMs: (sc.windGust3sec50yrMs as number) ?? undefined,
      seismicIntensity: (sc.seismicIntensity as string) ?? undefined,
      bimLodLevel: (bim.lodLevel as string) ?? undefined,
      bimPlatform: (bim.platform as string) ?? undefined,
      commonDataEnvironment: (bim.commonDataEnvironment as string) ?? undefined,
      cpiThresholdMin: (ev.cpiThresholdMin as number) ?? undefined,
      spiThresholdMin: (ev.spiThresholdMin as number) ?? undefined,
      sustainabilityCertification: (sust.targetCertification as string) ?? undefined,
      sustainabilityCertificationLevel: (sust.targetCertificationLevel as string) ?? undefined,
    } as unknown as Partial<Sopr>
  },

  diff(current, next): ProposedFieldEvent[] {
    const events: ProposedFieldEvent[] = []
    const cur = current as Record<string, unknown>
    const nxt = next as unknown as Record<string, unknown>

    const scalarFields = [
      ["workingHoursStart", "Working hours — start"],
      ["workingHoursEnd", "Working hours — end"],
      ["weekendWorkAllowed", "Weekend work allowed"],
      ["ambientTempMaxC", "Ambient temp max (°C)"],
      ["ambientTempMinC", "Ambient temp min (°C)"],
      ["relativeHumidityMaxPct", "Relative humidity max (%)"],
      ["seawaterTempMaxC", "Seawater temp max (°C)"],
      ["seawaterTempMinC", "Seawater temp min (°C)"],
      ["windGust3sec50yrMs", "Wind gust 3-sec 50-yr (m/s)"],
      ["seismicIntensity", "Seismic intensity"],
      ["bimLodLevel", "BIM LOD level"],
      ["bimPlatform", "BIM platform"],
      ["commonDataEnvironment", "Common data environment"],
      ["cpiThresholdMin", "CPI threshold min"],
      ["spiThresholdMin", "SPI threshold min"],
      ["sustainabilityCertification", "Sustainability certification"],
      ["sustainabilityCertificationLevel", "Sustainability certification level"],
    ] as const

    for (const [field, label] of scalarFields) {
      diffScalar({
        spec: "sopr",
        field,
        label,
        current: cur[field],
        next: nxt[field],
        events,
      })
    }
    return events
  },

  async applyEvents(projectId, events, addendumId, userId) {
    // Re-construct the jsonb sub-objects from any changed scalar fields
    // so we update them as whole values.
    const wh: Record<string, unknown> = {}
    const sc: Record<string, unknown> = {}
    const bim: Record<string, unknown> = {}
    const ev: Record<string, unknown> = {}
    const sust: Record<string, unknown> = {}
    const apply = (group: Record<string, unknown>, key: string, value: unknown) => {
      group[key] = value ?? null
    }
    for (const e of events) {
      const ref = e.targetRef as { spec: string; field: string }
      if (ref.spec !== "sopr") continue
      const v = e.payload.new
      switch (ref.field) {
        case "workingHoursStart": apply(wh, "startTime", v); break
        case "workingHoursEnd": apply(wh, "endTime", v); break
        case "weekendWorkAllowed": apply(wh, "weekendWork", v); break
        case "ambientTempMaxC": apply(sc, "ambientTempMaxC", v); break
        case "ambientTempMinC": apply(sc, "ambientTempMinC", v); break
        case "relativeHumidityMaxPct": apply(sc, "relativeHumidityMaxPct", v); break
        case "seawaterTempMaxC": apply(sc, "seawaterTempMaxC", v); break
        case "seawaterTempMinC": apply(sc, "seawaterTempMinC", v); break
        case "windGust3sec50yrMs": apply(sc, "windGust3sec50yrMs", v); break
        case "seismicIntensity": apply(sc, "seismicIntensity", v); break
        case "bimLodLevel": apply(bim, "lodLevel", v); break
        case "bimPlatform": apply(bim, "platform", v); break
        case "commonDataEnvironment": apply(bim, "commonDataEnvironment", v); break
        case "cpiThresholdMin": apply(ev, "cpiThresholdMin", v); break
        case "spiThresholdMin": apply(ev, "spiThresholdMin", v); break
        case "sustainabilityCertification": apply(sust, "targetCertification", v); break
        case "sustainabilityCertificationLevel": apply(sust, "targetCertificationLevel", v); break
      }
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (Object.keys(wh).length > 0) patch.workingHours = wh
    if (Object.keys(sc).length > 0) patch.siteConditions = sc
    if (Object.keys(bim).length > 0) patch.bimRequirements = bim
    if (Object.keys(ev).length > 0) patch.earnedValueConfig = ev
    if (Object.keys(sust).length > 0) patch.sustainabilityConfig = sust
    if (Object.keys(patch).length > 1) {
      await db.update(projects).set(patch).where(eq(projects.id, projectId))
    }
    void diffJsonbObject // re-export keeper
    const rows = events.map((e) => ({
      projectId,
      itemId: null,
      targetKind: e.targetKind,
      targetRef: e.targetRef,
      eventKind: "description_changed" as const,
      sourceKind: "addendum" as TenderEventSourceKind,
      sourceId: addendumId,
      payload: e.payload,
      recordedByUserId: userId,
    }))
    if (rows.length > 0) await recordEvents(rows)
  },
}
