import * as XLSX from "xlsx"

import type { PreExtractResult, SourceCandidate, XlsxManifest } from "./types"

/**
 * Deterministic XLSX pre-extraction (BOQ templates, priced BOQs, PTE).
 */
export async function preExtractXlsx(
  buffer: Buffer,
  filename: string,
): Promise<PreExtractResult> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false })

  // ---------------------------------------------------------------------------
  // manifest.json
  // ---------------------------------------------------------------------------

  const sheetsManifest: XlsxManifest["sheets"] = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name]!
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1")
    const rows = range.e.r - range.s.r + 1
    const cols = range.e.c - range.s.c + 1
    const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    })
    const nonBlankRows = json.filter((row) =>
      Array.isArray(row) && row.some((c) => String(c ?? "").trim() !== ""),
    ).length
    return {
      name,
      rows,
      cols,
      non_blank_rows: nonBlankRows,
      has_header: nonBlankRows > 1 && cols >= 3,
      detected_kind: detectSheetKind(name, json),
    }
  })

  const manifest: XlsxManifest = {
    kind: "xlsx",
    filename,
    size_bytes: buffer.length,
    sheets: sheetsManifest,
    coverage_warnings: [],
  }

  // ---------------------------------------------------------------------------
  // surface.md
  // ---------------------------------------------------------------------------

  const surfaceLines: string[] = [
    `# Surface — ${filename}`,
    "",
    `Sheets: ${wb.SheetNames.length}`,
    "",
    "## Sheet index",
    "",
  ]
  for (const s of sheetsManifest) {
    surfaceLines.push(
      `- **${s.name}** — ${s.rows} rows × ${s.cols} cols · ${s.non_blank_rows} non-blank · kind=${s.detected_kind}`,
    )
  }
  surfaceLines.push("")
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]!
    const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    })
    // Sheet header includes the sheet name as an explicit ref. Each row
    // line is prefixed `R<n>` so the agent can cite `[Sheet ${name} R${n}]`.
    surfaceLines.push(`## Sheet: \`${name}\`  [ref:sheet=${name}]`)
    surfaceLines.push("")
    // Per V2-6 — no 60-row clip. Single-shot path can swallow up to ~175k
    // tokens of surface; chunked path takes over above that. Don't lose
    // BOQ line items to an arbitrary row cap.
    for (let i = 0; i < json.length; i++) {
      const row = json[i] as unknown[]
      if (!row || row.every((c) => String(c ?? "").trim() === "")) continue
      const cells = row
        .slice(0, 12)
        .map((c) => String(c ?? "").trim().slice(0, 200))
      surfaceLines.push(`R${String(i + 1).padStart(3)}: ${JSON.stringify(cells)}`)
    }
    surfaceLines.push("")
  }
  const surface = surfaceLines.join("\n")

  // ---------------------------------------------------------------------------
  // candidates.json — per-sheet candidate items
  // ---------------------------------------------------------------------------

  const candidates: Record<string, SourceCandidate[]> = {
    priceable_items: [],
    sheet_totals: [],
  }
  let pidCount = 0
  let totalCount = 0
  for (const sheetMeta of sheetsManifest) {
    if (sheetMeta.detected_kind !== "measured" && sheetMeta.detected_kind !== "general_req") {
      continue
    }
    const sheet = wb.Sheets[sheetMeta.name]!
    const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    })
    for (let i = 0; i < json.length; i++) {
      const row = json[i] as unknown[]
      if (!row) continue
      const itemLetter = String(row[0] ?? "").trim()
      const description = String(row[1] ?? "").trim()
      // Priceable: single letter in column A AND has a description.
      if (/^[A-Z]$/.test(itemLetter) && description) {
        const qty = String(row[2] ?? "").trim()
        const unit = String(row[3] ?? "").trim()
        candidates.priceable_items!.push({
          candidate_id: `item_${pidCount++}`,
          field: "priceable_items",
          raw_text: `${itemLetter} ${description}`,
          sheet: sheetMeta.name,
          cell: `A${i + 1}`,
          detection_method: "xlsx:single-letter-item",
          detection_confidence: "high",
          auto_excluded: null,
          parsed_value: { itemLetter, description, quantity: qty, unit },
        })
      } else if (unitIsCollection(row[3])) {
        candidates.sheet_totals!.push({
          candidate_id: `total_${totalCount++}`,
          field: "sheet_totals",
          raw_text: `Subtotal at R${i + 1}`,
          sheet: sheetMeta.name,
          cell: `D${i + 1}`,
          detection_method: "xlsx:to-collection-marker",
          detection_confidence: "high",
          auto_excluded: null,
        })
      }
    }
  }

  return { manifest, surface, candidates }
}

function detectSheetKind(
  name: string,
  rows: unknown[][],
): "cover" | "contents" | "summary" | "measured" | "general_req" | "unknown" {
  const n = name.trim().toLowerCase()
  if (n.startsWith("cover") || n.startsWith("fly")) return "cover"
  if (n === "contents") return "contents"
  if (n.endsWith("sum") || n.endsWith(" sum") || n === "ms") return "summary"

  // Detect by header row column count
  const headerCandidates = rows
    .slice(0, 5)
    .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? "").trim()))
  if (headerCandidates.length > 0) {
    const headerCells = (headerCandidates[0] as unknown[]).map((c) =>
      String(c ?? "").trim().toLowerCase(),
    )
    if (
      headerCells.includes("fixed cost") ||
      headerCells.includes("time related cost")
    ) {
      return "general_req"
    }
    if (
      headerCells.includes("quantity") &&
      headerCells.includes("unit") &&
      headerCells.includes("rate")
    ) {
      return "measured"
    }
  }
  return "unknown"
}

function unitIsCollection(cell: unknown): boolean {
  return String(cell ?? "").trim().toLowerCase() === "to collection"
}
