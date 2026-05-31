import "server-only"

import { and, eq } from "drizzle-orm"

import { tenderDeviations } from "@/modules/analysis/schema"
import { db } from "@/modules/core/db"
import { projects } from "@/modules/procurex/projects/schema"
import {
  complianceRecordTemplates,
  projectPhases,
  responsibilityMatrixRows,
} from "@/modules/procurex/sopr/schema"

import type { Coc } from "./coc"
import type { DeviationsVerdict } from "./deviations"
import type { Fot } from "./fot"
import type { Itt } from "./itt"
import type { Sopr } from "./sopr"
import type { PersistContext } from "./types"

/**
 * Server-only persistor implementations for the doc-extraction specs.
 *
 * Why this file exists separately from each spec's `.ts`:
 * the spec files (fot.ts, itt.ts, …) are imported by the Step 2 client
 * component via the `@/modules/ai-extraction` barrel for their schema +
 * label + manualFields. If each spec also contained a persistor that
 * imported `@/modules/core/db`, webpack would pull `db.ts` (and
 * therefore `pg`) into the client chunk and the build would fail with
 * "Module not found: util/types". Splitting persistors out keeps the
 * spec files client-safe; this file is server-only via the import on
 * line 1.
 */

export async function persistFot(input: Fot, ctx: PersistContext): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (input.currency) patch.currency = input.currency
  if (input.validityDays) patch.requiredValidityDays = input.validityDays
  await db.update(projects).set(patch).where(eq(projects.id, ctx.projectId))
  console.log("[fot.persist] saved", {
    projectId: ctx.projectId,
    documentId: ctx.documentId,
    timesForCompletionCount: input.timesForCompletion.length,
    validityDays: input.validityDays,
  })
}

export async function persistItt(input: Itt, ctx: PersistContext): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (input.currency) patch.currency = input.currency
  if (input.requiredValidityDays != null)
    patch.requiredValidityDays = input.requiredValidityDays
  if (input.addendaCutoffDays != null)
    patch.ittAddendaCutoffDays = input.addendaCutoffDays
  if (input.clarificationCutoffDays != null)
    patch.ittClarificationCutoffDays = input.clarificationCutoffDays
  if (input.vatTreatment) patch.vatTreatment = input.vatTreatment
  if (input.language) patch.language = input.language
  if (input.alternativeTenderAllowed != null)
    patch.alternativeTenderAllowed = input.alternativeTenderAllowed
  if (input.reraTrustAccountRequired != null)
    patch.reraTrustAccountRequired = input.reraTrustAccountRequired
  if (input.bondsPerformanceRequired != null)
    patch.performanceBondRequired = input.bondsPerformanceRequired
  if (input.engineerName) patch.engineerName = input.engineerName
  if (input.approvedBondBanks?.length)
    patch.approvedBondBanks = flattenScalarRows(input.approvedBondBanks)
  if (input.documentPriorityOrder?.length)
    patch.documentPriorityOrder = flattenScalarRows(input.documentPriorityOrder)
  await db.update(projects).set(patch).where(eq(projects.id, ctx.projectId))
  console.log("[itt.persist] saved", {
    projectId: ctx.projectId,
    scheduleCount: input.submissionSchedules?.length ?? 0,
    bankCount: input.approvedBondBanks?.length ?? 0,
  })
}

