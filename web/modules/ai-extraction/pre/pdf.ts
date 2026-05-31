import { extractText } from "unpdf"

import type { PreExtractResult, SourceCandidate } from "./types"

/**
 * Deterministic PDF pre-extraction.
 * Produces manifest.json, surface.md, candidates.json — the same triple
 * the agent expects regardless of source format.
 */
export async function preExtractPdf(
  buffer: Buffer,
  filename: string,
): Promise<PreExtractResult> {
  const { totalPages, text } = await extractText(new Uint8Array(buffer), {
    mergePages: false,
  })

  const pages = Array.isArray(text) ? text : [text]

  // ---------------------------------------------------------------------------
  // manifest.json — structural inventory
  // ---------------------------------------------------------------------------

  const manifest = {
    kind: "pdf" as const,
    filename,
    size_bytes: buffer.length,
    pages: pages.map((pageText, i) => ({
      page_no: i + 1,
      char_count: pageText.length,
      has_text: pageText.trim().length > 0,
    })),
    total_pages: totalPages,
    coverage_warnings:
      pages.every((p) => p.trim().length === 0) || pages.length === 0
        ? ["PDF appears to be image-only — text extraction returned empty. Vision-model pass may be required."]
        : [],
  }

  // ---------------------------------------------------------------------------
  // surface.md — human-readable reading surface
  // ---------------------------------------------------------------------------

  const surfaceLines: string[] = [
    `# Surface — ${filename}`,
    "",
    `Pages: ${totalPages}`,
    "",
  ]
  for (const [i, pageText] of pages.entries()) {
    const pageNo = i + 1
    surfaceLines.push(`## Page ${pageNo}  [ref:p=${pageNo}]`)
    surfaceLines.push("")
    // V2-16 — prefix every non-empty paragraph with its [p.N] ref so the
    // agent can cite "value on p.47" rather than "value on the surface".
    const paragraphs = pageText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    if (paragraphs.length === 0) {
      surfaceLines.push("_(empty page)_")
    } else {
      for (const p of paragraphs) {
        surfaceLines.push(`[p.${pageNo}] ${p}`)
      }
    }
    surfaceLines.push("")
  }
  const surface = surfaceLines.join("\n")

  // ---------------------------------------------------------------------------
  // candidates.json — per-field candidate extraction
  // (category-agnostic baseline; per-category pre-extractors layer on top)
  // ---------------------------------------------------------------------------

  const candidates: Record<string, SourceCandidate[]> = {
    dates: extractDateCandidates(pages),
    amounts: extractCurrencyCandidates(pages),
    percentages: extractPercentCandidates(pages),
    durations: extractDurationCandidates(pages),
  }

  return {
    manifest,
    surface,
    candidates,
  }
}

// ---------------------------------------------------------------------------
// Per-field candidate extractors
// ---------------------------------------------------------------------------

function extractDateCandidates(pages: string[]): SourceCandidate[] {
  const out: SourceCandidate[] = []
  // ISO and common UAE formats: 12 Sep 2025 / Sep 12, 2025 / 12/09/2025
  const patterns = [
    /\b(\d{1,2})\s+([A-Z][a-z]{2,8})\s+(\d{4})\b/g,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    /\b(\d{4})-(\d{2})-(\d{2})\b/g,
  ]
  let id = 0
  for (const [pageIdx, pageText] of pages.entries()) {
    for (const pat of patterns) {
      let m
      while ((m = pat.exec(pageText)) !== null) {
        const start = Math.max(0, m.index - 30)
        const end = Math.min(pageText.length, m.index + m[0].length + 30)
        out.push({
          candidate_id: `date_${id++}`,
          field: "dates",
          raw_text: m[0],
          page: pageIdx + 1,
          context_before: pageText.slice(start, m.index).trim(),
          context_after: pageText.slice(m.index + m[0].length, end).trim(),
          detection_method: "regex:date",
          detection_confidence: "medium",
          auto_excluded: null,
        })
      }
    }
  }
  return out
}

function extractCurrencyCandidates(pages: string[]): SourceCandidate[] {
  const out: SourceCandidate[] = []
  // AED / USD / GBP / EUR / SAR amounts with optional thousands separators
  const pat =
    /\b(AED|USD|GBP|EUR|SAR|Dirhams)\s*([0-9]{1,3}(?:[, ]\d{3})*(?:\.\d+)?)\b/g
  let id = 0
  for (const [pageIdx, pageText] of pages.entries()) {
    let m
    while ((m = pat.exec(pageText)) !== null) {
      const start = Math.max(0, m.index - 40)
      const end = Math.min(pageText.length, m.index + m[0].length + 40)
      out.push({
        candidate_id: `amt_${id++}`,
        field: "amounts",
        raw_text: m[0],
        page: pageIdx + 1,
        context_before: pageText.slice(start, m.index).trim(),
        context_after: pageText.slice(m.index + m[0].length, end).trim(),
        detection_method: "regex:currency-amount",
        detection_confidence: "high",
        auto_excluded: null,
        parsed_value: {
          currency: m[1],
          amount: m[2].replace(/[, ]/g, ""),
        },
      })
    }
  }
  return out
}

function extractPercentCandidates(pages: string[]): SourceCandidate[] {
  const out: SourceCandidate[] = []
  const pat = /\b(\d{1,3}(?:\.\d+)?)\s*%/g
  let id = 0
  for (const [pageIdx, pageText] of pages.entries()) {
    let m
    while ((m = pat.exec(pageText)) !== null) {
      const start = Math.max(0, m.index - 50)
      const end = Math.min(pageText.length, m.index + m[0].length + 30)
      const context = pageText.slice(start, end)
      // Auto-exclude common false positives
      const lowerContext = context.toLowerCase()
      let excluded: string | null = null
      if (lowerContext.includes("relative humidity") && m[1] === "100") {
        excluded = "Relative humidity reading, not a percentage value"
      }
      out.push({
        candidate_id: `pct_${id++}`,
        field: "percentages",
        raw_text: m[0],
        page: pageIdx + 1,
        context_before: pageText.slice(start, m.index).trim(),
        context_after: pageText.slice(m.index + m[0].length, end).trim(),
        detection_method: "regex:percent",
        detection_confidence: excluded ? "low" : "high",
        auto_excluded: excluded ? { reason: excluded } : null,
        parsed_value: { percent: Number.parseFloat(m[1]!) },
      })
    }
  }
  return out
}

function extractDurationCandidates(pages: string[]): SourceCandidate[] {
  const out: SourceCandidate[] = []
  // "ninety (90) days" / "480 calendar days" / "30 days"
  const pat = /\b(?:(\w+)\s+)?\((\d{1,4})\)\s+(calendar\s+)?days\b|\b(\d{1,4})\s+(calendar\s+)?days\b/g
  let id = 0
  for (const [pageIdx, pageText] of pages.entries()) {
    let m
    while ((m = pat.exec(pageText)) !== null) {
      const start = Math.max(0, m.index - 60)
      const end = Math.min(pageText.length, m.index + m[0].length + 40)
      const days = m[2] ?? m[4]!
      out.push({
        candidate_id: `dur_${id++}`,
        field: "durations",
        raw_text: m[0],
        page: pageIdx + 1,
        context_before: pageText.slice(start, m.index).trim(),
        context_after: pageText.slice(m.index + m[0].length, end).trim(),
        detection_method: "regex:duration-days",
        detection_confidence: "high",
        auto_excluded: null,
        parsed_value: { days: Number.parseInt(days, 10) },
      })
    }
  }
  return out
}
