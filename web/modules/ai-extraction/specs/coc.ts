import { z } from "zod"

import { softRowArray } from "./_flatten"
import { bigintLike } from "./types"
import type { DocSpec, ManualFieldConfig, PersistContext } from "./types"

// -----------------------------------------------------------------------------
// Zod schema — focused on Particular Conditions (Appendix A) values
// (the full clause body lives in document.extracted_data jsonb)
// -----------------------------------------------------------------------------

const timeRow = z.object({
  label: z.string().nullable().optional(),
  days: z.number().int().nonnegative().nullable().optional(),
})

/**
 * Flatten the agent's COC verdict into the flat schema below.
 *
 * The agent uses many shapes across runs:
 *   - { extracted: { particularConditions: { ... }, clauseN: { ... } } }
 *   - { extracted_value: { header: {...}, insurance: {...}, appB: {...}, cocClauses: [...] } }
 *   - flat at the top level
 *
 * Rather than enumerate every path, this function does a recursive
 * deep-walk and picks the first non-null match for each schema field
 * by name. Robust to whatever nesting the agent invents.
 */
function flattenCocVerdict(input: unknown): unknown {
  if (!input || typeof input !== "object") return input
  const v = input as Record<string, unknown>

  // If already flat (has any schema field at top level and no envelope keys), return as-is.
  const ENVELOPE_KEYS = new Set([
    "extracted",
    "extracted_value",
    "particularConditions",
    "appendixA",
    "appB",
    "appC",
    "header",
    "insurance",
    "cocClauses",
    "category",
    "document_id",
    "schema_version",
    "convergence",
    "coverage_warnings",
    "field_level_notes",
    "instances_examined",
  ])
  const looksNested = Object.keys(v).some((k) => ENVELOPE_KEYS.has(k))
  if (!looksNested) return v

  // Schema field names we care about. Map common alt names too.
  const aliases: Record<string, string[]> = {
    contractFormCode: ["contractFormCode"],
    contractForm: ["contractForm"],
    contractFormVersion: ["contractFormVersion", "version"],
    contractSumCents: ["contractSumCents", "contractSum", "contractAmount"],
    engineerName: ["engineerName", "engineer"],
    governingLaw: ["governingLaw", "governedBy"],
    disputeForum: ["disputeForum", "jurisdiction"],
    language: ["language", "languageOfCommunication"],
    advancePaymentPercent: ["advancePaymentPercent"],
    advancePaymentBondPercent: ["advancePaymentBondPercent"],
    performanceBondPercent: ["performanceBondPercent"],
    retentionPercent: ["retentionPercent"],
    retentionCapCents: ["retentionCapCents"],
    retentionCapPercent: ["retentionCapPercent"],
    ldPerDayCents: ["ldPerDayCents", "liquidatedDamagesPerDayCents"],
    ldCapCents: ["ldCapCents", "liquidatedDamagesCapCents"],
    ldCapPercent: ["ldCapPercent", "liquidatedDamagesCapPercent"],
    dlpMonths: ["dlpMonths", "defectsLiabilityPeriodMonths"],
    decennialLiabilityYears: ["decennialLiabilityYears"],
    fixedPrice: ["fixedPrice", "isFixedPrice"],
    documentPriorityOrder: ["documentPriorityOrder", "priorityOfDocuments"],
    insuranceMachineryAllRisksMinCents: ["machineryAllRisksMinCents"],
    insuranceWorkmensCompMinCents: ["workmensCompMinCents"],
    insuranceContractorAllRiskMinCents: ["contractorAllRiskMinCents"],
  }

  const out: Record<string, unknown> = {}
  for (const [schemaKey, names] of Object.entries(aliases)) {
    for (const name of names) {
      const found = deepFind(v, name)
      if (found !== undefined && found !== null) {
        out[schemaKey] = found
        break
      }
    }
  }
  return out
}

