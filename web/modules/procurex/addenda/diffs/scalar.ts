import type { ProposedFieldEvent } from "./types"

/**
 * Generic scalar/jsonb field comparators used by every per-spec differ.
 * Keeping them in one place means a future schema change (e.g. adding a
 * new percent column) only needs the new field added to the spec's
 * walker — the comparison logic stays unified.
 */

function normaliseNumeric(s: unknown): string | null {
  if (s === null || s === undefined) return null
  if (typeof s === "bigint") return s.toString()
  if (typeof s === "number") return Number.isFinite(s) ? String(s) : null
  if (typeof s === "string") {
    const cleaned = s.replace(/,/g, "").trim()
    if (!cleaned) return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? String(n) : null
  }
  return null
}

/** "Same value" check that handles type coercion (bigint vs string,
 *  number vs numeric-string, comma-separators, blanks). */
export function valuesDiffer(a: unknown, b: unknown): boolean {
  if (a === b) return false
  if (a === null || a === undefined) return b !== null && b !== undefined
  if (b === null || b === undefined) return true

  // Numeric vs numeric (incl. bigint/string)
  const an = normaliseNumeric(a)
  const bn = normaliseNumeric(b)
  if (an !== null && bn !== null) return an !== bn

  if (typeof a === "string" && typeof b === "string") {
    return a.trim() !== b.trim()
  }

  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) !== JSON.stringify(b)
  }
  return true
}

/** Compare ONE scalar field; push an event when it differs. */
export function diffScalar(opts: {
  spec: string
  field: string
  label: string
  current: unknown
  next: unknown
  events: ProposedFieldEvent[]
}) {
  if (!valuesDiffer(opts.current, opts.next)) return
  if (opts.next === null || opts.next === undefined) {
    opts.events.push({
      targetKind: "project_field",
      targetRef: { spec: opts.spec, field: opts.field },
      eventKind: "field_removed",
      payload: { old: opts.current, new: null, label: opts.label },
      label: `${opts.label} removed (was ${formatPretty(opts.current)})`,
      confidence: 0.95,
    })
    return
  }
  if (opts.current === null || opts.current === undefined) {
    opts.events.push({
      targetKind: "project_field",
      targetRef: { spec: opts.spec, field: opts.field },
      eventKind: "field_added",
      payload: { old: null, new: opts.next, label: opts.label },
      label: `${opts.label}: set to ${formatPretty(opts.next)}`,
      confidence: 0.95,
    })
    return
  }
  opts.events.push({
    targetKind: "project_field",
    targetRef: { spec: opts.spec, field: opts.field },
    eventKind: "field_changed",
    payload: { old: opts.current, new: opts.next, label: opts.label },
    label: `${opts.label}: ${formatPretty(opts.current)} → ${formatPretty(opts.next)}`,
    confidence: 0.95,
  })
}

/** Compare a jsonb sub-object's keys, emit one event per changed key. */
export function diffJsonbObject(opts: {
  spec: string
  field: string
  label: string
  current: Record<string, unknown> | null | undefined
  next: Record<string, unknown> | null | undefined
  events: ProposedFieldEvent[]
}) {
  const c = opts.current ?? {}
  const n = opts.next ?? {}
  const keys = new Set([...Object.keys(c), ...Object.keys(n)])
  for (const k of keys) {
    diffScalar({
      spec: opts.spec,
      field: `${opts.field}.${k}`,
      label: `${opts.label} — ${k}`,
      current: c[k],
      next: n[k],
      events: opts.events,
    })
  }
}

function formatPretty(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "bigint") return v.toString()
  if (typeof v === "object") return JSON.stringify(v).slice(0, 60)
  return String(v)
}
