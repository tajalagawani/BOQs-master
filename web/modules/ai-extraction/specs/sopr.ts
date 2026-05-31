import { z } from "zod"

import { flattenWithAliases, softRowArray } from "./_flatten"
import type { DocSpec, ManualFieldConfig, PersistContext } from "./types"

// -----------------------------------------------------------------------------
// Zod schema — covers the key project-config blocks from the SOPR.
// (Full 553-page doc structure lives in document.extracted_data + the
//  agent's verdict json; what's below is the manual-fillable subset.)
// -----------------------------------------------------------------------------

const commencementSubmissionRow = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  daysAfterCommencement: z.number().int().min(0),
})

const sectionOfWorksRow = z.object({
  milestone: z.number().int().positive(),
  sectionName: z.string().min(1),
  timeForCompletionDays: z.number().int().positive(),
  startReference: z.string().optional(),
  finishReference: z.string().optional(),
})

const phaseRow = z.object({
  phaseId: z.string().min(1),
  name: z.string().min(1),
  startMilestone: z.string().optional(),
  finishMilestone: z.string().optional(),
})

const respMatrixRow = z.object({
  category: z.string().min(1),
  ref: z.string().min(1),
  itemLabel: z.string().min(1),
  responsibility: z.string().min(1),
  pricingNote: z.string().optional(),
})

const complianceTemplateRow = z.object({
  scheduleId: z.string().min(1),
  scheduleLabel: z.string().min(1),
  formatRequired: z.string().optional(),
  submissionWindow: z.string().optional(),
})

/**
 * Translate the agent's documented verdict shape (docs/specs/sopr.md groups
 * fields under `scope.*`, `keyDates.*`, `siteConditions.*`, `workingHours.*`,
 * `bimRequirements.*`, etc., often inside an `extracted` envelope) into the
 * flat shape the zod schema expects.
 */
function flattenSoprVerdict(input: unknown): unknown {
  return flattenWithAliases(input, {
    topLevel: {
      district: ["district", "locationDistrict", "districtName"],
      commencementSubmissions: ["commencementSubmissions"],
      sectionsOfTheWorks: ["sectionsOfTheWorks", "sections"],
      ambientTempMaxC: ["ambientTempMaxC"],
      ambientTempMinC: ["ambientTempMinC"],
      relativeHumidityMaxPct: ["relativeHumidityMaxPct"],
      seawaterTempMaxC: ["seawaterTempMaxC"],
      seawaterTempMinC: ["seawaterTempMinC"],
      windGust3sec50yrMs: ["windGust3sec50yrMs"],
      seismicIntensity: ["seismicIntensity"],
      workingHoursStart: ["workingHoursStart", "startTime", "start"],
      workingHoursEnd: ["workingHoursEnd", "endTime", "end"],
      weekendWorkAllowed: ["weekendWorkAllowed", "weekendWork"],
      programmeSoftware: ["programmeSoftware"],
      progressReportFrequency: ["progressReportFrequency"],
      qmsStandard: ["qmsStandard"],
      phases: ["phases"],
      // Agent often emits "G_responsibilityMatrix.rows" or "appG.rows".
      responsibilityMatrixRows: [
        "responsibilityMatrixRows",
        "G_responsibilityMatrix.rows",
        "appG.rows",
        "appendixG.rows",
        "responsibilityMatrix.rows",
      ],
      bimLodLevel: ["bimLodLevel", "lodLevel"],
      bimPlatform: ["bimPlatform", "platform"],
      commonDataEnvironment: ["commonDataEnvironment"],
      technicalDeliverables: ["technicalDeliverables"],
      cpiThresholdMin: ["cpiThresholdMin"],
      spiThresholdMin: ["spiThresholdMin"],
      sustainabilityCertification: [
        "sustainabilityCertification",
        "certification",
      ],
      sustainabilityCertificationLevel: [
        "sustainabilityCertificationLevel",
        "certificationLevel",
      ],
    },
    rowLevel: {
      // Agent's responsibility-matrix row shape: { categoryRef, itemLabel,
      // responsibleBy: { gc }, pricingNote }. Rewrite into our flat shape.
      responsibilityMatrixRows: {
        category: ["category", "categoryRef", "categoryName"],
        ref: ["ref", "itemRef", "categoryRef", "id"],
        itemLabel: ["itemLabel", "label", "item"],
        responsibility: [
          "responsibility",
          "responsibleBy.gc",
          "responsibleBy.contractor",
          "responsibleBy.employer",
          "responsibleBy",
          "responsibleParty",
        ],
        pricingNote: ["pricingNote", "pricing", "note"],
      },
    },
  })
}

