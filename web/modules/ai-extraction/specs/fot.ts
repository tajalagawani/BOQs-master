import { z } from "zod"

import { bigintLike } from "./types"
import type { DocSpec, ManualFieldConfig, PersistContext } from "./types"

// -----------------------------------------------------------------------------
// Zod schema (full FOT shape — matches docs/specs/fot.md §3)
// -----------------------------------------------------------------------------

const timeForCompletionRow = z.object({
  label: z.string().nullable().optional(),
  days: z.number().int().nonnegative().nullable().optional(),
  fromText: z.string().nullable().optional(),
  parallelText: z.string().nullable().optional(),
})

const acknowledgedAddendaRow = z.object({
  reference: z.string().nullable().optional(),
  dateOfIssue: z.string().nullable().optional(), // ISO date
})

// Signature block — fields like `name` / `inTheCapacityOf` are blank in the
// issued FOT template (the bidder fills them when responding), so make them
// nullable rather than .min(1). The agent can still emit `null` for unfilled
// slots and the validator accepts the verdict.
const signatureBlock = z.object({
  inTheCapacityOf: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  dulyAuthorisedFor: z.string().nullable().optional(),
  witnessName: z.string().nullable().optional(),
  witnessAddress: z.string().nullable().optional(),
  witnessOccupation: z.string().nullable().optional(),
  signatureImageUrl: z.string().nullable().optional(),
  witnessSignatureImageUrl: z.string().nullable().optional(),
})

// Helpers — accept `null` as well as `undefined`, since LLMs frequently emit
// `null` for empty values and zod's `.default()` only handles `undefined`.
const nullableArray = <T extends z.ZodType>(item: T) =>
  z.preprocess((v) => (v == null ? [] : v), z.array(item))
const nullableObject = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess((v) => (v == null ? {} : v), z.object(shape))

/**
 * Translate the agent's documented verdict shape (docs/specs/fot.md uses
 * a nested `extracted.clauseN.field` envelope with outer metadata like
 * `category` / `confidence` / `instances_examined`) into the flat shape
 * the zod schema below expects. Tolerates either format — runs that
 * already submit flat pass through unchanged.
 */
function flattenFotVerdict(input: unknown): unknown {
  if (!input || typeof input !== "object") return input
  const v = input as Record<string, unknown>
  // If already flat (no clauseN keys, no `extracted` envelope), pass through.
  const looksNested =
    v.extracted ||
    v.clause1 ||
    v.clause2 ||
    v.clause3 ||
    v.clause4 ||
    v.clause5 ||
    v.clause9
  if (!looksNested) return v

  const ex = (v.extracted ?? v) as Record<string, unknown>
  // Spec clause mapping (docs/specs/fot.md):
  //   clause1 → tender sum, currency, work description
  //   clause2 → times for completion, commencement
  //   clause3 → ohp markups
  //   clause4 → validity days
  //   clause9 → acknowledged addenda
  //   signatures + executionDate live at extracted top-level
  const c1 = (ex.clause1 ?? {}) as Record<string, unknown>
  const c2 = (ex.clause2 ?? {}) as Record<string, unknown>
  const c3 = (ex.clause3 ?? {}) as Record<string, unknown>
  const c4 = (ex.clause4 ?? {}) as Record<string, unknown>
  const c9 = (ex.clause9 ?? {}) as Record<string, unknown>

  // OHP markups: agent often uses `buildersWorkLumpSumNote` (docs §3) but
  // our schema calls it `buildersWorkNote`. Normalise.
  const c3VariationPercent = c3.variationProvisionalPercent ?? null
  const c3NominatedPercent = c3.nominatedSubcontractorPercent ?? null
  const c3BuildersNote =
    c3.buildersWorkNote ?? c3.buildersWorkLumpSumNote ?? null
  const ohpHasAnything =
    c3VariationPercent != null ||
    c3NominatedPercent != null ||
    c3BuildersNote != null

  const out: Record<string, unknown> = {
    tendererCompanyId: ex.tendererCompanyId ?? v.tendererCompanyId ?? null,
    tenderDate: ex.tenderDate ?? c1.tenderDate ?? v.tenderDate ?? null,
    tenderSumFigures:
      c1.tenderSumFigures ?? ex.tenderSumFigures ?? v.tenderSumFigures ?? null,
    tenderSumWords:
      c1.tenderSumWords ?? ex.tenderSumWords ?? v.tenderSumWords ?? null,
    currency: ex.currency ?? v.currency ?? c1.currency ?? null,

    timesForCompletion:
      c2.timesForCompletion ?? ex.timesForCompletion ?? v.timesForCompletion,

    ohpMarkups: ohpHasAnything
      ? {
          variationProvisionalPercent: c3VariationPercent,
          nominatedSubcontractorPercent: c3NominatedPercent,
          buildersWorkNote: c3BuildersNote,
        }
      : ex.ohpMarkups ?? v.ohpMarkups ?? {},

    validityDays: c4.validityDays ?? ex.validityDays ?? v.validityDays ?? null,

    acknowledgedAddenda:
      c9.acknowledgedAddenda ??
      ex.acknowledgedAddenda ??
      v.acknowledgedAddenda,

    executionDate: ex.executionDate ?? v.executionDate ?? null,

    signatures: ex.signatures ?? v.signatures,
  }

  return out
}

