/**
 * BoQ-item entity matcher.
 *
 * When a PTE or an addendum brings in a line item that may correspond
 * to an existing item already imported under the empty BoQ, we want to
 * link it to that *entity* rather than creating a parallel row. The
 * matcher takes the incoming row's identifiers (section, item letter,
 * description, unit) and returns either an existing entity id or null
 * (so the caller knows to create a new entity).
 *
 *   1. Exact (section_no, item_letter) — for files that share the BoQ's
 *      sheet naming.
 *   2. Description similarity within the same section — catches
 *      sheet-renumbered files (2P3 → 2C, etc.) by looking at the
 *      description Jaccard overlap + matching unit.
 *
 * Pure functions — no DB access. Callers preload candidates and pass
 * them in. Keeps the matcher trivial to unit-test.
 */

export interface EntityCandidate {
  id: string
  sectionNo: string
  /** Last segment of `no` after the section prefix. `2C/A` → `A`. */
  itemLetter: string
  description: string
  unit: string | null
}

export interface IncomingItem {
  sectionNo: string
  itemLetter: string
  description: string
  unit: string | null
}

/** Tokenise a description for fuzzy comparison. */
function tokenise(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s—-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/** Strip the section prefix from a `no` like `"2C/A"` → `"A"`. */
export function itemLetterOf(no: string): string {
  const idx = no.lastIndexOf("/")
  return idx >= 0 ? no.slice(idx + 1) : no
}

/** Extract section prefix from `"2C/A"` → `"2C"`. */
export function sectionNoOf(no: string): string {
  const idx = no.lastIndexOf("/")
  return idx >= 0 ? no.slice(0, idx) : ""
}

export interface MatchResult {
  id: string
  via: "exact" | "fuzzy"
  /** Jaccard score for fuzzy matches; 1.0 for exact. */
  score: number
}

const FUZZY_THRESHOLD = 0.7

/**
 * Try to match an incoming item to an existing entity from the
 * provided candidates. Returns the best match (if any).
 */
export function matchEntity(
  incoming: IncomingItem,
  candidates: EntityCandidate[],
): MatchResult | null {
  // 1. Exact section + item letter — strongest signal.
  const exact = candidates.find(
    (c) =>
      c.sectionNo === incoming.sectionNo &&
      c.itemLetter === incoming.itemLetter,
  )
  if (exact) return { id: exact.id, via: "exact", score: 1 }

  // 2. Description similarity within the same section.
  const sameSection = candidates.filter(
    (c) => c.sectionNo === incoming.sectionNo,
  )
  if (sameSection.length > 0) {
    const incomingTokens = tokenise(incoming.description)
    let best: { id: string; score: number } | null = null
    for (const c of sameSection) {
      // Require matching unit when both are present — m² vs m³ is never
      // the same item.
      if (incoming.unit && c.unit && incoming.unit !== c.unit) continue
      const score = jaccard(incomingTokens, tokenise(c.description))
      if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) {
        best = { id: c.id, score }
      }
    }
    if (best) return { id: best.id, via: "fuzzy", score: best.score }
  }

  // 3. Section-less fallback — same description across the whole
  //    project. Useful when sheet renumbering means the section prefix
  //    differs entirely (PTE 2P3 ↔ BoQ 2C). We're stricter on
  //    similarity to avoid false positives.
  const incomingTokens = tokenise(incoming.description)
  let bestCross: { id: string; score: number } | null = null
  for (const c of candidates) {
    if (c.sectionNo === incoming.sectionNo) continue
    if (incoming.unit && c.unit && incoming.unit !== c.unit) continue
    const score = jaccard(incomingTokens, tokenise(c.description))
    if (score >= 0.85 && (!bestCross || score > bestCross.score)) {
      bestCross = { id: c.id, score }
    }
  }
  if (bestCross) return { id: bestCross.id, via: "fuzzy", score: bestCross.score }

  return null
}
