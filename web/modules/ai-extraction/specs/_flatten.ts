/**
 * V2-13 — Soft row-level array: drops rows that fail their per-row schema
 * instead of rejecting the whole verdict. The result is a clean array of
 * valid rows; invalid rows are silently filtered.
 *
 * Use this anywhere you have z.array(rowSchema) and want resilience.
 */
import { z } from "zod"

export function softRowArray<T extends z.ZodTypeAny>(rowSchema: T) {
  return z
    .array(z.unknown())
    .optional()
    .transform((rows) => {
      if (!Array.isArray(rows)) return undefined
      const ok: z.infer<T>[] = []
      for (const row of rows) {
        const parsed = rowSchema.safeParse(row)
        if (parsed.success) ok.push(parsed.data)
      }
      return ok
    })
}

/**
 * Shared deep-walk flatten utility for spec verdict preprocessors.
 *
 * The agent emits a verdict in a structure of its own choosing — usually
 * nested under `extracted` / `extracted_value` / `structured_value` /
 * appendix names. Each spec's flatten preprocessor needs to map that
 * arbitrary shape back to the flat schema the form renders.
 *
 * Two levels of mapping are supported:
 *
 *   topLevel: anywhere in the tree, find this key by name
 *   rowLevel: for each row inside a top-level array, rewrite its row-level
 *             keys (used when the agent emits row.categoryRef but the
 *             schema wants row.category)
 *
 * Each row-level alias entry may be a flat key OR a dot-path (e.g.
 * "responsibleBy.gc") — the dot-path is resolved against the row.
 */

type Aliases = string[]

export interface FlattenConfig {
  topLevel: Record<string, Aliases>
  /** Per-top-level-key, the row-level alias table. */
  rowLevel?: Record<string, Record<string, Aliases>>
  /** Post-flatten hook: e.g. lowercase enum values, drop "not stated", etc. */
  sanitize?: (out: Record<string, unknown>) => Record<string, unknown>
}

const SENTINEL_STRINGS = new Set([
  "not stated",
  "not specified",
  "n/a",
  "not applicable",
  "tbd",
  "tbc",
])

function isPresent(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === "string") {
    const t = v.trim()
    if (t === "") return false
    if (SENTINEL_STRINGS.has(t.toLowerCase())) return false
  }
  return true
}

function deepFind(node: unknown, key: string, maxDepth = 8): unknown {
  if (maxDepth <= 0 || node === null || node === undefined) return undefined
  if (Array.isArray(node)) {
    for (const item of node) {
      const f = deepFind(item, key, maxDepth - 1)
      if (isPresent(f)) return f
    }
    return undefined
  }
  if (typeof node !== "object") return undefined
  const rec = node as Record<string, unknown>
  if (key in rec && isPresent(rec[key])) return rec[key]
  for (const v of Object.values(rec)) {
    const f = deepFind(v, key, maxDepth - 1)
    if (isPresent(f)) return f
  }
  return undefined
}

/** Resolve a dot-path (e.g. "responsibleBy.gc") against a value. */
function resolvePath(node: unknown, path: string): unknown {
  const parts = path.split(".")
  let cur: unknown = node
  for (const part of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function pickByAliases(node: unknown, aliases: Aliases): unknown {
  for (const alias of aliases) {
    // Dot-path → exact resolve against the local node.
    if (alias.includes(".")) {
      const f = resolvePath(node, alias)
      if (isPresent(f)) return f
      continue
    }
    // Bare name → exact key on the row, then deep search if not found.
    if (node && typeof node === "object" && alias in (node as Record<string, unknown>)) {
      const f = (node as Record<string, unknown>)[alias]
      if (isPresent(f)) return f
    }
    const deep = deepFind(node, alias)
    if (isPresent(deep)) return deep
  }
  return undefined
}

/** Coerce flat scalars wrapped as { value: X } back to X. */
function unwrapScalarRows(rows: unknown[]): unknown[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) {
      const rec = r as Record<string, unknown>
      const keys = Object.keys(rec)
      if (keys.length === 1 && keys[0] === "value") return rec.value
    }
    return r
  })
}

export function flattenWithAliases(
  input: unknown,
  cfg: FlattenConfig,
): unknown {
  if (!input || typeof input !== "object") return input
  const v = input as Record<string, unknown>
  const out: Record<string, unknown> = {}

  // 1) Top-level: deep-find each schema key by alias, anywhere in the tree.
  //    For dot-path aliases we deep-walk the FIRST segment, then resolve
  //    the remaining segments — so "G_responsibilityMatrix.rows" finds
  //    `verdict.extracted.appendices.G_responsibilityMatrix.rows`.
  for (const [schemaKey, aliases] of Object.entries(cfg.topLevel)) {
    for (const alias of aliases) {
      let found: unknown
      if (alias.includes(".")) {
        const [head, ...rest] = alias.split(".")
        const anchor = deepFind(v, head!)
        if (anchor !== undefined) found = resolvePath(anchor, rest.join("."))
      } else {
        found = deepFind(v, alias)
      }
      if (isPresent(found)) {
        out[schemaKey] = found
        break
      }
    }
  }

  // 2) Row-level: for each top-level key that has a rowLevel config, walk
  //    its rows and rewrite each row's keys using row-level aliases.
  if (cfg.rowLevel) {
    for (const [topKey, rowAliases] of Object.entries(cfg.rowLevel)) {
      const rows = out[topKey]
      if (!Array.isArray(rows)) continue
      const rewritten = rows.map((row) => {
        if (!row || typeof row !== "object") return row
        const rec = row as Record<string, unknown>
        const newRow: Record<string, unknown> = {}
        for (const [rowSchemaKey, aliases] of Object.entries(rowAliases)) {
          const found = pickByAliases(rec, aliases)
          if (isPresent(found)) newRow[rowSchemaKey] = found
        }
        // Keep any extra keys from the original row that we didn't map
        // (in case the schema is lenient about them).
        for (const [k, vv] of Object.entries(rec)) {
          if (!(k in newRow) && !Object.keys(rowAliases).includes(k)) {
            newRow[k] = vv
          }
        }
        return newRow
      })
      out[topKey] = rewritten
    }
  }

  // 3) Scalar-row unwrap: schemas like documentPriorityOrder come from the
  //    UI as [{value: "X"}] but the agent / DB use flat ["X"]. If a
  //    top-level value is an array of {value: X} singletons, unwrap.
  for (const [k, val] of Object.entries(out)) {
    if (Array.isArray(val) && val.length > 0) {
      const allScalarRows = val.every(
        (r) =>
          r &&
          typeof r === "object" &&
          !Array.isArray(r) &&
          Object.keys(r as object).length === 1 &&
          "value" in (r as object),
      )
      if (allScalarRows) out[k] = unwrapScalarRows(val)
    }
  }

  return cfg.sanitize ? cfg.sanitize(out) : out
}
