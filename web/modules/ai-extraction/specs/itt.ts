import { z } from "zod"

import { softRowArray } from "./_flatten"
import type { DocSpec, ManualFieldConfig, PersistContext } from "./types"

// -----------------------------------------------------------------------------
// Zod schema — focused on the project-configuration values from ITT
// (the full 80-field text breakdown lands in document.extracted_data later)
// -----------------------------------------------------------------------------

const submissionScheduleRow = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  format: z.string().optional(),
})

const ittShape = z.object({
  version: z.string().optional(),

  notificationOfIntentDays: z.number().int().min(0).optional(),
  addendaCutoffDays: z.number().int().min(0).optional(),
  clarificationCutoffDays: z.number().int().min(0).optional(),

  currency: z
    .enum(["AED", "USD", "EUR", "GBP", "SAR"])
    .optional(),
  language: z.string().optional(),
  vatTreatment: z.enum(["exclusive", "inclusive"]).optional(),
  requiredValidityDays: z.number().int().positive().optional(),

  alternativeTenderAllowed: z.boolean().optional(),
  reraTrustAccountRequired: z.boolean().optional(),

  bondsPerformanceRequired: z.boolean().optional(),
  bondsAdvancePaymentRequired: z.boolean().optional(),
  approvedBondBanks: z.array(z.string()).optional(),

  submissionSchedules: softRowArray(submissionScheduleRow),

  engineerName: z.string().optional(),
  documentPriorityOrder: z.array(z.string()).optional(),

  arithmeticErrorAdjustToBoqTotal: z.boolean().optional(),
  arithmeticErrorLockIfBqHigher: z.boolean().optional(),
  arithmeticErrorAdjustIfBqLower: z.boolean().optional(),

  // V2-12 — Clause text archive (every clause kept verbatim with its ref).
  clauses: z
    .array(z.object({ ref: z.string(), text: z.string() }))
    .optional(),
})

// Deep-walk the agent's verdict (which can be nested under structured_value,
// extracted, bonds, evaluation, formOfAgreement, etc.) and resolve schema
// fields by name. Same pattern as COC/SOPR.
function flattenIttVerdict(input: unknown): unknown {
  if (!input || typeof input !== "object") return input
  const v = input as Record<string, unknown>
  const aliases: Record<string, string[]> = {
    version: ["version"],
    notificationOfIntentDays: ["notificationOfIntentDays"],
    addendaCutoffDays: ["addendaCutoffDays"],
    clarificationCutoffDays: ["clarificationCutoffDays"],
    currency: ["currency"],
    language: ["language"],
    vatTreatment: ["vatTreatment"],
    requiredValidityDays: [
      "requiredValidityDays",
      "tenderValidityDays",
      "validityDays",
    ],
    alternativeTenderAllowed: [
      "alternativeTenderAllowed",
      "alternativeTendersAllowed",
      "alternativeTenderPermitted",
    ],
    reraTrustAccountRequired: ["reraTrustAccountRequired"],
    bondsPerformanceRequired: [
      "bondsPerformanceRequired",
      "performanceBondRequired",
    ],
    bondsAdvancePaymentRequired: [
      "bondsAdvancePaymentRequired",
      "advancePaymentBondRequired",
    ],
    approvedBondBanks: ["approvedBondBanks", "approvedBanks"],
    submissionSchedules: ["submissionSchedules"],
    engineerName: ["engineerName", "engineer"],
    documentPriorityOrder: ["documentPriorityOrder", "priorityOfDocuments"],
    arithmeticErrorAdjustToBoqTotal: [
      "arithmeticErrorAdjustToBoqTotal",
      "adjustToBoqTotal",
    ],
    arithmeticErrorLockIfBqHigher: [
      "arithmeticErrorLockIfBqHigher",
      "lockTenderSumIfBqHigher",
      "lockIfBqHigher",
    ],
    arithmeticErrorAdjustIfBqLower: [
      "arithmeticErrorAdjustIfBqLower",
      "adjustTenderSumIfBqLower",
      "adjustIfBqLower",
    ],
  }

  const out: Record<string, unknown> = {}
  for (const [schemaKey, names] of Object.entries(aliases)) {
    for (const name of names) {
      const found = deepFindItt(v, name)
      if (found !== undefined && found !== null && found !== "not stated") {
        out[schemaKey] = found
        break
      }
    }
  }

  // Sanitize: lowercase vatTreatment ("EXCLUSIVE" → "exclusive")
  if (typeof out.vatTreatment === "string") {
    out.vatTreatment = (out.vatTreatment as string).toLowerCase()
  }
  // approvedBondBanks may come as ["Bank A", "Bank B"] or as [{value:"..."}]
  if (Array.isArray(out.approvedBondBanks)) {
    out.approvedBondBanks = (out.approvedBondBanks as unknown[]).map((b) =>
      typeof b === "string"
        ? b
        : typeof b === "object" && b && "value" in (b as Record<string, unknown>)
          ? String((b as { value: unknown }).value)
          : String(b),
    )
  }
  return out
}

