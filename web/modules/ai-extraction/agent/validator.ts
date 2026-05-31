import type { z } from "zod"

import type { SourceCandidate } from "@/modules/ai-extraction/pre/types"

export interface ValidationResult<T> {
  ok: boolean
  value?: T
  errors: ValidationIssue[]
  coverageGaps: CoverageGap[]
}

export interface ValidationIssue {
  path: string
  message: string
}

export interface CoverageGap {
  candidateId: string
  field: string
  reason: string
}

/**
 * Run the agent's verdict through:
 *   1. The category's zod schema
 *   2. A coverage gate (every pre-extracted candidate must be addressed
 *      in instances_examined OR explicitly marked EXCLUDED)
 *
 * Returns either the validated value or a list of structured errors.
 */
export function validateVerdict<T>({
  verdict,
  schema,
  candidates,
}: {
  verdict: unknown
  schema: z.ZodType<T>
  candidates: Record<string, SourceCandidate[]>
}): ValidationResult<T> {
  // 1. Zod
  const parsed = schema.safeParse(verdict)
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
      coverageGaps: [],
    }
  }

  // 2. Coverage gate — only enforced when the verdict carries an
  //    `instances_examined` list.
  const coverageGaps: CoverageGap[] = []
  const v = parsed.data as Record<string, unknown>

  const examinedIds = extractExaminedIds(v)
  if (examinedIds !== null) {
    for (const [field, list] of Object.entries(candidates)) {
      for (const c of list) {
        if (!examinedIds.has(c.candidate_id)) {
          coverageGaps.push({
            candidateId: c.candidate_id,
            field,
            reason: `candidate '${c.candidate_id}' from field '${field}' missing from instances_examined`,
          })
        }
      }
    }
  }

  // If zod passed but coverage gates failed, surface the gaps in `errors`
  // too so the UI/diagnosis tools never see an empty error list on a
  // failed run. (Reproduced the "validationErrors: []" Spec bug.)
  const errors: ValidationIssue[] = coverageGaps.map((g) => ({
    path: `coverage.${g.field}`,
    message: g.reason,
  }))

  return {
    ok: coverageGaps.length === 0,
    value: parsed.data,
    errors,
    coverageGaps,
  }
}

/**
 * Walk the verdict tree looking for `instances_examined[].instance_id`
 * collections. Returns null if the schema doesn't carry that shape (in
 * which case coverage isn't enforced).
 */
function extractExaminedIds(value: unknown): Set<string> | null {
  const ids = new Set<string>()
  let found = false

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item)
      return
    }
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>
      if (Array.isArray(rec.instances_examined)) {
        found = true
        for (const inst of rec.instances_examined) {
          if (inst && typeof inst === "object") {
            const id = (inst as Record<string, unknown>).instance_id
            if (typeof id === "string") ids.add(id)
          }
        }
      }
      for (const value of Object.values(rec)) walk(value)
    }
  }
  walk(value)

  return found ? ids : null
}
