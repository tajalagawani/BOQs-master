import "server-only"

/**
 * Attachment-A parser — extracts the structured "Tenderer Queries" table
 * from an addendum cover PDF.
 *
 * Structure across the three sample addenda (TA1/TA2/TA3) — and we
 * expect this to hold across other tenders since the consultant uses
 * the same template:
 *
 *   Header:  No. | QUERY | REFERENCE | RESPONSE
 *   Body:    one row per query, multi-line cells across all columns
 *
 * Strategy:
 *   1. pdftotext --layout preserves column positions across most rows
 *   2. find the column-boundary positions from the header row
 *   3. walk each row, grouping continuation lines with their query
 *   4. parse the REFERENCE column with a regex tuned for the
 *      "Bill No XYZ, Section Name, Page N, Item L, Detail" syntax
 *
 * We accept some noise — line breaks inside cells are common. The
 * parser tries to recover by accumulating into the most-recent query
 * row until a fresh query-number line starts a new row.
 */

export interface ParsedQueryReference {
  /** "2P3", "2P6", "Refer Addendum No-1 BOQ", etc. */
  billNo: string | null
  /** "Streetscape, Soft Landscaping", "Lighting Installation". */
  partName: string | null
  page: number | null
  /** "A", "C", "F". */
  itemLetter: string | null
  /** Free-form trailing description ("Boungainvillea glabra (Orange King)"). */
  itemDetail: string | null
}

export interface ParsedQuery {
  no: string // "2.1", "3.5"
  query: string
  reference: ParsedQueryReference | null
  referenceRaw: string | null
  response: string
}

export interface AttachmentAParseResult {
  queries: ParsedQuery[]
  warnings: string[]
}

/**
 * Find the contiguous text block containing the Attachment A table.
 * Returns null if no Attachment A is in the PDF.
 */
function locateAttachmentA(pageTexts: string[]): string | null {
  const joined = pageTexts.join("\n")
  // Find the start anchor: "ATTACHMENT A" (case-insensitive).
  const anchor = joined.match(/ATTACHMENT\s+A\b[\s\S]+?TENDER\s+QUERIES/i)
  if (!anchor) return null
  // Take everything from the anchor onward — Attachment A is the last
  // section of every cover.
  return joined.slice(joined.indexOf(anchor[0]))
}

const QUERY_NO_RX = /^\s*(\d+\.\d+)\s+/

/** Parse "Bill No 2P3, Streetscape, Soft Landscaping, Page 3, Item A, Boug…" */
function parseReference(raw: string): ParsedQueryReference | null {
  const norm = raw.replace(/\s+/g, " ").trim()
  if (!norm) return null

  // Try the structured "Bill No X, …, Page N, Item L, …" form first.
  const m1 = norm.match(
    /Bill\s+No\.?\s+([A-Z0-9]+),?\s+([^,]+?(?:,\s*[^,]+?)*?),\s+Page\s+(?:No\s*-?\s*)?(\d+(?:\/[A-Z\d]+\/\d+)?),?\s+Item\s+(?:-\s*)?([A-Z\d]+(?:\s*(?:to|\&)\s*[A-Z\d]+)?)\s*,?\s*(.*)?/i,
  )
  if (m1) {
    const pageStr = m1[3]!
    const pageNum = parseInt(pageStr.match(/^\d+/)?.[0] ?? "", 10)
    return {
      billNo: m1[1]!.trim(),
      partName: m1[2]!.trim(),
      page: Number.isFinite(pageNum) ? pageNum : null,
      itemLetter: m1[4]!.trim(),
      itemDetail: (m1[5] ?? "").trim() || null,
    }
  }

  // Fallback — "STREETSCAPE - INFRASTRUCTURE, Page 2/P7/8 - Item C"
  const m2 = norm.match(
    /(.+?),\s+Page\s+(?:No\s*-?\s*)?(\S+)\s*-\s*Item\s+(?:-\s*)?([A-Z\d]+(?:\s*(?:to|\&)\s*[A-Z\d]+)?)/i,
  )
  if (m2) {
    const pageStr = m2[2]!
    const pageNum = parseInt(pageStr.match(/^\d+/)?.[0] ?? "", 10)
    return {
      billNo: null,
      partName: m2[1]!.trim(),
      page: Number.isFinite(pageNum) ? pageNum : null,
      itemLetter: m2[3]!.trim(),
      itemDetail: null,
    }
  }

  // Last resort — return whatever we have as the partName so it's not lost.
  return {
    billNo: null,
    partName: norm,
    page: null,
    itemLetter: null,
    itemDetail: null,
  }
}

/**
 * Splits the table into query records. Each line that starts with
 * `N.M ` begins a new row; following lines append to whichever column
 * we think we're in. Heuristic but works against the layout we see.
 */
function parseTableBody(block: string): ParsedQuery[] {
  // Strip the index/header rows before the first query line.
  const firstQueryIdx = block.search(/^\s*\d+\.\d+\s+/m)
  if (firstQueryIdx < 0) return []
  const body = block.slice(firstQueryIdx)
  const lines = body.split("\n")

  // Split each line into FOUR columns by clusters of whitespace.
  // pdftotext --layout preserves visual columns; we look for a column
  // change as ≥3 consecutive spaces.
  const SPLIT_RX = /\s{3,}/

  interface Row {
    no: string
    cols: string[]
  }
  const rows: Row[] = []
  let current: Row | null = null

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue
    const noMatch = rawLine.match(QUERY_NO_RX)
    if (noMatch) {
      if (current) rows.push(current)
      const rest = rawLine.replace(QUERY_NO_RX, "")
      current = { no: noMatch[1]!, cols: rest.split(SPLIT_RX).map((s) => s.trim()) }
    } else if (current) {
      // Continuation line — append to whichever columns have content.
      const parts = rawLine.split(SPLIT_RX).map((s) => s.trim())
      for (let i = 0; i < parts.length && i < 4; i += 1) {
        const p = parts[i]
        if (!p) continue
        if (current.cols[i]) current.cols[i] = `${current.cols[i]} ${p}`
        else current.cols[i] = p
      }
    }
  }
  if (current) rows.push(current)

  return rows.map((r) => {
    // Columns 1..4 = QUERY, REFERENCE, (RESPONSE), but pdftotext can
    // merge some columns when their text is wide. Best-effort guess:
    // pick the most informative slot for each field.
    const cols = r.cols.filter((c) => c)
    let query = cols[0] ?? ""
    let referenceRaw: string | null = cols[1] ?? null
    let response = cols.slice(2).join(" ") || (cols[1] ?? "")

    // If the second column doesn't look like a reference (no "Bill" /
    // "Page" / "Item"), treat it as part of the response and bail.
    if (referenceRaw && !/Bill|Page|Item|Refer|Section|Streetscape|Public/i.test(referenceRaw)) {
      response = `${referenceRaw} ${response}`.trim()
      referenceRaw = null
    }

    const reference = referenceRaw ? parseReference(referenceRaw) : null
    return {
      no: r.no,
      query: query.trim(),
      reference,
      referenceRaw,
      response: response.trim(),
    }
  })
}

/** Public entry point — accepts the page-by-page text array from cover-parser. */
export function parseAttachmentA(pageTexts: string[]): AttachmentAParseResult {
  const warnings: string[] = []
  const block = locateAttachmentA(pageTexts)
  if (!block) return { queries: [], warnings: ["No Attachment A in this PDF"] }
  const queries = parseTableBody(block)
  if (queries.length === 0) warnings.push("Attachment A located but no rows parsed")
  return { queries, warnings }
}
