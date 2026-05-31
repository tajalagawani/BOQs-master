import { preExtractDocx } from "./docx"
import { preExtractPdf } from "./pdf"
import { preExtractXlsx } from "./xlsx"

import type { PreExtractResult } from "./types"

export type { PreExtractResult, SourceCandidate } from "./types"

/**
 * Routes a file to the right pre-extractor and ALWAYS returns a usable
 * triple. If the deterministic parser fails (truncated file, encrypted
 * PDF, malformed XLSX, unknown variant), we hand back a stub manifest +
 * a clear coverage_warning + empty candidates so the agent can still
 * read the raw bytes from sandbox/source/<filename> and adapt.
 *
 * Design intent: the pre-extractor is best-effort. The agent is the
 * real extractor.
 */
export async function preExtractDocument({
  buffer,
  filename,
  mimeType,
}: {
  buffer: Buffer
  filename: string
  mimeType?: string | null
}): Promise<PreExtractResult> {
  const kind = detectKind(filename, mimeType)

  try {
    switch (kind) {
      case "pdf":
        return await preExtractPdf(buffer, filename)
      case "xlsx":
        return await preExtractXlsx(buffer, filename)
      case "docx":
        return await preExtractDocx(buffer, filename)
      case "unknown":
        return makeStub({
          buffer,
          filename,
          mimeType,
          kind: "unknown",
          reason: `Unsupported file kind for the deterministic pre-extractor (ext/mime not recognised).`,
        })
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.warn(
      `[pre-extract] ${kind} parser failed for ${filename}: ${reason} — handing raw file to the agent.`,
    )
    return makeStub({ buffer, filename, mimeType, kind, reason })
  }
}

function detectKind(
  filename: string,
  mimeType?: string | null,
): "pdf" | "xlsx" | "docx" | "unknown" {
  const ext = filename.toLowerCase().split(".").pop() ?? ""
  if (ext === "pdf" || mimeType === "application/pdf") return "pdf"
  if (
    ext === "xlsx" ||
    ext === "xls" ||
    mimeType?.includes("spreadsheetml") ||
    mimeType?.includes("ms-excel")
  )
    return "xlsx"
  if (
    ext === "docx" ||
    ext === "doc" ||
    mimeType?.includes("wordprocessingml") ||
    mimeType?.includes("msword")
  )
    return "docx"
  return "unknown"
}

interface StubArgs {
  buffer: Buffer
  filename: string
  mimeType?: string | null
  kind: "pdf" | "xlsx" | "docx" | "unknown"
  reason: string
}

function makeStub(args: StubArgs): PreExtractResult {
  const { buffer, filename, mimeType, kind, reason } = args
  const manifest = {
    kind,
    filename,
    size_bytes: buffer.length,
    mime_type: mimeType ?? null,
    pages: [] as never[],
    total_pages: 0,
    coverage_warnings: [
      `Deterministic pre-extractor unavailable for this file: ${reason}`,
      `Read the raw bytes from ./source/${filename} and decide on a strategy yourself (e.g. use bash/python to inspect the file, switch to a different parser, or note the failure in the verdict).`,
    ],
    fallback: true as const,
  }

  const surface = [
    `# Surface — ${filename}`,
    ``,
    `_The deterministic ${kind === "unknown" ? "" : kind + " "}pre-extractor failed for this file._`,
    ``,
    `Reason: ${reason}`,
    ``,
    `The raw file is in \`./source/${filename}\` (${buffer.length} bytes). Use bash/python in the sandbox to inspect it directly — for example:`,
    ``,
    `  - PDF: try \`pdftotext\` (poppler) or run python with pdfplumber / PyPDF2`,
    `  - XLSX: \`unzip -p ${filename} xl/worksheets/sheet1.xml\``,
    `  - DOCX: \`unzip -p ${filename} word/document.xml\``,
    ``,
    `If you cannot recover the content, submit a verdict with the available metadata + a clear coverage warning naming what was missing.`,
  ].join("\n")

  return {
    manifest,
    surface,
    candidates: {},
  }
}