const fotShape = z.object({
  // Bidder-filled fields — blank in the issued template.
  tendererCompanyId: z.string().nullable().optional(),
  tenderDate: z.string().nullable().optional(),
  tenderSumFigures: bigintLike.nullable().optional(),
  tenderSumWords: z.string().nullable().optional(),

  // ── All fields below are optional: a partial / template FOT may not
  //    carry them. Missing fields render as empty inputs in the Review
  //    modal and the user fills them by hand. ──
  //
  currency: z.string().nullable().optional(),
  timesForCompletion: nullableArray(timeForCompletionRow),
  validityDays: z.number().int().positive().nullable().optional(),
  //
  // ohpMarkups: §3 carries the variation + nominated-subcontractor
  //   percentages. Either may be absent in short / template FOTs — keep
  //   the object optional; the user fills missing values manually.
  ohpMarkups: nullableObject({
    variationProvisionalPercent: z
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    nominatedSubcontractorPercent: z
      .number()
      .min(0)
      .max(100)
      .nullable()
      .optional(),
    buildersWorkNote: z.string().nullable().optional(),
  }),

  acknowledgedAddenda: nullableArray(acknowledgedAddendaRow),

  // Bidder-filled — blank in template.
  executionDate: z.string().nullable().optional(),
  signatures: nullableArray(signatureBlock),

  // V2-12 — Clause text archive (every clause kept verbatim with its ref).
  clauses: z
    .array(z.object({ ref: z.string(), text: z.string() }))
    .optional(),
})

// Public schema: flatten the agent's nested envelope first, then validate
// against the flat shape above. Either shape passes — runs that already
// emit flat go through unchanged.
export const fotSchema = z.preprocess(flattenFotVerdict, fotShape)

export type Fot = z.infer<typeof fotSchema>

// -----------------------------------------------------------------------------
// Manual field renderer config (matches docs/specs/fot.md §4)
// -----------------------------------------------------------------------------

