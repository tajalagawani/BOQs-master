import "server-only"

import * as XLSX from "xlsx"

/**
 * Split an xlsx workbook into one single-sheet workbook per sheet,
 * returning each as a fresh Buffer the agent can be invoked against.
 *
 * Used by `extract-document.ts` when a spec opts into
 * `chunkStrategy: "sheet"` — the workflow then runs the agent once per
 * sheet and merges the verdicts. Splitting at the workbook level (vs
 * sending markdown of one sheet) means the agent still receives a
 * proper xlsx and can use whichever XLSX-aware preprocessing the
 * runner does, no special-casing.
 *
 * Skips workbooks whose magic bytes don't look like a ZIP (xlsx is ZIP
 * under the hood). For PDFs / docx / anything else, the caller falls
 * back to whole-document extraction.
 */
export function isXlsxBuffer(buf: Buffer): boolean {
  // ZIP files start with the local-file-header signature PK\x03\x04.
  if (buf.length < 4) return false
  return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
}

export interface XlsxSheetChunk {
  /** Sheet name as it appears in the workbook (e.g. "2P10", "MS"). */
  name: string
  /** A standalone xlsx Buffer containing only this sheet. */
  buffer: Buffer
  /** Original index in the source workbook — useful for ordering and
   *  for cross-chunk error reporting. */
  index: number
}

/**
 * Splits an xlsx Buffer by sheet. Returns one chunk per sheet, each a
 * standalone xlsx workbook with exactly one tab. Sheet names are
 * preserved verbatim so the merger can attribute deviations back to
 * their source tab.
 *
 * Cells, formulas, and column widths are preserved by re-writing the
 * workbook via `XLSX.write` with `bookSST` disabled (smaller output;
 * the agent doesn't care about shared-string optimisation).
 */
export function splitXlsxBySheet(buf: Buffer): XlsxSheetChunk[] {
  if (!isXlsxBuffer(buf)) return []
  const wb = XLSX.read(buf, { type: "buffer" })
  const chunks: XlsxSheetChunk[] = []
  for (let i = 0; i < wb.SheetNames.length; i++) {
    const name = wb.SheetNames[i]!
    const sheet = wb.Sheets[name]
    if (!sheet) continue
    const oneSheet = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(oneSheet, sheet, name.slice(0, 31))
    const out = XLSX.write(oneSheet, {
      type: "buffer",
      bookType: "xlsx",
      bookSST: false,
    }) as Buffer
    chunks.push({ name, buffer: out, index: i })
  }
  return chunks
}
