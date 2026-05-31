import "server-only"

import { cocDiffer } from "./coc"
import { fotDiffer } from "./fot"
import { ittDiffer } from "./itt"
import { soprDiffer } from "./sopr"
import type { SpecDiffer } from "./types"

/**
 * Map from `DocSpec.id` to its differ implementation.
 *
 * New specs: define a per-spec differ alongside this file and add it
 * here. The wizard's "show me the field-level diff for this addendum
 * file" step looks up by spec.id and shows whatever differ implementation
 * exists.
 *
 * Specs not listed here (boq-template, pte, addenda itself, drawings,
 * cover letter, q&a) either go through a different pipeline already
 * (BoQ deterministic, addenda native) or aren't worth structural
 * diffing in the first cut.
 */
export const SPEC_DIFFERS: Record<string, SpecDiffer<unknown>> = {
  fot: fotDiffer as unknown as SpecDiffer<unknown>,
  itt: ittDiffer as unknown as SpecDiffer<unknown>,
  coc: cocDiffer as unknown as SpecDiffer<unknown>,
  sopr: soprDiffer as unknown as SpecDiffer<unknown>,
}

export function getSpecDiffer(specId: string): SpecDiffer<unknown> | null {
  return SPEC_DIFFERS[specId] ?? null
}

export function specHasDiffer(specId: string): boolean {
  return specId in SPEC_DIFFERS
}
