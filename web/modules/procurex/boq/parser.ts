import * as XLSX from "xlsx"

/**
 * Deterministic BoQ workbook parser.
 *
 * Reads a `.xlsx` and returns one record per sheet, each with:
 *   - first ~25 rows (the modal's preview grid)
 *   - the auto-detected header row index
 *   - the auto-mapped column letters → canonical fields
 *   - the detected currency from the rate-column label ("Rate AED" → "AED")
 *
 * Canonical fields are the six the Step 2 BoQ ships with: itemRef,
 * description, quantity, unit, rate, amount. Anything else the user wants
 * to capture goes through `extraFields` in the modal — the parser doesn't
 * try to be clever about non-canonical columns.
 *
 * No AI — pure text-matching. If a sheet has no recognisable header it
 * comes back with `headerRow: null, columnMap: {}` and the modal lets the
 * user either skip it or map it manually.
 */

export type BoqField = "itemRef" | "description" | "quantity" | "unit" | "rate" | "amount"

/** Patterns that identify each canonical field by its header-cell text. */
const HEADER_PATTERNS: Record<BoqField, RegExp> = {
  itemRef: /^\s*item(\s*ref)?\s*$/i,
  description: /^\s*description\s*$/i,
  quantity: /^\s*(quantity|qty)\s*$/i,
  unit: /^\s*unit\s*$/i,
  rate: /^\s*rate(\s+[A-Z]{3})?\s*$/i,
  amount: /^\s*amount(\s+[A-Z]{3})?\s*$/i,
}

/** Currency codes pulled out of a "Rate AED" / "Amount AED" cell. */
const CURRENCY_RX = /\b([A-Z]{3})\b/

/** Sheet-name patterns we auto-mark as "skip" (front matter + summaries). */
const SKIP_NAME_RX = /^(cover|contents|fly[\s-]|.*\s+sum$|^ms$|notes?|index)/i

const PREVIEW_ROWS = 25

export interface SheetPreviewRow {
  /** 0-indexed source row from the xlsx. */
  rowIndex: number
  /** Per-column cell values as strings (empty string for blanks). */
  cells: string[]
}

export interface SheetPreview {
  name: string
  /** Total non-empty cells' row count from the sheet. */
  totalRows: number
  /** Row index of the detected header row, or null if not found. */
  headerRow: number | null
  /** Map of column letter (A, B, …) → canonical field. */
  columnMap: Partial<Record<string, BoqField>>
  /** Currency detected on the Rate/Amount header ("AED"). */
  detectedCurrency: string | null
  /** Whether the parser thinks this sheet should be skipped by default
   *  (cover/contents/summary). User can still tick it on in the modal. */
  skipByDefault: boolean
  /** First N rows for the preview grid in the modal. */
  preview: SheetPreviewRow[]
  /** Estimated number of data rows below the header (rough). */
  estimatedDataRows: number
}

export interface ParsedWorkbook {
  sheetCount: number
  /** Sheet name → preview record. Order matches workbook order. */
  sheets: SheetPreview[]
  /** Currency seen in most sheets — used as the modal's default. */
  workbookCurrency: string | null
}

/** Convert a 0-indexed column number to an Excel letter (0→A, 25→Z, 26→AA). */
export function colLetter(idx: number): string {
  let s = ""
  let n = idx
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  }
  return s
}

/** Inverse of colLetter. */
export function colIndex(letter: string): number {
  let n = 0
  for (const c of letter.toUpperCase()) {
    n = n * 26 + (c.charCodeAt(0) - 64)
  }
  return n - 1
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim()
  if (typeof v === "number") return String(v)
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE"
  return String(v).replace(/\s+/g, " ").trim()
}

/**
 * Scan the first ~10 rows of a sheet for a row that matches every canonical
 * BoQ field (Item / Description / Quantity / Unit / Rate / Amount). Returns
 * the column-letter mapping + detected currency.
 */