/**
 * Walks an arbitrary nested value looking for a property named `key`.
 * Returns the first non-null match it finds. Skips envelope/meta keys
 * so it doesn't index into noise.
 */
function deepFind(node: unknown, key: string): unknown {
  if (node === null || node === undefined) return undefined
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFind(item, key)
      if (found !== undefined && found !== null) return found
    }
    return undefined
  }
  if (typeof node !== "object") return undefined
  const rec = node as Record<string, unknown>
  if (key in rec && rec[key] !== null && rec[key] !== undefined) {
    return rec[key]
  }
  for (const v of Object.values(rec)) {
    const found = deepFind(v, key)
    if (found !== undefined && found !== null) return found
  }
  return undefined
}

const cocShape = z.object({
  contractFormCode: z.string().optional(),
  contractForm: z
    .enum(["fidic-red", "fidic-yellow", "nec", "bespoke"])
    .optional(),
  contractFormVersion: z.string().optional(),

  // Particular Conditions
  contractSumCents: bigintLike.nullable().optional(),
  engineerName: z.string().optional(),
  governingLaw: z.string().optional(),
  disputeForum: z.string().optional(),
  language: z.string().optional(),

  timesForCompletion: softRowArray(timeRow),

  advancePaymentPercent: z.number().min(0).max(100).optional(),
  advancePaymentBondPercent: z.number().min(0).max(100).optional(),
  performanceBondPercent: z.number().min(0).max(100).optional(),

  retentionPercent: z.number().min(0).max(100).optional(),
  retentionCapCents: bigintLike.nullable().optional(),
  retentionCapPercent: z.number().min(0).max(100).optional(),

  ldPerDayCents: bigintLike.nullable().optional(),
  ldCapCents: bigintLike.nullable().optional(),
  ldCapPercent: z.number().min(0).max(100).optional(),

  dlpMonths: z.number().int().positive().optional(),
  decennialLiabilityYears: z.number().int().positive().optional(),
  fixedPrice: z.boolean().optional(),

  documentPriorityOrder: z.array(z.string()).optional(),

  insuranceMachineryAllRisksMinCents: bigintLike.nullable().optional(),
  insuranceWorkmensCompMinCents: bigintLike.nullable().optional(),
  insuranceContractorAllRiskMinCents: bigintLike.nullable().optional(),

  // V2-12 — Clause text archive (every clause kept verbatim with its ref
  // so the user can drill into individual clauses post-extraction).
  clauses: z
    .array(
      z.object({
        ref: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
})

// Public schema: flatten the agent's nested envelope first, then validate
// the flat shape.
export const cocSchema = z.preprocess(flattenCocVerdict, cocShape)

export type Coc = z.infer<typeof cocSchema>

// -----------------------------------------------------------------------------
// Manual field renderer config
// -----------------------------------------------------------------------------

export const cocManualFields: ManualFieldConfig[] = [
  {
    kind: "group",
    label: "Contract identity",
    fields: [
      { kind: "text", key: "contractFormCode", label: "Contract form code", placeholder: "BO-LF-NONRERA-DC" },
      {
        kind: "select",
        key: "contractForm",
        label: "Contract form",
        options: [
          { value: "fidic-red", label: "FIDIC Red Book" },
          { value: "fidic-yellow", label: "FIDIC Yellow Book" },
          { value: "nec", label: "NEC" },
          { value: "bespoke", label: "Bespoke" },
        ],
      },
      { kind: "text", key: "contractFormVersion", label: "Version", placeholder: "February 2025 Version Rev-Sep25" },
    ],
  },
  {
    kind: "group",
    label: "Parties & Law",
    fields: [
      { kind: "text", key: "engineerName", label: "Engineer name" },
      { kind: "text", key: "governingLaw", label: "Governing law", placeholder: "UAE Federal Law / Dubai Law" },
      { kind: "text", key: "disputeForum", label: "Dispute forum", placeholder: "Dubai Courts" },
      { kind: "text", key: "language", label: "Language of communication" },
    ],
  },
  {
    kind: "group",
    label: "Contract Sum & Times for Completion",
    description: "Cross-checked against FOT Clause 1 + Clause 2.",
    fields: [
      { kind: "money", key: "contractSumCents", label: "Contract Sum (post-award; leave blank in template)", currency: "AED" },
      {
        kind: "repeating-rows",
        key: "timesForCompletion",
        label: "Times for Completion (Section / days)",
        addLabel: "+ Add section",
        rowFields: [
          { kind: "text", key: "label", label: "Section label", required: true },
          { kind: "integer", key: "days", label: "Calendar days", required: true, min: 1 },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Advance Payment & Bonds",
    fields: [
      { kind: "percent", key: "advancePaymentPercent", label: "Advance payment (%)" },
      { kind: "percent", key: "advancePaymentBondPercent", label: "Advance payment bond (%)" },
      { kind: "percent", key: "performanceBondPercent", label: "Performance bond (%)" },
    ],
  },
  {
    kind: "group",
    label: "Retention",
    fields: [
      { kind: "percent", key: "retentionPercent", label: "Retention (%)" },
      { kind: "money", key: "retentionCapCents", label: "Retention cap (amount)", currency: "AED" },
      { kind: "percent", key: "retentionCapPercent", label: "Retention cap (% of contract sum)" },
    ],
  },
  {
    kind: "group",
    label: "Liquidated Damages",
    fields: [
      { kind: "money", key: "ldPerDayCents", label: "LDs per day", currency: "AED" },
      { kind: "money", key: "ldCapCents", label: "LDs cap (amount)", currency: "AED" },
      { kind: "percent", key: "ldCapPercent", label: "LDs cap (% of contract sum)" },
    ],
  },
  {
    kind: "group",
    label: "Warranties & Performance",
    fields: [
      { kind: "integer", key: "dlpMonths", label: "Defects Liability Period (months)" },
      { kind: "integer", key: "decennialLiabilityYears", label: "Decennial Liability (years)", placeholder: "10" },
      { kind: "boolean", key: "fixedPrice", label: "Fixed price (Clause 31.1)" },
    ],
  },
  {
    kind: "group",
    label: "Document Priority Order (Clause 4.3)",
    description: "Highest priority first. Cross-checked vs ITT Appendix A.",
    fields: [
      {
        kind: "repeating-rows",
        key: "documentPriorityOrder",
        label: "Order",
        addLabel: "+ Add document",
        rowFields: [{ kind: "text", key: "value", label: "Document", required: true }],
      },
    ],
  },
  {
    kind: "group",
    label: "Insurance minimums (Appendices E / F / G)",
    fields: [
      { kind: "money", key: "insuranceMachineryAllRisksMinCents", label: "Machinery All Risks minimum", currency: "AED" },
      { kind: "money", key: "insuranceWorkmensCompMinCents", label: "Workmen's Comp minimum", currency: "AED" },
      { kind: "money", key: "insuranceContractorAllRiskMinCents", label: "Contractor's All Risk minimum", currency: "AED" },
    ],
  },
]

// -----------------------------------------------------------------------------
// Persistor — no-op stub. Real impl in `./_persistors.ts`.
// -----------------------------------------------------------------------------

export async function persistCoc(_input: Coc, _ctx: PersistContext): Promise<void> {
  // intentionally empty — see _persistors.ts
}

// -----------------------------------------------------------------------------
// DocSpec entry
// -----------------------------------------------------------------------------

export const cocSpec: DocSpec<Coc> = {
  id: "coc",
  label: "Conditions of Contract",
  shortLabel: "COC",
  scope: "required",
  category: "Conditions of Contract",
  required: true,
  manualFeasible: "partial",
  schema: cocSchema,
  manualFields: cocManualFields,
  persistor: persistCoc,
  agentSpecPath: "docs/prompts/coc.md",
}
