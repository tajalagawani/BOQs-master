import { z } from "zod"

import type { DocSpec, PersistContext } from "./types"

/**
 * The "deviations" spec — AI-extracted commercial / technical /
 * contractual clauses the bidder amended, added, or qualified relative
 * to the project's tender requirements.
 *
 * Unlike the FOT/ITT/COC specs (which extract structured fields), this
 * spec returns a *list of clauses*. Each clause is classified by kind
 * and severity, with a verbatim snippet so the QS can verify quickly.
 *
 * Wiring:
 *   - The extraction worker picks this up automatically once the spec is
 *     registered in DOC_SPECS.
 *   - The agent reads `docs/prompts/deviations.md` (the markdown spec)
 *     to know what to look for and how to classify.
 *   - Persistor writes one row per clause into `tender_deviation`. The
 *     Summary view's FlagsGrid reads counts via
 *     getProjectBidderDeviationCounts().
 *
 * Chunking — IMPORTANT: bidder workbooks regularly span 6–10 sheets and
 * a single agent call against the full doc will (a) blow the model's
 * context window and (b) tank classification accuracy because the
 * needles get lost in haystack. The workflow should:
 *   1. For xlsx: parse the workbook with the existing BoQ parser and
 *      fire one agent call per sheet (header row + body in markdown).
 *   2. For PDF: split into ≤8-page chunks and fire one call per chunk.
 *   3. Merge the verdicts client-side (dedupe by clause heading) before
 *      calling the persistor once with the full register.
 * The `chunkStrategy` hint below is read by extract-document.ts to pick
 * the dispatcher; until that landing, the agent receives the whole doc.
 *
 * Scope: bidder_submission — runs against any uploaded bidder doc that
 * may carry deviations (Cover Letter, Form of Tender, Technical Submittal,
 * Commercial Proposal). The agent prompt itself handles the
 * cross-document deduplication so re-running on more docs only adds
 * rows.
 */

export const deviationItemSchema = z.object({
  kind: z.enum(["commercial", "technical", "contractual"]),
  clause: z
    .string()
    .min(1)
    .max(200)
    .describe("Short heading for the clause, e.g. 'Payment terms'"),
  snippet: z
    .string()
    .max(2000)
    .nullable()
    .describe("Verbatim excerpt from the bidder doc (≤500 chars in practice)"),
  severity: z.enum(["minor", "major"]).default("minor"),
  references: z
    .array(
      z.object({
        documentSection: z.string().nullable().optional(),
        page: z.number().int().positive().nullable().optional(),
      }),
    )
    .default([]),
})

export const deviationsSchema = z.object({
  deviations: z.array(deviationItemSchema).default([]),
})

export type DeviationItem = z.infer<typeof deviationItemSchema>
export type DeviationsVerdict = z.infer<typeof deviationsSchema>

/** Hint for the workflow runner — splits the source doc before sending
 *  to the agent. Until extract-document.ts reads it, the whole doc is
 *  sent in one shot. */
export type DeviationsChunkStrategy = "sheet" | "page" | "whole"
export const DEVIATIONS_CHUNK_STRATEGY: DeviationsChunkStrategy = "sheet"

export const deviationsSpec: DocSpec<DeviationsVerdict> = {
  id: "deviations",
  label: "Deviations register",
  shortLabel: "Deviations",
  scope: "bidder_submission",
  // Matches `document.category`. The worker dispatches to this spec
  // for any bidder doc with one of these categories. The agent itself
  // is told to return [] when none are found, so it's safe to run on
  // every bidder doc.
  category: "Tenderer Deviations",
  required: false,
  manualFeasible: "no",
  schema: deviationsSchema,
  manualFields: [
    {
      kind: "readonly-note",
      severity: "info",
      text: "Deviations are extracted by an AI agent — open the bidder's submission docs for the raw clause text.",
    },
  ],
  // No-op — real persistor lives in `_persistors.ts` so the Step 2
  // client bundle doesn't pull in `pg` via `@/modules/core/db`.
  persistor: async () => {},
  agentSpecPath: "docs/prompts/deviations.md",
  // Bidder workbooks regularly span 6–10 sheets; chunking one call per
  // sheet keeps each prompt focused and avoids context-window blowouts.
  // The workflow checks this field and dispatches accordingly.
  chunkStrategy: "sheet",
  mergeChunks: (chunks): DeviationsVerdict => {
    // Concatenate all per-chunk deviations, then dedupe by a stable key
    // (`kind::lowercased-clause`). When the same clause appears in two
    // sheets we keep the one with the longest snippet — it's almost
    // always the more useful excerpt.
    const merged = new Map<string, DeviationItem>()
    for (const c of chunks) {
      for (const d of c.deviations ?? []) {
        const key = `${d.kind}::${d.clause.trim().toLowerCase()}`
        const prev = merged.get(key)
        if (
          !prev ||
          (d.snippet?.length ?? 0) > (prev.snippet?.length ?? 0)
        ) {
          merged.set(key, d)
        }
      }
    }
    return { deviations: Array.from(merged.values()) }
  },
}

/** Stub kept for symmetry with the other spec files. Server-only
 *  implementation is in `./_persistors.ts`. */
export async function persistDeviations(
  _input: DeviationsVerdict,
  _ctx: PersistContext,
): Promise<void> {
  // intentionally empty — see _persistors.ts
}
