import "server-only"

import {
  extractLineItems,
  parseBoqWorkbook,
  type BoqLineItem,
} from "@/modules/procurex/boq/parser"
import {
  matchEntity,
  type EntityCandidate,
} from "@/modules/procurex/boq/entity-matcher"

/**
 * BoQ-workbook differ for Tender Addenda.
 *
 * When an addendum's manifest includes a full or partial BoQ workbook
 * replacement, we parse it with the existing parser and diff every
 * incoming row against the project's currently-effective entities. Each
 * meaningful difference produces a proposed event for the addenda
 * modal — same yellow-badge confirm-checkbox pattern as the Attachment
 * A events.
 *
 *   added                → an item exists in the new workbook with no
 *                          counterpart in the BoQ.
 *   withdrawn            → an item exists in the BoQ but is missing
 *                          from the new workbook (only fired for
 *                          sections that the new workbook fully owns;
 *                          partial replacements may legitimately omit
 *                          unchanged sections, so we DON'T mark those
 *                          as withdrawn — the caller hints which
 *                          sections were replaced via `replacedSheets`).
 *   quantity_changed     → matched entity's quantity differs.
 *   description_changed  → matched entity's description differs.
 *   unit_changed         → matched entity's unit differs.
 */

export interface ProposedDiffEvent {
  eventKind:
    | "added"
    | "withdrawn"
    | "quantity_changed"
    | "description_changed"
    | "unit_changed"
  /** Target entity id — null for "added" events (caller creates new). */
  targetItemId: string | null
  /** Free-form payload describing the change. */
  payload: Record<string, unknown>
  /** Section + item ref for display, even when targetItemId is null. */
  reference: { sectionNo: string; itemLetter: string; label: string }
  confidence: number
}

export interface BoqDiffInput {
  /** The replacement workbook bytes. */
  newBuffer: Buffer
  /** The current BoQ entities for the project. */
  candidates: EntityCandidate[]
  /** Maps `boq_item.id` → current (label, quantity, unit) so we can detect
   *  attribute changes. Caller pre-fetches these. */
  current: Map<
    string,
    { label: string; quantity: string | null; unit: string | null }
  >
  /** Set of section nos (e.g. ["2P3","2P6"]) that the addendum *fully*
   *  replaces. Items in current's section that DON'T appear in the new
   *  workbook → "withdrawn". Used by partial-replacement addenda. */
  replacedSheets?: Set<string>
}

export interface BoqDiffResult {
  events: ProposedDiffEvent[]
  /** Total rows seen in the new workbook. */
  newRowCount: number
  /** Rows that matched an existing entity. */
  matched: number
  /** Rows that didn't match (treated as additions). */
  unmatched: number
  /** Existing items detected as withdrawn. */
  withdrawn: number
  warnings: string[]
}

function normaliseNumeric(s: string | null | undefined): string | null {
  if (!s) return null
  const cleaned = s.replace(/,/g, "").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return n.toString()
}