// Legacy path kept for reference but unreachable below the new function.
function _legacyFlattenSoprVerdict(input: unknown): unknown {
  if (!input || typeof input !== "object") return input
  const v = input as Record<string, unknown>
  const ex = (v.extracted ?? v) as Record<string, unknown>
  const scope = (ex.scope ?? {}) as Record<string, unknown>
  const intro = (scope.introduction ?? {}) as Record<string, unknown>
  const keyDates = (ex.keyDates ?? {}) as Record<string, unknown>
  const siteCond = (ex.siteConditions ?? {}) as Record<string, unknown>
  const workHours = (ex.workingHours ?? {}) as Record<string, unknown>
  const planning = (ex.planning ?? {}) as Record<string, unknown>
  const bim = (ex.bimRequirements ??
    ex.appendixH ??
    {}) as Record<string, unknown>
  const earnedValue = (ex.earnedValue ??
    ex.appendixN ??
    {}) as Record<string, unknown>
  const sustainability = (ex.sustainability ??
    ex.appendixR ??
    {}) as Record<string, unknown>

  return {
    district:
      intro.locationDistrict ?? ex.district ?? v.district ?? null,

    commencementSubmissions:
      keyDates.commencementSubmissions ??
      ex.commencementSubmissions ??
      v.commencementSubmissions,
    sectionsOfTheWorks:
      ex.sectionsOfTheWorks ?? v.sectionsOfTheWorks,

    ambientTempMaxC:
      siteCond.ambientTempMaxC ?? ex.ambientTempMaxC ?? v.ambientTempMaxC,
    ambientTempMinC:
      siteCond.ambientTempMinC ?? ex.ambientTempMinC ?? v.ambientTempMinC,
    relativeHumidityMaxPct:
      siteCond.relativeHumidityMaxPct ??
      ex.relativeHumidityMaxPct ??
      v.relativeHumidityMaxPct,
    seawaterTempMaxC:
      siteCond.seawaterTempMaxC ?? ex.seawaterTempMaxC ?? v.seawaterTempMaxC,
    seawaterTempMinC:
      siteCond.seawaterTempMinC ?? ex.seawaterTempMinC ?? v.seawaterTempMinC,
    windGust3sec50yrMs:
      siteCond.windGust3sec50yrMs ??
      ex.windGust3sec50yrMs ??
      v.windGust3sec50yrMs,
    seismicIntensity:
      siteCond.seismicIntensity ?? ex.seismicIntensity ?? v.seismicIntensity,

    workingHoursStart:
      workHours.startTime ??
      workHours.start ??
      ex.workingHoursStart ??
      v.workingHoursStart,
    workingHoursEnd:
      workHours.endTime ??
      workHours.end ??
      ex.workingHoursEnd ??
      v.workingHoursEnd,
    weekendWorkAllowed:
      workHours.weekendWork ??
      workHours.weekendWorkAllowed ??
      ex.weekendWorkAllowed ??
      v.weekendWorkAllowed,

    programmeSoftware:
      planning.programmeSoftware ??
      ex.programmeSoftware ??
      v.programmeSoftware,
    progressReportFrequency:
      planning.progressReportFrequency ??
      ex.progressReportFrequency ??
      v.progressReportFrequency,
    qmsStandard: planning.qmsStandard ?? ex.qmsStandard ?? v.qmsStandard,

    phases: (ex.appendixA as { phases?: unknown })?.phases ?? ex.phases ?? v.phases,

    responsibilityMatrixRows:
      (ex.appendixG as { rows?: unknown })?.rows ??
      ex.responsibilityMatrixRows ??
      v.responsibilityMatrixRows,

    bimLodLevel: bim.lodLevel ?? ex.bimLodLevel ?? v.bimLodLevel,
    bimPlatform: bim.platform ?? ex.bimPlatform ?? v.bimPlatform,
    commonDataEnvironment:
      bim.commonDataEnvironment ??
      ex.commonDataEnvironment ??
      v.commonDataEnvironment,

    technicalDeliverables:
      (ex.appendixM as { rows?: unknown })?.rows ??
      ex.technicalDeliverables ??
      v.technicalDeliverables,

    cpiThresholdMin:
      earnedValue.cpiThresholdMin ??
      ex.cpiThresholdMin ??
      v.cpiThresholdMin,
    spiThresholdMin:
      earnedValue.spiThresholdMin ??
      ex.spiThresholdMin ??
      v.spiThresholdMin,

    sustainabilityCertification:
      sustainability.certification ??
      ex.sustainabilityCertification ??
      v.sustainabilityCertification,
    sustainabilityCertificationLevel:
      sustainability.certificationLevel ??
      ex.sustainabilityCertificationLevel ??
      v.sustainabilityCertificationLevel,
  }
}

