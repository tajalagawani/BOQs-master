import mammoth from "mammoth"

import type { DocxManifest, PreExtractResult, SourceCandidate } from "./types"

/**
 * Deterministic DOCX pre-extraction (cover letters, addenda).
 */
export async function preExtractDocx(
  buffer: Buffer,
  filename: string,
): Promise<PreExtractResult> {
  const { value: text } = await mammoth.extractRawText({ buffer })

  const paragraphs = text
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const manifest: DocxManifest = {
    kind: "docx",
    filename,
    size_bytes: buffer.length,
    paragraph_count: paragraphs.length,
    table_count: 0, // mammoth raw-text loses table structure; html-mode pass adds tables in v2
    coverage_warnings:
      text.trim().length === 0
        ? ["DOCX produced empty text — file may be empty or unsupported variant"]
        : [],
  }

  // V2-16 — every paragraph prefixed with [¶N] for source-traceable extraction.
  const surface = [
    `# Surface — ${filename}`,
    "",
    `Paragraphs: ${paragraphs.length}`,
    "",
    ...paragraphs.map((p, i) => `[¶${i + 1}] ${p}`),
  ].join("\n")

  // Reuse the PDF candidate extractors over the flattened text — easiest
  // way to keep candidate shape uniform across mime types.
  const candidates: Record<string, SourceCandidate[]> = {
    dates: extractRegex(paragraphs, /\b(\d{1,2})\s+([A-Z][a-z]{2,8})\s+(\d{4})\b/g, "dates"),
    amounts: extractRegex(
      paragraphs,
      /\b(AED|USD|GBP|EUR|SAR)\s*([0-9]{1,3}(?:[, ]\d{3})*(?:\.\d+)?)\b/g,
      "amounts",
    ),
    percentages: extractRegex(paragraphs, /\b(\d{1,3}(?:\.\d+)?)\s*%/g, "percentages"),
  }

  return { manifest, surface, candidates }
}

function extractRegex(
  paragraphs: string[],
  pattern: RegExp,
  field: string,
): SourceCandidate[] {
  const out: SourceCandidate[] = []
  let id = 0
  for (const [i, para] of paragraphs.entries()) {
    pattern.lastIndex = 0
    let m
    while ((m = pattern.exec(para)) !== null) {
      const start = Math.max(0, m.index - 30)
      const end = Math.min(para.length, m.index + m[0].length + 30)
      out.push({
        candidate_id: `${field}_${id++}`,
        field,
        raw_text: m[0],
        page: i + 1, // paragraph index used as page proxy
        context_before: para.slice(start, m.index).trim(),
        context_after: para.slice(m.index + m[0].length, end).trim(),
        detection_method: `regex:${field}`,
        detection_confidence: "medium",
        auto_excluded: null,
      })
    }
  }
  return out
}