export async function persistCoc(input: Coc, ctx: PersistContext): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (input.contractFormCode) patch.contractFormCode = input.contractFormCode
  if (input.contractForm) patch.contractForm = input.contractForm
  if (input.contractFormVersion) patch.contractFormVersion = input.contractFormVersion
  if (input.contractSumCents != null) patch.contractSumCents = input.contractSumCents
  if (input.engineerName) patch.engineerName = input.engineerName
  if (input.governingLaw) patch.governingLaw = input.governingLaw
  if (input.disputeForum) patch.disputeForum = input.disputeForum
  if (input.language) patch.language = input.language
  if (input.advancePaymentPercent != null)
    patch.advancePaymentPercent = String(input.advancePaymentPercent)
  if (input.advancePaymentBondPercent != null)
    patch.advancePaymentBondPercent = String(input.advancePaymentBondPercent)
  if (input.performanceBondPercent != null)
    patch.performanceBondPercent = String(input.performanceBondPercent)
  if (input.retentionPercent != null)
    patch.retentionPercent = String(input.retentionPercent)
  if (input.retentionCapCents != null) patch.retentionCapCents = input.retentionCapCents
  if (input.retentionCapPercent != null)
    patch.retentionCapPercent = String(input.retentionCapPercent)
  if (input.ldPerDayCents != null) patch.ldPerDayCents = input.ldPerDayCents
  if (input.ldCapCents != null) patch.ldCapCents = input.ldCapCents
  if (input.ldCapPercent != null) patch.ldCapPercent = String(input.ldCapPercent)
  if (input.dlpMonths != null) patch.dlpMonths = input.dlpMonths
  if (input.decennialLiabilityYears != null)
    patch.decennialLiabilityYears = input.decennialLiabilityYears
  if (input.fixedPrice != null) patch.fixedPrice = input.fixedPrice
  if (input.documentPriorityOrder?.length)
    patch.documentPriorityOrder = flattenScalarRows(input.documentPriorityOrder)
  const insurance: Record<string, unknown> = {}
  if (input.insuranceMachineryAllRisksMinCents != null)
    insurance.machineryAllRisksMinCents =
      input.insuranceMachineryAllRisksMinCents.toString()
  if (input.insuranceWorkmensCompMinCents != null)
    insurance.workmensCompMinCents = input.insuranceWorkmensCompMinCents.toString()
  if (input.insuranceContractorAllRiskMinCents != null)
    insurance.contractorAllRiskMinCents =
      input.insuranceContractorAllRiskMinCents.toString()
  if (Object.keys(insurance).length > 0) patch.insuranceMinimums = insurance
  await db.update(projects).set(patch).where(eq(projects.id, ctx.projectId))
  console.log("[coc.persist] saved", {
    projectId: ctx.projectId,
    contractForm: input.contractForm,
    hasTimesForCompletion: !!input.timesForCompletion?.length,
  })
}

export async function persistSopr(input: Sopr, ctx: PersistContext): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  const workingHours: Record<string, unknown> = {}
  if (input.workingHoursStart) workingHours.startTime = input.workingHoursStart
  if (input.workingHoursEnd) workingHours.endTime = input.workingHoursEnd
  if (input.weekendWorkAllowed != null)
    workingHours.weekendWork = input.weekendWorkAllowed
  if (Object.keys(workingHours).length > 0) patch.workingHours = workingHours
  const siteConditions: Record<string, unknown> = {}
  if (input.ambientTempMaxC != null) siteConditions.ambientTempMaxC = input.ambientTempMaxC
  if (input.ambientTempMinC != null) siteConditions.ambientTempMinC = input.ambientTempMinC
  if (input.relativeHumidityMaxPct != null)
    siteConditions.relativeHumidityMaxPct = input.relativeHumidityMaxPct
  if (input.seawaterTempMaxC != null)
    siteConditions.seawaterTempMaxC = input.seawaterTempMaxC
  if (input.seawaterTempMinC != null)
    siteConditions.seawaterTempMinC = input.seawaterTempMinC
  if (input.windGust3sec50yrMs != null)
    siteConditions.windGust3sec50yrMs = input.windGust3sec50yrMs
  if (input.seismicIntensity) siteConditions.seismicIntensity = input.seismicIntensity
  if (Object.keys(siteConditions).length > 0) patch.siteConditions = siteConditions
  if (input.programmeSoftware) patch.reportingFrequency = input.progressReportFrequency
  if (input.bimLodLevel || input.bimPlatform || input.commonDataEnvironment) {
    patch.bimRequirements = {
      lodLevel: input.bimLodLevel,
      platform: input.bimPlatform,
      commonDataEnvironment: input.commonDataEnvironment,
    }
  }
  if (input.cpiThresholdMin != null || input.spiThresholdMin != null) {
    patch.earnedValueConfig = {
      cpiThresholdMin: input.cpiThresholdMin,
      spiThresholdMin: input.spiThresholdMin,
    }
  }
  if (input.sustainabilityCertification || input.sustainabilityCertificationLevel) {
    patch.sustainabilityConfig = {
      targetCertification: input.sustainabilityCertification,
      targetCertificationLevel: input.sustainabilityCertificationLevel,
    }
  }
  await db.update(projects).set(patch).where(eq(projects.id, ctx.projectId))
  if (input.phases?.length) {
    await db.delete(projectPhases).where(eq(projectPhases.projectId, ctx.projectId))
    await db.insert(projectPhases).values(
      input.phases.map((p, i) => ({
        projectId: ctx.projectId,
        phaseId: p.phaseId,
        name: p.name,
        startMilestone: p.startMilestone,
        finishMilestone: p.finishMilestone,
        position: i,
      })),
    )
  }
  if (input.responsibilityMatrixRows?.length) {
    await db
      .delete(responsibilityMatrixRows)
      .where(eq(responsibilityMatrixRows.projectId, ctx.projectId))
    await db.insert(responsibilityMatrixRows).values(
      input.responsibilityMatrixRows.map((r, i) => ({
        projectId: ctx.projectId,
        category: r.category,
        ref: r.ref,
        itemLabel: r.itemLabel,
        responsibleBy: { responsibility: r.responsibility },
        pricingNote: r.pricingNote,
        position: i,
      })),
    )
  }
  if (input.technicalDeliverables?.length) {
    await db
      .delete(complianceRecordTemplates)
      .where(eq(complianceRecordTemplates.projectId, ctx.projectId))
    await db.insert(complianceRecordTemplates).values(
      input.technicalDeliverables.map((d, i) => ({
        projectId: ctx.projectId,
        sectionCode: "M",
        criterionCode: d.scheduleId,
        criterionLabel: d.scheduleLabel,
        sourceRef: "SOPR Appendix M",
        submissionMandatory: true,
        submissionWindow: d.submissionWindow,
        formatRequired: d.formatRequired,
        position: i,
      })),
    )
  }
  console.log("[sopr.persist] saved", {
    projectId: ctx.projectId,
    phases: input.phases?.length ?? 0,
    responsibilityMatrix: input.responsibilityMatrixRows?.length ?? 0,
    technicalDeliverables: input.technicalDeliverables?.length ?? 0,
  })
}