export function diffBoqWorkbook(input: BoqDiffInput): BoqDiffResult {
  const warnings: string[] = []
  const events: ProposedDiffEvent[] = []
  let newRowCount = 0
  let matched = 0
  let unmatched = 0
  let withdrawn = 0

  // 1. Parse the new workbook and pull line items.
  const parsed = parseBoqWorkbook(input.newBuffer)
  const cfgs = parsed.sheets
    .filter((s) => !s.skipByDefault && s.headerRow !== null)
    .map((s) => ({
      name: s.name,
      included: true,
      headerRow: s.headerRow ?? 0,
      columnMap: s.columnMap,
      extraColumns: {},
    }))
  const { itemsBySheet } = extractLineItems(input.newBuffer, cfgs)

  // 2. Walk each new row, try to match, emit attribute-diff events.
  //    Track which existing entities we touched so the withdrawn check
  //    below knows what's left.
  const touchedCurrentIds = new Set<string>()
  for (const [sheetName, items] of Object.entries(itemsBySheet)) {
    for (const incoming of items) {
      newRowCount += 1
      const m = matchEntity(
        {
          sectionNo: sheetName,
          itemLetter: incoming.itemRef,
          description: incoming.description,
          unit: incoming.unit,
        },
        input.candidates,
      )
      if (m) {
        matched += 1
        touchedCurrentIds.add(m.id)
        const cur = input.current.get(m.id)
        if (!cur) continue

        const newQty = normaliseNumeric(incoming.quantity)
        const curQty = normaliseNumeric(cur.quantity)
        if (newQty !== null && curQty !== null && newQty !== curQty) {
          events.push({
            eventKind: "quantity_changed",
            targetItemId: m.id,
            payload: { old: curQty, new: newQty },
            reference: {
              sectionNo: sheetName,
              itemLetter: incoming.itemRef,
              label: incoming.description,
            },
            confidence: 0.95,
          })
        }
        if (incoming.description !== cur.label) {
          events.push({
            eventKind: "description_changed",
            targetItemId: m.id,
            payload: { old: cur.label, new: incoming.description },
            reference: {
              sectionNo: sheetName,
              itemLetter: incoming.itemRef,
              label: incoming.description,
            },
            confidence: 0.9,
          })
        }
        if (
          incoming.unit !== null &&
          cur.unit !== null &&
          incoming.unit !== cur.unit
        ) {
          events.push({
            eventKind: "unit_changed",
            targetItemId: m.id,
            payload: { old: cur.unit, new: incoming.unit },
            reference: {
              sectionNo: sheetName,
              itemLetter: incoming.itemRef,
              label: incoming.description,
            },
            confidence: 0.95,
          })
        }
      } else {
        unmatched += 1
        events.push({
          eventKind: "added",
          targetItemId: null,
          payload: {
            description: incoming.description,
            unit: incoming.unit,
            quantity: incoming.quantity,
          },
          reference: {
            sectionNo: sheetName,
            itemLetter: incoming.itemRef,
            label: incoming.description,
          },
          confidence: 0.7,
        })
      }
    }
  }

  // 3. Detect withdrawn entities, scoped to sheets that actually
  //    appear in the new workbook. Sheets the new workbook doesn't
  //    touch are left alone — otherwise a partial-replacement xlsx
  //    would flag every untouched item in the project as withdrawn.
  //    The caller can override by passing an explicit `replacedSheets`
  //    set (e.g. when they know a full-workbook replacement is intended).
  const derivedReplaced = new Set<string>()
  for (const [sheet, items] of Object.entries(itemsBySheet)) {
    if (items.length > 0) derivedReplaced.add(sheet)
  }
  const replaced = input.replacedSheets ?? derivedReplaced

  for (const candidate of input.candidates) {
    if (touchedCurrentIds.has(candidate.id)) continue
    // If the candidate's sheet is NOT one of the sheets the new
    // workbook covers, this isn't a withdrawal — the addendum just
    // doesn't speak to that sheet. Leave it.
    if (!replaced.has(candidate.sectionNo)) continue
    const cur = input.current.get(candidate.id)
    if (!cur) continue
    withdrawn += 1
    events.push({
      eventKind: "withdrawn",
      targetItemId: candidate.id,
      payload: {
        reason: `Sheet ${candidate.sectionNo} was replaced by the addendum and this item didn't appear in the new version`,
      },
      reference: {
        sectionNo: candidate.sectionNo,
        itemLetter: candidate.itemLetter,
        label: cur.label,
      },
      // We're confident the SHEET was replaced (it's in the new
      // workbook); slightly less so that the omission is intentional
      // vs the matcher just missing a fuzzy description.
      confidence: 0.8,
    })
  }

  if (newRowCount === 0) warnings.push("Replacement workbook had no line items")

  return { events, newRowCount, matched, unmatched, withdrawn, warnings }
}