const soprShape = z.object({
  district: z.string().optional(),

  // Section 2 — Key Dates
  commencementSubmissions: softRowArray(commencementSubmissionRow),
  sectionsOfTheWorks: softRowArray(sectionOfWorksRow),

  // Section 3.1 — Site Conditions
  ambientTempMaxC: z.number().optional(),
  ambientTempMinC: z.number().optional(),
  relativeHumidityMaxPct: z.number().optional(),
  seawaterTempMaxC: z.number().optional(),
  seawaterTempMinC: z.number().optional(),
  windGust3sec50yrMs: z.number().optional(),
  seismicIntensity: z.string().optional(),

  // Section 6.12 — Working Hours
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  weekendWorkAllowed: z.boolean().optional(),

  // Section 9 — Planning
  programmeSoftware: z.string().optional(),
  progressReportFrequency: z.string().optional(),
  qmsStandard: z.string().optional(),

  // Appendix A phases
  phases: softRowArray(phaseRow),

  // Appendix G responsibility matrix
  responsibilityMatrixRows: softRowArray(respMatrixRow),

  // Appendix H BIM
  bimLodLevel: z.string().optional(),
  bimPlatform: z.string().optional(),
  commonDataEnvironment: z.string().optional(),

  // Appendix M — Technical Deliverables (compliance criteria seed)
  technicalDeliverables: softRowArray(complianceTemplateRow),

  // Appendix N — Earned Value
  cpiThresholdMin: z.number().optional(),
  spiThresholdMin: z.number().optional(),

  // Appendix R — Sustainability
  sustainabilityCertification: z.string().optional(),
  sustainabilityCertificationLevel: z.string().optional(),

  // V2-12 — Clause text archive (every clause kept verbatim with its ref).
  clauses: z
    .array(z.object({ ref: z.string(), text: z.string() }))
    .optional(),
})

// Public schema: flatten the agent's nested envelope first.
export const soprSchema = z.preprocess(flattenSoprVerdict, soprShape)

export type Sopr = z.infer<typeof soprSchema>

// -----------------------------------------------------------------------------
// Manual field renderer config
// -----------------------------------------------------------------------------