function flattenScalarRows(rows: unknown): unknown {
  if (!Array.isArray(rows)) return rows
  return rows.map((r) =>
    typeof r === "object" && r !== null && "value" in r
      ? (r as { value: unknown }).value
      : r,
  )
}

/**
 * Lookup map — workflow code passes the spec id and gets back the real
 * persistor. Stubs (boq-template, drawings-register, etc.) intentionally
 * return undefined here; their spec's no-op `persistor` field handles
 * the save call.
 */
/**
 * Deviations persistor — replaces all rows for `(tendererId, documentId)`
 * with the latest batch so the agent can be re-run on a corrected
 * submission without leaving stale clauses in the table. Per-chunk
 * calls (sheet-by-sheet for xlsx, page-window for PDF) are merged by
 * the workflow before being handed off here.
 */
export async function persistDeviations(
  input: DeviationsVerdict,
  ctx: PersistContext,
): Promise<void> {
  if (!ctx.tendererId) {
    throw new Error("persist deviations: ctx.tendererId required")
  }
  const agentRunId = (ctx as PersistContext & { workflowRunId?: string })
    .workflowRunId
  if (ctx.documentId) {
    await db
      .delete(tenderDeviations)
      .where(
        and(
          eq(tenderDeviations.tendererId, ctx.tendererId),
          eq(tenderDeviations.documentId, ctx.documentId),
        ),
      )
  }
  if (input.deviations.length === 0) return
  const rows = input.deviations.map((d) => ({
    tendererId: ctx.tendererId!,
    submissionId: null,
    documentId: ctx.documentId ?? null,
    kind: d.kind,
    clause: d.clause,
    snippet: d.snippet,
    severity: d.severity,
    agentRunId: agentRunId ?? null,
    payload: { references: d.references },
  }))
  for (let i = 0; i < rows.length; i += 200) {
    await db.insert(tenderDeviations).values(rows.slice(i, i + 200))
  }
}

const PERSISTORS = {
  fot: persistFot,
  itt: persistItt,
  coc: persistCoc,
  sopr: persistSopr,
  deviations: persistDeviations,
} as const

export type PersistorSpecId = keyof typeof PERSISTORS

export function getPersistor(
  specId: string,
): ((input: unknown, ctx: PersistContext) => Promise<void>) | undefined {
  return PERSISTORS[specId as PersistorSpecId] as
    | ((input: unknown, ctx: PersistContext) => Promise<void>)
    | undefined
}