function detectHeader(rows: string[][]): {
  headerRow: number | null
  columnMap: Partial<Record<string, BoqField>>
  detectedCurrency: string | null
} {
  const fields = Object.keys(HEADER_PATTERNS) as BoqField[]

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r]!
    const found: Partial<Record<BoqField, string>> = {}
    let currency: string | null = null

    for (let c = 0; c < row.length; c++) {
      const cell = cellToString(row[c])
      if (!cell) continue
      for (const f of fields) {
        if (!found[f] && HEADER_PATTERNS[f].test(cell)) {
          found[f] = colLetter(c)
          if ((f === "rate" || f === "amount") && !currency) {
            const m = cell.match(CURRENCY_RX)
            if (m) currency = m[1]!
          }
          break
        }
      }
    }

    // A real BoQ header has at LEAST these four: itemRef, description,
    // quantity, unit. Rate/Amount can be missing on summary-only views.
    if (found.itemRef && found.description && found.quantity && found.unit) {
      const columnMap: Partial<Record<string, BoqField>> = {}
      for (const [field, letter] of Object.entries(found)) {
        if (letter) columnMap[letter] = field as BoqField
      }
      return { headerRow: r, columnMap, detectedCurrency: currency }
    }
  }

  return { headerRow: null, columnMap: {}, detectedCurrency: null }
}

/**
 * Rough estimate of how many *data* rows live below the header. Walks
 * downward, counts rows where the Item-Ref column has a short
 * alphanumeric value (i.e. real items, not banner / sub-heading rows).
 */
function estimateDataRows(
  rows: string[][],
  headerRow: number,
  columnMap: Partial<Record<string, BoqField>>,
): number {
  const itemCol = Object.entries(columnMap).find(([, f]) => f === "itemRef")?.[0]
  if (!itemCol) return 0
  const itemColIdx = colIndex(itemCol)
  let count = 0
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (row.some((c) => isEndOfSheetRow(c))) break
    if (row.some((c) => isSubtotalRow(c))) continue
    const v = cellToString(row[itemColIdx])
    if (!v) continue
    if (v.length <= 6 && /[A-Za-z0-9]/.test(v)) count += 1
  }
  return count
}

/**
 * Parse a `.xlsx` buffer into the modal-friendly shape.
 *
 * Cheap (~50 ms on a 1.2 MB workbook with 37 sheets). Safe to call from a
 * server action on every modal open — no caching needed.
 */