export const soprManualFields: ManualFieldConfig[] = [
  {
    kind: "group",
    label: "Identity",
    fields: [
      { kind: "text", key: "district", label: "District / sub-project", placeholder: "Bridges District" },
    ],
  },
  {
    kind: "group",
    label: "Key Dates — commencement submissions (Section 2.1 (ix))",
    description: "The N items each contractor must submit within X days after Commencement.",
    fields: [
      {
        kind: "repeating-rows",
        key: "commencementSubmissions",
        label: "Submissions",
        addLabel: "+ Add submission",
        rowFields: [
          { kind: "text", key: "id", label: "ID", required: true, placeholder: "i" },
          { kind: "text", key: "label", label: "Item", required: true, placeholder: "Programme for the carrying out and completion of the Works" },
          { kind: "integer", key: "daysAfterCommencement", label: "Days after Commencement", required: true, min: 0 },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Sections of the Works (Section 2.2)",
    description: "Cross-checked against FOT Clause 2 and COC Particular Conditions.",
    fields: [
      {
        kind: "repeating-rows",
        key: "sectionsOfTheWorks",
        label: "Sections",
        addLabel: "+ Add section",
        rowFields: [
          { kind: "integer", key: "milestone", label: "Milestone #", required: true, min: 1 },
          { kind: "text", key: "sectionName", label: "Section name", required: true },
          { kind: "integer", key: "timeForCompletionDays", label: "Days", required: true, min: 1 },
          { kind: "text", key: "startReference", label: "Start ref" },
          { kind: "text", key: "finishReference", label: "Finish ref" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Site Conditions (Section 3.1)",
    fields: [
      { kind: "number", key: "ambientTempMaxC", label: "Ambient temp max (°C)" },
      { kind: "number", key: "ambientTempMinC", label: "Ambient temp min (°C)" },
      { kind: "percent", key: "relativeHumidityMaxPct", label: "Relative humidity max (%)" },
      { kind: "number", key: "seawaterTempMaxC", label: "Seawater temp max (°C)" },
      { kind: "number", key: "seawaterTempMinC", label: "Seawater temp min (°C)" },
      { kind: "number", key: "windGust3sec50yrMs", label: "Wind gust 3-sec 50-yr (m/s)" },
      { kind: "text", key: "seismicIntensity", label: "Seismic intensity", placeholder: "MMV II (Modified Mercalli)" },
    ],
  },
  {
    kind: "group",
    label: "Working Hours (Section 6.12)",
    fields: [
      { kind: "text", key: "workingHoursStart", label: "Start (HH:MM)", placeholder: "07:00" },
      { kind: "text", key: "workingHoursEnd", label: "End (HH:MM)", placeholder: "18:00" },
      { kind: "boolean", key: "weekendWorkAllowed", label: "Weekend work allowed" },
    ],
  },
  {
    kind: "group",
    label: "Planning & QM (Sections 9.1, 9.7, 9.13)",
    fields: [
      { kind: "text", key: "programmeSoftware", label: "Programme software", placeholder: "Primavera P6 / MS Project" },
      { kind: "text", key: "progressReportFrequency", label: "Progress report frequency", placeholder: "Weekly" },
      { kind: "text", key: "qmsStandard", label: "QMS standard", placeholder: "ISO 9001" },
    ],
  },
  {
    kind: "group",
    label: "Appendix A — Phases (high-level)",
    fields: [
      {
        kind: "repeating-rows",
        key: "phases",
        label: "Phases",
        addLabel: "+ Add phase",
        rowFields: [
          { kind: "text", key: "phaseId", label: "Phase ID", required: true },
          { kind: "text", key: "name", label: "Name", required: true },
          { kind: "text", key: "startMilestone", label: "Start milestone" },
          { kind: "text", key: "finishMilestone", label: "Finish milestone" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Appendix G — Responsibility Matrix (key rows)",
    description: "Optional manual entry of the most-important rows. Full matrix arrives via upload.",
    fields: [
      {
        kind: "repeating-rows",
        key: "responsibilityMatrixRows",
        label: "Rows",
        addLabel: "+ Add row",
        rowFields: [
          { kind: "text", key: "category", label: "Category", required: true },
          { kind: "text", key: "ref", label: "Ref", required: true, placeholder: "1.7" },
          { kind: "text", key: "itemLabel", label: "Item label", required: true },
          { kind: "text", key: "responsibility", label: "Responsibility", required: true, placeholder: "GC / PS / EM" },
          { kind: "text", key: "pricingNote", label: "Pricing note" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Appendix H — BIM",
    fields: [
      { kind: "text", key: "bimLodLevel", label: "LOD level", placeholder: "350 / 400" },
      { kind: "text", key: "bimPlatform", label: "Platform", placeholder: "Revit 2024" },
      { kind: "text", key: "commonDataEnvironment", label: "Common Data Environment", placeholder: "UNIFIER" },
    ],
  },
  {
    kind: "group",
    label: "Appendix M — Tender Technical Deliverables (compliance seed)",
    description: "Each row becomes a compliance criterion in Step 5.",
    fields: [
      {
        kind: "repeating-rows",
        key: "technicalDeliverables",
        label: "Deliverables",
        addLabel: "+ Add deliverable",
        rowFields: [
          { kind: "text", key: "scheduleId", label: "ID", required: true, placeholder: "T1" },
          { kind: "text", key: "scheduleLabel", label: "Name", required: true },
          { kind: "text", key: "formatRequired", label: "Format" },
          { kind: "text", key: "submissionWindow", label: "Window" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Appendix N — Earned Value",
    fields: [
      { kind: "number", key: "cpiThresholdMin", label: "CPI minimum threshold", placeholder: "0.95" },
      { kind: "number", key: "spiThresholdMin", label: "SPI minimum threshold", placeholder: "0.95" },
    ],
  },
  {
    kind: "group",
    label: "Appendix R — Sustainability",
    fields: [
      { kind: "text", key: "sustainabilityCertification", label: "Target certification", placeholder: "LEED / Estidama" },
      { kind: "text", key: "sustainabilityCertificationLevel", label: "Target level", placeholder: "Gold / Pearl 3" },
    ],
  },
]

// -----------------------------------------------------------------------------
// Persistor — no-op stub. Real impl in `./_persistors.ts`.
// -----------------------------------------------------------------------------

export async function persistSopr(_input: Sopr, _ctx: PersistContext): Promise<void> {
  // intentionally empty — see _persistors.ts
}

// -----------------------------------------------------------------------------
// DocSpec entry
// -----------------------------------------------------------------------------

export const soprSpec: DocSpec<Sopr> = {
  id: "sopr",
  label: "Schedule of Project Requirements",
  shortLabel: "SOPR",
  scope: "required",
  category: "Schedule of Project Requirements",
  required: true,
  manualFeasible: "partial",
  schema: soprSchema,
  manualFields: soprManualFields,
  persistor: persistSopr,
  agentSpecPath: "docs/prompts/sopr.md",
}
