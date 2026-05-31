import { z } from "zod"

/**
 * Accepts bigint, number, or our encoded "<digits>n" string format used
 * to transport bigint across Server Action boundaries.
 */
export const bigintLike = z.preprocess(
  (v) => {
    if (typeof v === "bigint") return v
    if (typeof v === "number" && Number.isFinite(v)) return BigInt(v)
    if (typeof v === "string") {
      const trimmed = v.trim()
      if (trimmed === "") return null
      const cleaned = trimmed.endsWith("n") ? trimmed.slice(0, -1) : trimmed
      if (/^-?\d+$/.test(cleaned)) return BigInt(cleaned)
    }
    return v
  },
  z.bigint(),
)

/**
 * The renderer config that drives the Manual tab of the DocAccordion.
 * Walked recursively by <DynamicForm>; each leaf field's `key` is the
 * dot-path into the zod schema.
 */
export type ManualFieldConfig =
  | {
      kind: "text" | "textarea" | "email"
      key: string
      label: string
      required?: boolean
      placeholder?: string
      hint?: string
    }
  | {
      kind: "number" | "integer"
      key: string
      label: string
      required?: boolean
      min?: number
      max?: number
      placeholder?: string
    }
  | {
      kind: "money"
      key: string
      label: string
      required?: boolean
      currency?: string
      placeholder?: string
    }
  | {
      kind: "percent"
      key: string
      label: string
      required?: boolean
      min?: number
      max?: number
    }
  | {
      kind: "date"
      key: string
      label: string
      required?: boolean
    }
  | {
      kind: "select"
      key: string
      label: string
      options: { value: string; label: string }[]
      required?: boolean
    }
  | {
      kind: "boolean"
      key: string
      label: string
      default?: boolean
    }
  | {
      kind: "repeating-rows"
      key: string
      label: string
      rowFields: ManualFieldConfig[]
      minRows?: number
      maxRows?: number
      addLabel?: string
    }
  | {
      kind: "group"
      label: string
      description?: string
      fields: ManualFieldConfig[]
    }
  | {
      kind: "readonly-note"
      text: string
      severity?: "info" | "warning"
    }
  | {
      kind: "company-picker"
      key: string
      label: string
      required?: boolean
    }
  | {
      kind: "address"
      key: string
      label: string
    }
  | {
      kind: "signature-block"
      key: string
      label: string
    }

export type DocumentScope =
  | "required"
  | "applicable"
  | "pte"
  | "ta"
  | "ptc"
  | "bidder_submission"
  | "ptc_response"

export interface DocSpec<T = unknown> {
  /** Stable id (matches DB document.category lookup keys). */
  id: string
  /** Human label shown on the accordion header. */
  label: string
  /** Short label / abbreviation for status badges. */
  shortLabel: string
  /** Required vs Applicable vs PTE vs … */
  scope: DocumentScope
  /** Matches `document.category`. */
  category: string
  /** True for must-have docs in Step 2. */
  required: boolean
  /**
   * How much of this doc can be filled by manual form entry:
   *  - "full"    every field has a renderer
   *  - "partial" some fields manual, rest require upload
   *  - "no"      upload-only; manual tab shows a notice
   */
  manualFeasible: "full" | "partial" | "no"
  /** zod schema that validates both manual and AI-extracted shapes. */
  schema: z.ZodType<T>
  /** Drives the Manual tab's DynamicForm. */
  manualFields: ManualFieldConfig[]
  /** Persistor — called on save with the validated value. */
  persistor: (input: T, ctx: PersistContext) => Promise<void>
  /** Pointer to the markdown spec the AI agent reads. */
  agentSpecPath: string
  /**
   * Optional: split the source document into smaller agent calls. When
   * set to "sheet" and the doc is an xlsx, the workflow invokes the
   * agent once per sheet and merges the verdicts via `mergeChunks`
   * before validating/persisting. Defaults to "whole" (single call).
   *
   * Use sparingly — chunking trades latency + token cost for accuracy
   * on documents where the relevant signal is sheet-local (e.g. the
   * deviations register that spans many tabs in a bidder workbook).
   */
  chunkStrategy?: ChunkStrategy
  /** Required when `chunkStrategy !== "whole"`. Combines per-chunk
   *  verdicts into a single canonical verdict the validator + persistor
   *  will see. */
  mergeChunks?: (chunks: T[]) => T
}

export type ChunkStrategy = "whole" | "sheet" | "page"

export interface PersistContext {
  workspaceId: string
  projectId: string
  roundId: string
  tendererId?: string
  documentId?: string
  userId: string
}
