import "server-only"

import { spawn } from "node:child_process"

/**
 * Cover-PDF parser for tender addenda.
 *
 * Every cover PDF we've inspected (TA1/TA2/TA3 for EMR DCH MW 0214)
 * follows the same legal-document template:
 *
 *   Header  – project + addendum number + issue date
 *   §1      – Introduction (paragraphs 1.1–1.4, IDENTICAL wording)
 *   §2..N   – Per-section instructions (BoQ, SOPR, Drawings, Specs,
 *             Tenderer Queries)
 *   Attachment A (optional) – the Q&A table
 *
 * The same structure → deterministic pattern matching, no AI needed.
 *
 * TODO (AI fallback): when the deterministic parser returns a
 * ParsedCover with `no === null` or `sections.length === 0` we should
 * fall back to a small Claude call that takes the full text and emits
 * the same shape. Track this gated behind ADDENDA_AI_FALLBACK env so
 * cost is opt-in. See docs/addenda-design.md once written.
 */

export interface ParsedCover {
  /** Addendum number as written ("TENDER ADDENDUM No. 1" → "TA1"). */
  no: string | null
  /** Issue date as written ("6 JANUARY 2026") + the normalised ISO date. */
  issuedRaw: string | null
  issuedIso: string | null
  /** Project reference token (the footer suffix). */
  projectRef: string | null
  totalPages: number
  /** Top-level sections from the INDEX. */
  sections: Array<{
    no: string
    title: string
    pageRef: number | null
  }>
  /** Paragraph 1 (intro) text, joined. */
  introText: string | null
  /** What this addendum changes, derived from section titles. */
  scopeSummary: {
    boqReplaceFull: boolean
    boqReplacePartial: boolean
    soprAmend: boolean
    specAmend: boolean
    drawingsAmend: boolean
    tqResponses: boolean
  }
  /** Raw page-by-page text — kept for downstream parsers (Attachment A). */
  pageTexts: string[]
  warnings: string[]
}

const PDFTOTEXT_TIMEOUT_MS = 60_000

async function pdftotext(
  path: string,
  pageRange?: { first?: number; last?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const args: string[] = []
    if (pageRange?.first) args.push("-f", String(pageRange.first))
    if (pageRange?.last) args.push("-l", String(pageRange.last))
    args.push("-layout", path, "-")
    const child = spawn("pdftotext", args)
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => child.kill("SIGKILL"), PDFTOTEXT_TIMEOUT_MS)
    child.stdout.on("data", (b) => (stdout += b.toString()))
    child.stderr.on("data", (b) => (stderr += b.toString()))
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(stderr.slice(0, 200)))
      else resolve(stdout)
    })
  })
}

async function pdfPageCount(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("pdfinfo", [path])
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => child.kill("SIGKILL"), 15_000)
    child.stdout.on("data", (b) => (stdout += b.toString()))
    child.stderr.on("data", (b) => (stderr += b.toString()))
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(stderr.slice(0, 200)))
      const m = stdout.match(/Pages:\s*(\d+)/)
      resolve(m ? parseInt(m[1]!, 10) : 0)
    })
  })
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

