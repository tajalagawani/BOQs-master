/**
 * V2-17 — Cross-document convergence.
 *
 * Several fields appear in MULTIPLE specs (e.g. `engineerName` is in ITT,
 * COC, FOT). After each doc is extracted independently, this pass
 * reconciles those shared fields across the project so the UI can flag
 * disagreements.
 *
 * Pure function — no DB writes. Callers query workflow_runs for the
 * project, hand the per-doc verdicts in, and get back a normalised
 * map of `{ field → { value, sources, conflict }`.
 */

import { getDocSpec } from "@/modules/ai-extraction/specs/registry"

/** Schema-key → list of (specId, alias-in-the-verdict). */
const CONVERGENCE_MAP: Record<
  string,
  Array<{ specId: string; key: string }>
> = {
  engineerName: [
    { specId: "itt", key: "engineerName" },
    { specId: "coc", key: "engineerName" },
  ],
  governingLaw: [{ specId: "coc", key: "governingLaw" }],
  disputeForum: [{ specId: "coc", key: "disputeForum" }],
  language: [
    { specId: "itt", key: "language" },
    { specId: "coc", key: "language" },
  ],
  currency: [
    { specId: "fot", key: "currency" },
    { specId: "itt", key: "currency" },
  ],
  vatTreatment: [{ specId: "itt", key: "vatTreatment" }],
  requiredValidityDays: [
    { specId: "itt", key: "requiredValidityDays" },
    { specId: "fot", key: "validityDays" },
  ],
  documentPriorityOrder: [
    { specId: "itt", key: "documentPriorityOrder" },
    { specId: "coc", key: "documentPriorityOrder" },
  ],
  contractForm: [{ specId: "coc", key: "contractForm" }],
  performanceBondRequired: [
    { specId: "itt", key: "bondsPerformanceRequired" },
    { specId: "coc", key: "performanceBondPercent" }, // presence implies required
  ],
}

export interface ConvergenceField {
  /** The canonical value picked from the per-source candidates. */
  value: unknown
  /** Every source that contributed, with its raw value. */
  sources: Array<{ specId: string; key: string; value: unknown }>
  /** True when at least two sources disagree on a non-null value. */
  conflict: boolean
}

export type ConvergenceReport = Record<string, ConvergenceField>

/**
 * Reconcile shared fields across a project's per-doc verdicts.
 *
 * `verdictsByCategory` is keyed by spec.id (e.g. "fot", "itt", "coc").
 */
export function reconcileProject(
  verdictsByCategory: Record<string, Record<string, unknown> | null>,
): ConvergenceReport {
  const report: ConvergenceReport = {}

  for (const [field, sources] of Object.entries(CONVERGENCE_MAP)) {
    const seen: ConvergenceField["sources"] = []
    for (const src of sources) {
      const v = verdictsByCategory[src.specId]
      if (!v) continue
      const raw = v[src.key]
      if (raw === null || raw === undefined) continue
      seen.push({ specId: src.specId, key: src.key, value: raw })
    }
    if (seen.length === 0) continue

    // Pick the value: first source wins, but flag conflict if any two
    // disagree on a normalised scalar comparison.
    const value = seen[0]!.value
    const conflict = seen.some((s) => !valuesAgree(value, s.value))

    report[field] = { value, sources: seen, conflict }
  }

  return report
}

/** Loose comparison — handles strings, numbers, bigints, arrays. */
function valuesAgree(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b
  }
  // BigInt-as-string ("100n") vs number 100
  const an = bigintLikeToNumber(a)
  const bn = bigintLikeToNumber(b)
  if (an !== null && bn !== null) return an === bn
  // Array compare
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((x, i) => valuesAgree(x, b[i]))
  }
  // String fold
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
  return false
}

function bigintLikeToNumber(v: unknown): number | null {
  if (typeof v === "number") return v
  if (typeof v === "bigint") return Number(v)
  if (typeof v === "string" && /^-?\d+n?$/.test(v.trim())) {
    return Number(v.trim().replace(/n$/, ""))
  }
  return null
}

/** Convenience — returns just the canonical value per field. */
export function flattenConvergence(
  report: ConvergenceReport,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(report)) out[k] = v.value
  return out
}

/** Convenience — list of fields with disagreement. */
export function listConflicts(report: ConvergenceReport): string[] {
  return Object.entries(report)
    .filter(([, f]) => f.conflict)
    .map(([k]) => k)
}

// Keep the spec registry side-effect-imported so this module loads cleanly
// even if convergence is the first entry point.
void getDocSpec
