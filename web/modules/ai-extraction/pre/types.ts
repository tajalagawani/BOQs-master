/**
 * Output of every pre-extractor. Same shape regardless of source mime
 * — the agent reads `surface.md`, browses `candidates.json`, and uses
 * `manifest.json` for structural orientation.
 */
export interface PreExtractResult {
  manifest: PreExtractManifest
  surface: string
  candidates: Record<string, SourceCandidate[]>
}

export type PreExtractManifest =
  | PdfManifest
  | XlsxManifest
  | DocxManifest
  | ImageManifest
  | FallbackManifest

export interface PdfManifest {
  kind: "pdf"
  filename: string
  size_bytes: number
  pages: { page_no: number; char_count: number; has_text: boolean }[]
  total_pages: number
  coverage_warnings: string[]
}

export interface XlsxManifest {
  kind: "xlsx"
  filename: string
  size_bytes: number
  sheets: {
    name: string
    rows: number
    cols: number
    non_blank_rows: number
    has_header: boolean
    detected_kind?: "cover" | "contents" | "summary" | "measured" | "general_req" | "unknown"
  }[]
  coverage_warnings: string[]
}

export interface DocxManifest {
  kind: "docx"
  filename: string
  size_bytes: number
  paragraph_count: number
  table_count: number
  coverage_warnings: string[]
}

export interface ImageManifest {
  kind: "image"
  filename: string
  size_bytes: number
  width: number
  height: number
  format: string
  coverage_warnings: string[]
}

/**
 * Returned when the deterministic pre-extractor fails (e.g. unparseable
 * PDF, malformed XLSX). The agent gets the raw file in the sandbox + a
 * coverage_warnings list explaining what went wrong.
 */
export interface FallbackManifest {
  kind: "pdf" | "xlsx" | "docx" | "unknown"
  filename: string
  size_bytes: number
  mime_type: string | null
  pages: never[]
  total_pages: number
  coverage_warnings: string[]
  fallback: true
}

export interface SourceCandidate {
  candidate_id: string
  field: string
  raw_text: string
  page?: number
  sheet?: string
  cell?: string
  context_before?: string
  context_after?: string
  detection_method: string
  detection_confidence: "low" | "medium" | "high"
  auto_excluded: { reason: string } | null
  parsed_value?: Record<string, unknown>
}
