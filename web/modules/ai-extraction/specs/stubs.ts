import { z } from "zod"

import type { DocSpec, PersistContext } from "./types"

/**
 * Stub specs for categories whose full schema lands in later tickets.
 * Each stub:
 *   - uses `z.unknown()` as its schema (validator is a no-op pass-through)
 *   - sets `manualFeasible` per docs/specs/<id>.md §1
 *   - renders a "manual coming soon" readonly note in the UI
 *   - stub persistor logs only
 *
 * Replaced category-by-category in D8 + D9.
 */

const stubSchema = z.unknown()

async function noopPersist(input: unknown, ctx: PersistContext): Promise<void> {
  console.log("[stub.persist]", { category: ctx.documentId, input })
}

export const boqTemplateSpec: DocSpec<unknown> = {
  id: "boq-template",
  label: "Blank BOQ / Pricing Schedule",
  shortLabel: "BOQ-T",
  scope: "required",
  category: "Blank BOQ / Pricing Schedule",
  required: true,
  manualFeasible: "no",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "BOQ templates have thousands of items across 30+ sheets. Manual entry is not supported. Please use Upload.",
      severity: "warning",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/boq-template.md",
}

export const boqPricesetSpec: DocSpec<unknown> = {
  id: "boq-priceset",
  label: "Priced BOQ",
  shortLabel: "BOQ-P",
  scope: "bidder_submission",
  category: "Priced BOQ",
  required: false,
  manualFeasible: "partial",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Line-item rates must come from the uploaded Excel. Manual entry of the Main Summary total lands in D8.",
      severity: "info",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/boq-priceset.md",
}

export const pteSpec: DocSpec<unknown> = {
  id: "pte",
  label: "Pre-Tender Estimate",
  shortLabel: "PTE",
  scope: "pte",
  category: "Pre-Tender Estimate",
  required: false,
  manualFeasible: "partial",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Manual entry of PTE section totals lands in D8. Use Upload for the full XLSX.",
      severity: "info",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/pte.md",
}

export const addendaSpec: DocSpec<unknown> = {
  id: "addenda",
  label: "Tender Addenda",
  shortLabel: "TA",
  scope: "ta",
  category: "Tender Addendum",
  required: false,
  manualFeasible: "full",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Manual entry for Tender Addenda lands in D8.",
      severity: "info",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/addenda.md",
}

export const drawingsRegisterSpec: DocSpec<unknown> = {
  id: "drawings-register",
  label: "Drawings Register",
  shortLabel: "DR",
  scope: "required",
  category: "Drawings Register",
  required: true,
  manualFeasible: "full",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Manual entry for the drawings register lands in D8. Bulk paste / CSV import will also be supported.",
      severity: "info",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/drawings-register.md",
}

export const coverLetterSpec: DocSpec<unknown> = {
  id: "cover-letter",
  label: "Cover Letter",
  shortLabel: "CL",
  scope: "bidder_submission",
  category: "Cover Letter",
  required: false,
  manualFeasible: "full",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Manual entry for the cover letter lands in D8.",
      severity: "info",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/cover-letter.md",
}

export const specificationSpec: DocSpec<unknown> = {
  id: "specification",
  label: "Technical Specification",
  shortLabel: "SPEC",
  scope: "required",
  category: "Technical Specification",
  required: true,
  manualFeasible: "no",
  schema: stubSchema,
  manualFields: [
    {
      kind: "readonly-note",
      text: "Specifications use CSI MasterFormat with 20+ sections × 3 parts each. Manual entry is not supported. Use Upload.",
      severity: "warning",
    },
  ],
  persistor: noopPersist,
  agentSpecPath: "docs/prompts/specification.md",
}

