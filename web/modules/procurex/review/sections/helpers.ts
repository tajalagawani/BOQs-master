import type { CellValue, CellTone } from "../types"
import type { ComplianceVerdict } from "@/modules/procurex/tenderers/compliance-types"

/**
 * Shared row/cell helpers used by every section builder. Centralises
 * how a ComplianceVerdict maps to a tone, and how counts/numbers get
 * formatted into pills.
 */

const VERDICT_TONE: Record<ComplianceVerdict, CellTone> = {
  Compliant: "success",
  Partial: "warning",
  "Non-compliant": "danger",
  Missing: "neutral",
}

export function verdictCell(v: ComplianceVerdict): CellValue {
  if (v === "Missing") return { kind: "missing" }
  return { kind: "value", text: v, tone: VERDICT_TONE[v] }
}

/** Boolean → Compliant / Missing pill — for binary checks like
 *  "FOT document submitted". */
export function presenceCell(present: boolean): CellValue {
  if (!present) return { kind: "missing" }
  return { kind: "value", text: "Submitted", tone: "success" }
}

/** Numeric count → pill. Zero is neutral grey; non-zero takes the
 *  caller-chosen tone so e.g. "0 unpriced" reads green and any positive
 *  unpriced count reads warning. */
export function countCell(
  n: number,
  positiveTone: CellTone = "warning",
  zeroLabel?: string,
): CellValue {
  if (n === 0) {
    return {
      kind: "value",
      text: zeroLabel ?? "0",
      tone: "success",
    }
  }
  return { kind: "value", text: n.toString(), tone: positiveTone }
}

/** "X of Y" cell — good for match rates ("142 of 156" matched). */
export function ratioCell(
  hit: number,
  total: number,
  goodWhen: "all" | "high" = "all",
): CellValue {
  if (total === 0) return { kind: "missing" }
  const pct = (hit / total) * 100
  const tone: CellTone =
    goodWhen === "all"
      ? hit === total
        ? "success"
        : hit === 0
          ? "danger"
          : "warning"
      : pct >= 95
        ? "success"
        : pct >= 80
          ? "warning"
          : "danger"
  return { kind: "value", text: `${hit}/${total}`, tone }
}