export const fotManualFields: ManualFieldConfig[] = [
  {
    kind: "group",
    label: "Tenderer identity",
    fields: [
      {
        kind: "date",
        key: "tenderDate",
        label: "Tender date",
      },
      {
        kind: "company-picker",
        key: "tendererCompanyId",
        label: "Tenderer (legal name)",
      },
    ],
  },
  {
    kind: "group",
    label: "Tender Sum",
    description: "Clause 1 of the FOT.",
    fields: [
      {
        kind: "money",
        key: "tenderSumFigures",
        label: "Tender sum (figures)",
        currency: "AED",
      },
      {
        kind: "textarea",
        key: "tenderSumWords",
        label: "Tender sum (words)",
        hint: "Must round-trip to the figures (words prevail per Clause 6).",
      },
      {
        kind: "select",
        key: "currency",
        label: "Currency",
        required: true,
        options: [
          { value: "AED", label: "AED" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
          { value: "SAR", label: "SAR" },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Time for Completion",
    description: "Clause 2 — one row per Section of the Works.",
    fields: [
      {
        kind: "repeating-rows",
        key: "timesForCompletion",
        label: "Sections",
        addLabel: "+ Add section",
        rowFields: [
          { kind: "text", key: "label", label: "Label", required: true },
          { kind: "integer", key: "days", label: "Calendar days", required: true, min: 1 },
          { kind: "text", key: "fromText", label: "From", placeholder: "Commencement Date" },
          { kind: "text", key: "parallelText", label: "Parallel note", placeholder: "Only Engineering and Authority Approvals…" },
        ],
        minRows: 1,
      },
    ],
  },
  {
    kind: "group",
    label: "OHP Markup",
    description: "Clause 3 — applies to Variation Orders, Provisional Sums, and Nominated Subcontractors.",
    fields: [
      {
        kind: "percent",
        key: "ohpMarkups.variationProvisionalPercent",
        label: "Variation / Provisional Sums OHP (%)",
        required: true,
        min: 0,
        max: 100,
      },
      {
        kind: "percent",
        key: "ohpMarkups.nominatedSubcontractorPercent",
        label: "Nominated Subcontractor OHP (%)",
        required: true,
        min: 0,
        max: 100,
      },
      {
        kind: "textarea",
        key: "ohpMarkups.buildersWorkNote",
        label: "Builders work note",
        hint: "Optional — e.g. fixed price lump sum from Provisional Sum Bill",
      },
    ],
  },
  {
    kind: "group",
    label: "Validity & Acknowledged Addenda",
    fields: [
      {
        kind: "integer",
        key: "validityDays",
        label: "Validity (days)",
        required: true,
        min: 1,
      },
      {
        kind: "repeating-rows",
        key: "acknowledgedAddenda",
        label: "Addenda acknowledged",
        addLabel: "+ Add addendum",
        rowFields: [
          { kind: "text", key: "reference", label: "Reference", required: true },
          { kind: "date", key: "dateOfIssue", label: "Date of issue", required: true },
        ],
      },
    ],
  },
  {
    kind: "group",
    label: "Signatures",
    description: "Execution block. JV bidders add one block per JV member.",
    fields: [
      {
        kind: "date",
        key: "executionDate",
        label: "Execution date",
      },
      {
        kind: "repeating-rows",
        key: "signatures",
        label: "Signature blocks",
        addLabel: "+ Add signature block",
        rowFields: [
          { kind: "text", key: "inTheCapacityOf", label: "In the capacity of", required: true },
          { kind: "text", key: "name", label: "Name", required: true },
          { kind: "text", key: "dulyAuthorisedFor", label: "Duly authorised for", required: true },
          { kind: "text", key: "witnessName", label: "Witness name" },
          { kind: "text", key: "witnessAddress", label: "Witness address" },
          { kind: "text", key: "witnessOccupation", label: "Witness occupation" },
        ],
        minRows: 1,
      },
    ],
  },
]

// -----------------------------------------------------------------------------
// Persistor — no-op stub. The real implementation lives in
// `./_persistors.ts` and is dispatched via `getPersistor(spec.id)` by
// workflow/action code. Spec files stay client-safe so the Step 2 client
// bundle doesn't pull in `pg` through `@/modules/core/db`.
// -----------------------------------------------------------------------------

export async function persistFot(_input: Fot, _ctx: PersistContext): Promise<void> {
  // intentionally empty — see _persistors.ts
}

// -----------------------------------------------------------------------------
// DocSpec entry
// -----------------------------------------------------------------------------

export const fotSpec: DocSpec<Fot> = {
  id: "fot",
  label: "Form of Tender",
  shortLabel: "FOT",
  scope: "required",
  category: "Form of Tender",
  required: true,
  manualFeasible: "full",
  schema: fotSchema,
  manualFields: fotManualFields,
  persistor: persistFot,
  agentSpecPath: "docs/prompts/fot.md",
}