/** "6 JANUARY 2026" → "2026-01-06". */
function normaliseDate(s: string): string | null {
  const m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (!m) return null
  const day = parseInt(m[1]!, 10)
  const month = MONTH_MAP[m[2]!.toLowerCase()]
  const year = parseInt(m[3]!, 10)
  if (!month) return null
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const SCOPE_PATTERNS: Array<{ key: keyof ParsedCover["scopeSummary"]; rx: RegExp }> = [
  { key: "tqResponses", rx: /tenderers?\s*(?:'\s*)?queries/i },
  { key: "boqReplaceFull", rx: /bills?\s+of\s+quantities[\s\S]{0,400}entire/i },
  { key: "boqReplacePartial", rx: /bills?\s+of\s+quantities[\s\S]{0,400}(?:replace.*pages|revised\s+boq\s+pages)/i },
  { key: "soprAmend", rx: /schedule\s+of\s+project\s+requirements/i },
  { key: "drawingsAmend", rx: /^\s*\d\s+drawings/im },
  { key: "specAmend", rx: /^\s*\d\s+specifications/im },
]

/** Top-level parser. */
export async function parseAddendumCoverPdf(
  pdfPath: string,
): Promise<ParsedCover> {
  const warnings: string[] = []
  let totalPages = 0
  try {
    totalPages = await pdfPageCount(pdfPath)
  } catch (err) {
    warnings.push(`pdfinfo failed: ${err instanceof Error ? err.message : "n/a"}`)
  }

  let fullText = ""
  try {
    fullText = await pdftotext(pdfPath)
  } catch (err) {
    warnings.push(`pdftotext failed: ${err instanceof Error ? err.message : "n/a"}`)
  }

  // 1. Addendum number
  let no: string | null = null
  const noMatch = fullText.match(/TENDER\s+ADDENDUM\s+No\.\s*(\d+)/i)
  if (noMatch) no = `TA${noMatch[1]}`

  // 2. Issued date
  let issuedRaw: string | null = null
  let issuedIso: string | null = null
  // The date sits on its own line right after "TENDER ADDENDUM No. X".
  const dateMatch = fullText.match(
    /TENDER\s+ADDENDUM\s+No\.\s*\d+\s*\n\s*([0-9]{1,2}\s+[A-Z]+\s+\d{4})/i,
  )
  if (dateMatch) {
    issuedRaw = dateMatch[1]!
    issuedIso = normaliseDate(issuedRaw)
  }

  // 3. Project ref (the footer slug "EMR DCH PUBLIC REALM MW 0214 (DEC 2025) _ADDx")
  const projectRefMatch = fullText.match(/(EMR\s+DCH[^\n]+?_ADD\d+)/i)
  const projectRef = projectRefMatch ? projectRefMatch[1]!.trim() : null

  // 4. Sections from the INDEX (table-of-contents) at the top of the doc.
  //    Pattern: a single-digit section number followed by a TITLE in
  //    uppercase, optionally followed by a page number.
  const sections: ParsedCover["sections"] = []
  const indexMatch = fullText.match(/INDEX\s*\n([\s\S]*?)(?=\n\s*1\.\s+INTRODUCTION|\n\s*1\s+INTRODUCTION)/i)
  if (indexMatch) {
    const indexBlock = indexMatch[1]!
    // Each section line: "1 INTRODUCTION   1"  /  "2 BILLS OF QUANTITIES   1"
    const lineRx = /(?:^|\n)\s*(\d+)\s+([A-Z][A-Z'’ \-/&]+?)(?:\s+(\d+))?\s*(?=\n|$)/g
    let m: RegExpExecArray | null
    while ((m = lineRx.exec(indexBlock)) !== null) {
      sections.push({
        no: m[1]!,
        title: m[2]!.trim(),
        pageRef: m[3] ? parseInt(m[3]!, 10) : null,
      })
    }
  } else {
    warnings.push("Could not locate INDEX block")
  }

  // 5. Intro text — paragraphs 1.1 to 1.4.
  let introText: string | null = null
  const introMatch = fullText.match(/1\.\s+INTRODUCTION([\s\S]*?)(?=\n\s*2\.|\n\s*2\s+)/i)
  if (introMatch) introText = introMatch[1]!.trim()

  // 6. Scope summary — boolean flags by section content.
  const scopeSummary = {
    boqReplaceFull: false,
    boqReplacePartial: false,
    soprAmend: false,
    specAmend: false,
    drawingsAmend: false,
    tqResponses: false,
  }
  for (const { key, rx } of SCOPE_PATTERNS) {
    if (rx.test(fullText)) scopeSummary[key] = true
  }
  // If both full and partial matched, prefer partial (the partial regex
  // is more specific and full was just the boilerplate "Bills of...").
  if (scopeSummary.boqReplacePartial) scopeSummary.boqReplaceFull = false

  // 7. Page-by-page texts (used later by Attachment A parser).
  const pageTexts: string[] = []
  for (let i = 1; i <= totalPages; i += 1) {
    try {
      pageTexts.push(await pdftotext(pdfPath, { first: i, last: i }))
    } catch {
      pageTexts.push("")
    }
  }

  return {
    no,
    issuedRaw,
    issuedIso,
    projectRef,
    totalPages,
    sections,
    introText,
    scopeSummary,
    pageTexts,
    warnings,
  }
}
