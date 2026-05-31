import "server-only"

import type { ParsedQueryReference } from "./attachment-a"

/**
 * Resolve a parsed Attachment-A reference ("Bill No 2P3, Soft
 * Landscaping, Page 3, Item A") to an actual `boq_item.id` (the
 * entity).
 *
 * Strategy:
 *   1. Match by (section_no = billNo, item_letter = itemLetter) on the
 *      project's BoQ template — this is the canonical path.
 *   2. Fall back to description Jaccard against itemDetail (when the
 *      reference includes the trailing detail text).
 *
 * Returns null when no plausible match exists (the modal then surfaces
 * the query as "unresolved" so the user can manually link it).
 */

import { matchEntity, type EntityCandidate } from "@/modules/procurex/boq/entity-matcher"

export interface ResolveResult {
  itemId: string
  via: "exact" | "fuzzy"
  score: number
}

export function resolveReference(
  ref: ParsedQueryReference | null,
  candidates: EntityCandidate[],
): ResolveResult | null {
  if (!ref) return null

  // Build an IncomingItem from the reference fields so we can reuse the
  // same matcher the PTE importer uses.
  const incoming = {
    sectionNo: ref.billNo ?? "",
    itemLetter: ref.itemLetter ?? "",
    description: ref.itemDetail ?? "",
    unit: null as string | null,
  }

  const match = matchEntity(incoming, candidates)
  if (!match) return null
  return { itemId: match.id, via: match.via, score: match.score }
}