function deepFindItt(node: unknown, key: string): unknown {
  if (node === null || node === undefined) return undefined
  if (Array.isArray(node)) {
    for (const item of node) {
      const f = deepFindItt(item, key)
      if (f !== undefined && f !== null) return f
    }
    return undefined
  }
  if (typeof node !== "object") return undefined
  const rec = node as Record<string, unknown>
  if (key in rec && rec[key] !== null && rec[key] !== undefined) return rec[key]
  for (const val of Object.values(rec)) {
    const f = deepFindItt(val, key)
    if (f !== undefined && f !== null) return f
  }
  return undefined
}

export const ittSchema = z.preprocess(flattenIttVerdict, ittShape)

export type Itt = z.infer<typeof ittSchema>

// -----------------------------------------------------------------------------
// Manual field renderer config
// -----------------------------------------------------------------------------

export const ittManualFields: ManualFieldConfig[] = [
  {
    kind: "group",
    label: "Document identity",
    fields: [{ kind: "text", key: "version", label: "Version", placeholder: "May 2024 Version" }],
  },
  {
    kind: "group",
    label: "Submission rules",
    description: "From Clauses 4, 5, 6, 7, 11, 12, 13.",
    fields: [
      { kind: "integer", key: "notificationOfIntentDays", label: "Notification of Intent (days)", min: 0 },
      { kind: "integer", key: "addendaCutoffDays", label: "Addenda cutoff (days before deadline)", min: 0 },
      { kind: "integer", key: "clarificationCutoffDays", label: "Clarification cutoff (days before deadline)", min: 0 },
      { kind: "integer", key: "requiredValidityDays", label: "Required tender validity (days)", min: 1 },
      {
        kind: "select",
        key: "currency",
        label: "Currency",
        options: [
          { value: "AED", label: "AED" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
          { value: "SAR", label: "SAR" },
        ],
      },
      { kind: "text", key: "language", label: "Language", placeholder: "English" },
      {
        kind: "select",
        key: "vatTreatment",
        label: "VAT treatment",
        options: [
          { value: "exclusive", label: "Exclusive" },
          { value: "inclusive", label: "Inclusive" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Bonds (Clause 15)",
    fields: [
      { kind: "boolean", key: "bondsPerformanceRequired", label: "Performance bond required" },
      { kind: "boolean", key: "bondsAdvancePaymentRequired", label: "Advance payment bond required" },
      {
        kind: "repeating-rows",
        key: "approvedBondBanks",
        label: "Approved banks",
        addLabel: "+ Add bank",
        rowFields: [{ kind: "text", key: "value", label: "Bank name", required: true }],
      },
    ],
  },
  {
    kind: "group",
    label: "Alternative Tender & RERA",
    fields: [
      { kind: "boolean", key: "alternativeTenderAllowed", label: "Alternative tender allowed (Clause 16)" },
      { kind: "boolean", key: "reraTrustAccountRequired", label: "RERA Trust Account required (Clause 14A)" },
    ],
  },
  {
    kind: "group",
    label: "Submission Schedules (Clause 8.1)",
    description: "A1–A17 + 13–17. The compliance matrix in Step 5 is seeded from this list.",
    fields: [
      {
        kind: "repeating-rows",
        key: "submissionSchedules",
        label: "Schedules",
        addLabel: "+ Add schedule",
        rowFields: [
          { kind: "text", key: "id", label: "ID", required: true, placeholder: "A1" },
          { kind: "text", key: "name", label: "Name", required: true, placeholder: "Preliminary Programme" },
          { kind: "text", key: "format", label: "Format", placeholder: "Primavera P6 / MS Project" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Form of Agreement (Appendix A)",
    fields: [
      { kind: "text", key: "engineerName", label: "Engineer name", placeholder: "Parsons Overseas Limited" },
      {
        kind: "repeating-rows",
        key: "documentPriorityOrder",
        label: "Document priority order (highest first)",
        addLabel: "+ Add document",
        rowFields: [{ kind: "text", key: "value", label: "Document", required: true }],
      },
    ],
  },
  {
    kind: "group",
    label: "Evaluation — Arithmetic Error policy (Clause 18.2)",
    fields: [
      { kind: "boolean", key: "arithmeticErrorAdjustToBoqTotal", label: "(a) Errors amended through to BOQ total" },
      { kind: "boolean", key: "arithmeticErrorLockIfBqHigher", label: "(b) Tender Sum locked if BOQ total higher" },
      { kind: "boolean", key: "arithmeticErrorAdjustIfBqLower", label: "(c) Tender Sum adjusted down if BOQ total lower" },
    ],
  },
]

// -----------------------------------------------------------------------------
// Persistor — no-op stub. Real impl in `./_persistors.ts`.
// -----------------------------------------------------------------------------

export async function persistItt(_input: Itt, _ctx: PersistContext): Promise<void> {
  // intentionally empty — see _persistors.ts
}

// -----------------------------------------------------------------------------
// DocSpec entry
// -----------------------------------------------------------------------------

export const ittSpec: DocSpec<Itt> = {
  id: "itt",
  label: "Instructions to Tenderer",
  shortLabel: "ITT",
  scope: "required",
  category: "Instructions to Tenderer",
  required: true,
  manualFeasible: "full",
  schema: ittSchema,
  manualFields: ittManualFields,
  persistor: persistItt,
  agentSpecPath: "docs/prompts/itt.md",
}
