import { cocSpec } from "./coc"
import { deviationsSpec } from "./deviations"
import { fotSpec } from "./fot"
import { ittSpec } from "./itt"
import { soprSpec } from "./sopr"
import {
  addendaSpec,
  boqPricesetSpec,
  boqTemplateSpec,
  coverLetterSpec,
  drawingsRegisterSpec,
  pteSpec,
  specificationSpec,
} from "./stubs"
import type { DocSpec } from "./types"

/**
 * The single source of truth for every document category.
 * UI, AI agent, and persistor all read from here.
 */
export const DOC_SPECS = {
  fot: fotSpec,
  itt: ittSpec,
  coc: cocSpec,
  "boq-template": boqTemplateSpec,
  "boq-priceset": boqPricesetSpec,
  pte: pteSpec,
  addenda: addendaSpec,
  "drawings-register": drawingsRegisterSpec,
  "cover-letter": coverLetterSpec,
  specification: specificationSpec,
  sopr: soprSpec,
  deviations: deviationsSpec,
} as const

export type DocSpecId = keyof typeof DOC_SPECS

/** Step 2 — Required Documents. */
export const STEP2_REQUIRED_DOCS: DocSpec<unknown>[] = [
  DOC_SPECS.fot as DocSpec<unknown>,
  DOC_SPECS.itt as DocSpec<unknown>,
  DOC_SPECS.coc as DocSpec<unknown>,
  DOC_SPECS["boq-template"] as DocSpec<unknown>,
  DOC_SPECS.sopr as DocSpec<unknown>,
  DOC_SPECS["drawings-register"] as DocSpec<unknown>,
  DOC_SPECS.specification as DocSpec<unknown>,
]

/** Step 2 — Optional / context-dependent documents. */
export const STEP2_OPTIONAL_DOCS: DocSpec<unknown>[] = [
  DOC_SPECS.pte as DocSpec<unknown>,
  DOC_SPECS.addenda as DocSpec<unknown>,
]

/** Bidder-submission documents (Step 3 + bidder portal). */
export const BIDDER_DOCS: DocSpec<unknown>[] = [
  DOC_SPECS["boq-priceset"] as DocSpec<unknown>,
  DOC_SPECS["cover-letter"] as DocSpec<unknown>,
  DOC_SPECS.deviations as DocSpec<unknown>,
]

/**
 * Lookup a spec by id ("fot") OR by its human category label ("Form of Tender").
 *
 * The id route is what app code uses internally. The category-label route
 * exists because `documents.category` stores the human label (so reports /
 * dashboards can display it without a join) — when the extraction workflow
 * reads back a `documents` row, it only has the label, not the id.
 */
export function getDocSpec(idOrCategory: DocSpecId | string): DocSpec<unknown> | null {
  const byId = (DOC_SPECS as Record<string, DocSpec<unknown>>)[idOrCategory]
  if (byId) return byId
  for (const spec of Object.values(DOC_SPECS)) {
    if (spec.category === idOrCategory) return spec as DocSpec<unknown>
  }
  return null
}