export function parseBoqWorkbook(buffer: Buffer): ParsedWorkbook {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false })
  const sheets: SheetPreview[] = []
  const currencyVotes: Record<string, number> = {}

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true,
    }) as unknown[][]

    // Normalise once — every consumer below wants strings.
    const stringRows: string[][] = rows.map((r) => r.map((c) => cellToString(c)))

    const totalRows = stringRows.filter((r) => r.some((c) => c)).length
    const { headerRow, columnMap, detectedCurrency } = detectHeader(stringRows)
    const skipByDefault =
      SKIP_NAME_RX.test(name) || headerRow === null
    const estimatedDataRows =
      headerRow !== null ? estimateDataRows(stringRows, headerRow, columnMap) : 0

    if (detectedCurrency) {
      currencyVotes[detectedCurrency] =
        (currencyVotes[detectedCurrency] ?? 0) + 1
    }

    const preview: SheetPreviewRow[] = []
    for (let i = 0; i < Math.min(stringRows.length, PREVIEW_ROWS); i++) {
      preview.push({ rowIndex: i, cells: stringRows[i]! })
    }

    sheets.push({
      name,
      totalRows,
      headerRow,
      columnMap,
      detectedCurrency,
      skipByDefault,
      preview,
      estimatedDataRows,
    })
  }

  const workbookCurrency =
    Object.entries(currencyVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    sheetCount: wb.SheetNames.length,
    sheets,
    workbookCurrency,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Row extraction — turn a confirmed mapping into line items.
// ─────────────────────────────────────────────────────────────────────────

export interface BoqLineItem {
  sheetName: string
  /** 0-indexed row in the source xlsx. */
  sourceRow: number
  itemRef: string
  description: string
  unit: string | null
  /** Quantity as a decimal string so we don't lose precision. */
  quantity: string | null
  /** Rate in cents (null for empty BoQ templates). */
  rateCents: bigint | null
  amountCents: bigint | null
  /** Extra mapped columns (column letter → value). */
  extra: Record<string, string> | null
}

export interface SheetMapping {
  name: string
  included: boolean
  headerRow: number
  /** Column letter → canonical field. */
  columnMap: Partial<Record<string, BoqField>>
  /** Column letter → label (extra columns the user named). */
  extraColumns: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────
// Validation — does a PTE workbook line up with a previously-imported
// empty BoQ?
// ─────────────────────────────────────────────────────────────────────────

/** A simplified "what's in this template" snapshot the validator can
 *  compare against. The caller assembles this from boq_section +
 *  boq_item DB reads — the parser stays I/O-free. */
export interface BoqStructureSnapshot {
  sections: Array<{
    no: string
    items: Array<{ no: string; label: string }>
  }>
}

export interface PteValidationReport {
  /** Sheets we successfully aligned to a BoQ section. */
  matched: Array<{
    pteSheet: string
    boqSection: string
    /** Items the PTE has that we found in the BoQ section. */
    itemsMatched: number
    /** Items in this PTE sheet that have no counterpart in the BoQ
     *  section (by leaf-description similarity). */
    itemsMissed: number
    /** Items in the BoQ section that don't appear in this PTE sheet. */
    itemsExtraInBoq: number
  }>
  /** Sheets in PTE that have no plausible match in BoQ. */
  pteOnlySheets: Array<{ pteSheet: string; items: number }>
  /** Sections in BoQ that no PTE sheet matched. */
  boqOnlySections: Array<{ boqSection: string; items: number }>
  /** Overall alignment 0..1 — share of PTE items that found a counterpart. */
  overallScore: number
  /** Quick verdict for the modal banner. */
  verdict: "match" | "partial" | "mismatch"
}

/** Tokens used for description similarity. Strips punctuation, lower-
 *  cases, drops short words. */
function tokenise(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\s—-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  )
}

/** Jaccard similarity between two token sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

/**
 * Validate a parsed PTE workbook against the empty-BoQ structure already
 * stored in the DB. The matcher works in two stages so divergent sheet-
 * naming conventions (BoQ uses `2B/2C/2E`, PTE uses `2P2/2P3/2P4`) still
 * align — first try exact-name match on the section number, then fall
 * back to a description-overlap score that asks "which BoQ section
 * shares the most item descriptions with this PTE sheet?"
 */
export function validatePteAgainstBoq(
  pteItemsBySheet: Record<string, BoqLineItem[]>,
  boqSnapshot: BoqStructureSnapshot,
): PteValidationReport {
  const matched: PteValidationReport["matched"] = []
  const pteOnlySheets: PteValidationReport["pteOnlySheets"] = []
  const usedBoqSections = new Set<string>()

  // Pre-tokenise BoQ items per section so we don't re-tokenise on every
  // PTE sheet comparison.
  const boqTokensBySection = new Map<
    string,
    Array<{ no: string; tokens: Set<string>; label: string }>
  >()
  for (const sec of boqSnapshot.sections) {
    boqTokensBySection.set(
      sec.no,
      sec.items.map((it) => ({
        no: it.no,
        tokens: tokenise(it.label),
        label: it.label,
      })),
    )
  }

  let totalPteItems = 0
  let totalMatched = 0

  for (const [pteSheet, items] of Object.entries(pteItemsBySheet)) {
    if (items.length === 0) continue
    totalPteItems += items.length

    // Stage 1 — exact section-no match. Strip "P" prefixes/numbers from
    // PTE sheet names so `2P3` lines up with `2C`-ish heuristics if you
    // ever set up that mapping. For now we just try the raw name.
    let matchSection: typeof boqSnapshot.sections[number] | null = null
    for (const sec of boqSnapshot.sections) {
      if (sec.no === pteSheet && !usedBoqSections.has(sec.no)) {
        matchSection = sec
        break
      }
    }

    // Stage 2 — best description-overlap among unused BoQ sections.
    if (!matchSection) {
      let bestScore = 0
      let best: typeof boqSnapshot.sections[number] | null = null
      const pteSheetTokens = items.map((it) => tokenise(it.description))
      for (const sec of boqSnapshot.sections) {
        if (usedBoqSections.has(sec.no)) continue
        const secTokens = boqTokensBySection.get(sec.no) ?? []
        if (secTokens.length === 0) continue

        // Sum the best-per-item similarity score: for each PTE item find
        // the closest BoQ item in this section, sum those scores, divide
        // by the larger of the two item counts.
        let totalSim = 0
        for (const pt of pteSheetTokens) {
          let bestItemSim = 0
          for (const bq of secTokens) {
            const sim = jaccard(pt, bq.tokens)
            if (sim > bestItemSim) bestItemSim = sim
          }
          totalSim += bestItemSim
        }
        const denom = Math.max(items.length, secTokens.length)
        const score = denom > 0 ? totalSim / denom : 0
        if (score > bestScore) {
          bestScore = score
          best = sec
        }
      }
      // 0.35 is empirically "the PTE sheet shares about a third of its
      // descriptions with this BoQ section" — low enough to catch the
      // 2P3 ↔ 2C-style cases but not so low it matches randomly.
      if (best && bestScore >= 0.35) {
        matchSection = best
      }
    }

    if (!matchSection) {
      pteOnlySheets.push({ pteSheet, items: items.length })
      continue
    }
    usedBoqSections.add(matchSection.no)

    // Count item-level matches inside the matched section.
    const secTokens = boqTokensBySection.get(matchSection.no) ?? []
    const matchedBoqItems = new Set<string>()
    let itemsMatched = 0
    for (const pt of items) {
      const pteTokens = tokenise(pt.description)
      let bestSim = 0
      let bestNo: string | null = null
      for (const bq of secTokens) {
        if (matchedBoqItems.has(bq.no)) continue
        const sim = jaccard(pteTokens, bq.tokens)
        if (sim > bestSim) {
          bestSim = sim
          bestNo = bq.no
        }
      }
      if (bestSim >= 0.5 && bestNo) {
        itemsMatched += 1
        matchedBoqItems.add(bestNo)
      }
    }
    totalMatched += itemsMatched
    matched.push({
      pteSheet,
      boqSection: matchSection.no,
      itemsMatched,
      itemsMissed: items.length - itemsMatched,
      itemsExtraInBoq: secTokens.length - itemsMatched,
    })
  }

  const boqOnlySections = boqSnapshot.sections
    .filter((sec) => !usedBoqSections.has(sec.no))
    .map((sec) => ({ boqSection: sec.no, items: sec.items.length }))

  const overallScore = totalPteItems === 0 ? 1 : totalMatched / totalPteItems
  const verdict: PteValidationReport["verdict"] =
    overallScore >= 0.9
      ? "match"
      : overallScore >= 0.5
        ? "partial"
        : "mismatch"

  return {
    matched,
    pteOnlySheets,
    boqOnlySections,
    overallScore,
    verdict,
  }
}

/** Parse a currency-like string ("1,420.50", "(2,340)") to cents. */
function moneyToCents(raw: string): bigint | null {
  const cleaned = raw.replace(/[,_\s]/g, "").replace(/^[(](.*)[)]$/, "-$1")
  if (!cleaned || cleaned === "-" || cleaned === ".") return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return BigInt(Math.round(n * 100))
}

/**
 * Normalise an xlsx-formatted quantity string ("42,268", "1,420.50",
 * " 250 ") to a plain decimal string Postgres `numeric` will accept.
 * Returns null on blank / unparseable cells so the row's quantity_planned
 * lands as NULL instead of crashing the insert.
 */
function quantityToString(raw: string | null | undefined): string | null {
  if (!raw) return null
  const cleaned = raw.replace(/[,_\s]/g, "").replace(/^[(](.*)[)]$/, "-$1")
  if (!cleaned || cleaned === "-" || cleaned === ".") return null
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  // Round-tripping through Number drops scientific notation; keep enough
  // precision for typical BoQ figures (up to 6 dp).
  return n.toString()
}

/** Hard stop — these appear ONCE at the bottom of a sheet. */
function isEndOfSheetRow(text: string): boolean {
  return /^(carried\s+to\s+summary|grand\s+total|to\s+main\s+summary)$/i.test(text)
}

/**
 * Does this column-B text look like a real specification (the parent
 * description for the items below it), as opposed to a section header,
 * a sub-section label, or a note? Used by extractLineItems to decide
 * whether to capture this row as the running "parent" prefix.
 *
 *   - "FINISHES"                                       → header (all caps)
 *   - "Site works"                                     → label (too short)
 *   - "Note: Refer to the following."                  → note prefix
 *   - "1. Landscape specification"                     → numbered note
 *   - "Fair faced with matte sealer finish; to …"      → ✓ parent
 *   - "Plain concrete; concrete strength C20, …"       → ✓ parent
 */
function looksLikeParentSpec(text: string): boolean {
  const t = text.trim()
  if (t.length < 25) return false
  if (/^\s*note[:\s]/i.test(t)) return false
  if (/^\s*\d+\./.test(t)) return false
  // All-uppercase strings are section/subsection headers; case-sensitive
  // mixed-case strings are real spec text.
  if (/[A-Z]/.test(t) && t === t.toUpperCase()) return false
  return true
}

/** Soft divider — these appear MULTIPLE TIMES within one sheet between
 *  sub-bills (each sub-bill has its own subtotal that flows to the
 *  sheet's collection page). They must be skipped, not used to stop. */
function isSubtotalRow(text: string): boolean {
  return /^(to\s+collection|carried\s+forward|sub[\s-]?total|total\s+(for|carried))/i.test(
    text,
  )
}

/**
 * Apply confirmed mappings to a workbook buffer and emit line items in
 * stable order. The caller is responsible for the boq_template + section
 * inserts; this returns ONLY the per-item shape so the import logic can
 * batch-insert in one go.
 */
export function extractLineItems(
  buffer: Buffer,
  sheets: SheetMapping[],
): { itemsBySheet: Record<string, BoqLineItem[]>; totalItems: number } {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false })
  const itemsBySheet: Record<string, BoqLineItem[]> = {}
  let totalItems = 0

  for (const cfg of sheets) {
    if (!cfg.included) continue
    const sheet = wb.Sheets[cfg.name]
    if (!sheet) continue

    const itemCol = Object.entries(cfg.columnMap).find(([, f]) => f === "itemRef")?.[0]
    const descCol = Object.entries(cfg.columnMap).find(([, f]) => f === "description")?.[0]
    if (!itemCol || !descCol) {
      itemsBySheet[cfg.name] = []
      continue
    }

    const qtyCol = Object.entries(cfg.columnMap).find(([, f]) => f === "quantity")?.[0]
    const unitCol = Object.entries(cfg.columnMap).find(([, f]) => f === "unit")?.[0]
    const rateCol = Object.entries(cfg.columnMap).find(([, f]) => f === "rate")?.[0]
    const amountCol = Object.entries(cfg.columnMap).find(([, f]) => f === "amount")?.[0]

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true,
    }) as unknown[][]
    const stringRows: string[][] = rows.map((r) => r.map((c) => cellToString(c)))

    const items: BoqLineItem[] = []
    // Track the most-recent "specification" line above the current cursor.
    // In a BoQ, each item row carries only a SHORT leaf label ("Horizontally",
    // "Blinding 50mm thick") — the full meaning lives in the parent line
    // above it ("Fair faced sealer finish; to landscape walls, medium
    // grey colour; including preparation … — Horizontally"). We capture
    // that parent here and prepend it to the item's description, which
    // is what tenderers actually price against.
    let lastParent: string | null = null
    for (let r = cfg.headerRow + 1; r < stringRows.length; r++) {
      const row = stringRows[r]!
      const itemRef = row[colIndex(itemCol)] ?? ""
      const leafDesc = (descCol ? row[colIndex(descCol)] : "") ?? ""

      // Hard stop — final summary marker at the bottom of the sheet.
      if (row.some((c) => isEndOfSheetRow(c))) break
      // Soft divider — subtotal between sub-bills within this sheet.
      // A new sub-bill may have its own parent spec, so drop the carry-
      // over so we don't mis-attribute the previous bill's spec.
      if (row.some((c) => isSubtotalRow(c))) {
        lastParent = null
        continue
      }

      // Non-item row with description content — candidate for "parent
      // spec". If it looks like a real spec line (long enough, not a
      // section header, not a note), remember it. Section headers and
      // notes are skipped so they don't poison the prefix.
      if (!itemRef && leafDesc) {
        if (looksLikeParentSpec(leafDesc)) {
          lastParent = leafDesc
        }
        continue
      }

      // Need both an item ref AND a leaf description to count as a real row.
      if (!itemRef || itemRef.length > 6 || !leafDesc) continue

      const extra: Record<string, string> = {}
      for (const [letter, label] of Object.entries(cfg.extraColumns)) {
        const v = row[colIndex(letter)]
        if (v) extra[label] = v
      }

      const fullDescription = lastParent
        ? `${lastParent} — ${leafDesc}`
        : leafDesc

      items.push({
        sheetName: cfg.name,
        sourceRow: r,
        itemRef,
        description: fullDescription,
        unit: unitCol ? row[colIndex(unitCol)] ?? null : null,
        quantity: qtyCol ? quantityToString(row[colIndex(qtyCol)]) : null,
        rateCents: rateCol ? moneyToCents(row[colIndex(rateCol)] ?? "") : null,
        amountCents: amountCol ? moneyToCents(row[colIndex(amountCol)] ?? "") : null,
        extra: Object.keys(extra).length ? extra : null,
      })
    }

    itemsBySheet[cfg.name] = items
    totalItems += items.length
  }

  return { itemsBySheet, totalItems }
}
