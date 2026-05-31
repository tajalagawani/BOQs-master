import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

// JSON.stringify throws on BigInt; convert to "<digits>n" so the value
// survives the DB round-trip via JSONB. Reverse with the same convention
// at read time (zod's bigintLike preprocess accepts the "n"-suffixed form).
function stringifyJsonSafe(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    typeof v === "bigint" ? `${v.toString()}n` : v,
  )
}
function jsonSafe<T>(value: T): T {
  return JSON.parse(stringifyJsonSafe(value)) as T
}

import { recordAudit } from "@/modules/audit"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import { loadAgentSpec, runAgent } from "@/modules/ai-extraction/agent/runner"
import type {
  AgentProgressEvent,
  AgentRunResult,
} from "@/modules/ai-extraction/agent/runner"
import { validateVerdict } from "@/modules/ai-extraction/agent/validator"
import { preExtractDocument } from "@/modules/ai-extraction/pre"
import {
  checkSlotMatch,
  fingerprintDocument,
} from "@/modules/ai-extraction/pre/fingerprint"
import { getPersistor } from "@/modules/ai-extraction/specs/_persistors"
import { getDocSpec, type DocSpecId } from "@/modules/ai-extraction/specs/registry"
import type { PersistContext } from "@/modules/ai-extraction/specs/types"

import { isXlsxBuffer, splitXlsxBySheet } from "./chunk-xlsx"

// No validation retry — surface the validation error on the first
// failure so the user sees what went wrong instead of a second
// silently-failing run. Set back to 1 to restore retry-with-feedback.
const MAX_VALIDATION_RETRIES = 0

export interface ExtractDocumentInput {
  documentId: string
  /** Optional: run this spec instead of the one inferred from
   *  `document.category`. Used when a single bidder doc kicks off
   *  multiple agents (e.g. the primary "Cover Letter" extractor plus
   *  the cross-doc "deviations" extractor). */
  specOverride?: string
  /** Buffer of the source file (caller supplies — usually fetched from Blob). */
  buffer: Buffer
  filename: string
  mimeType?: string | null
  /** Workspace/project/round/user context for the persistor. */
  context: PersistContext
  /** Forwarded to the agent runner — fires after every iteration. */
  onProgress?: (event: AgentProgressEvent) => void | Promise<void>
  /** When false, the workflow runs the full extraction (agent +
   *  validation + audit + workflow_run write) but SKIPS calling the
   *  per-spec persistor. Used by the addenda pipeline — we want the
   *  fresh verdict to diff against the project's current state, NOT
   *  overwrite it. Defaults to true (regular fresh-upload behaviour). */
  persist?: boolean
}

export interface ExtractDocumentResult {
  ok: boolean
  workflowRunId: string
  iterations: number
  verdict?: unknown
  validationErrors?: { path: string; message: string }[]
  coverageGaps?: { candidateId: string; field: string }[]
  error?: string
  totals?: AgentRunResult["totals"]
}

/**
 * Orchestrates one full AI extraction for a document:
 *   1. Look up the category spec
 *   2. Pre-extract the file (manifest + surface + candidates)
 *   3. Fingerprint check (correct slot?)
 *   4. Run the adaptive agent (sandbox + tools)
 *   5. Validate the verdict (zod + coverage gate); retry once with feedback
 *   6. Persist via the spec's per-category persistor
 *   7. Update document.extraction_* + workflow_run rows
 */
export async function extractDocumentWorkflow(
  input: ExtractDocumentInput,
): Promise<ExtractDocumentResult> {
  // 1. Find the document row
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, input.documentId))
    .limit(1)
  if (!doc) {
    return {
      ok: false,
      workflowRunId: "",
      iterations: 0,
      error: `Document ${input.documentId} not found`,
    }
  }

  // 2. Resolve the doc spec — the caller may override (e.g. running
  //    the deviations agent over a doc whose primary category is
  //    "Cover Letter"); otherwise fall back to the doc's category.
  const specKey = (input.specOverride ?? doc.category) as DocSpecId
  const spec = getDocSpec(specKey)
  if (!spec) {
    return {
      ok: false,
      workflowRunId: "",
      iterations: 0,
      error: `Unknown document category/spec: ${specKey}`,
    }
  }

  // 3. Create a workflow_run row to track progress
  const [run] = await db
    .insert(workflowRuns)
    .values({
      workspaceId: doc.workspaceId,
      projectId: doc.projectId,
      kind: `ai.extract:${spec.id}`,
      status: "running",
      startedAt: new Date(),
      input: {
        documentId: input.documentId,
        filename: input.filename,
        category: spec.id,
      },
    })
    .returning({ id: workflowRuns.id })

  const workflowRunId = run!.id

  try {
    // 4. Load the agent's spec markdown (the per-category contract)
    const specPath = resolve(process.cwd(), spec.agentSpecPath)
    const agentSpecMarkdown = await loadAgentSpec(specPath)

    // 5. Pre-extract candidates (also done inside the agent runner, but
    //    we need them here for the coverage gate)
    const pre = await preExtractDocument({
      buffer: input.buffer,
      filename: input.filename,
      mimeType: input.mimeType,
    })

    // Persist the pre-extraction triple to runs/<runId>/ so the user can
    // inspect exactly what the agent saw.
    await dumpPreExtractArtefacts(workflowRunId, pre)

    // V2-11 — Hash-based verdict cache.
    // DISABLED by default: it made re-uploads return instantly (~1s, 0
    // tokens) and skip the review UI because the cached-hit branch never
    // emits `onProgress` events and never re-runs the persistor. Every
    // upload should hit the agent fresh. Re-enable per-deploy by setting
    // AI_EXTRACT_VERDICT_CACHE=on if you ever want it back. The helper
    // (findCachedVerdict) and the write-side `cache_eligible` field
    // below are left intact so flipping the flag is the only change.
    const surfaceHash = createHash("sha256").update(pre.surface).digest("hex")
    const cached =
      process.env.AI_EXTRACT_VERDICT_CACHE === "on"
        ? await findCachedVerdict({
            workspaceId: input.context.workspaceId,
            kind: `ai.extract:${spec.id}`,
            surfaceHash,
            currentRunId: workflowRunId,
          })
        : null
    if (cached) {
      console.log(
        `[extract.cache] HIT for ${spec.id} hash=${surfaceHash.slice(0, 12)} — skipping Sonnet`,
      )
      const cachedOutput = jsonSafe({
        ...(cached.output as Record<string, unknown>),
        cached_from: cached.workflowRunId,
        cache_hit: true,
        surfaceHash,
      })
      await db
        .update(workflowRuns)
        .set({
          status: "succeeded",
          finishedAt: new Date(),
          output: cachedOutput,
        })
        .where(eq(workflowRuns.id, workflowRunId))
      await db
        .update(documents)
        .set({ status: "scanned" })
        .where(eq(documents.id, input.documentId))
      await dumpRunToDisk({
        workflowRunId,
        status: "succeeded",
        output: {
          ...cachedOutput,
          documentId: input.documentId,
          filename: input.filename,
          category: spec.id,
        },
      })
      return {
        ok: true,
        workflowRunId,
        iterations: 0,
        verdict: (cached.output as { verdict?: unknown }).verdict,
        totals: {
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_create_tokens: 0,
        },
      }
    }
    // Record the surfaceHash in workflow_run.input for the next cache hit.
    await db
      .update(workflowRuns)
      .set({
        input: jsonSafe({
          documentId: input.documentId,
          filename: input.filename,
          spec: spec.id,
          surfaceHash,
        }),
      })
      .where(eq(workflowRuns.id, workflowRunId))

    // 5b. Fingerprint check: does the uploaded file match the slot the
    //     user dropped it into? If a different category scores higher,
    //     short-circuit and tell the UI to reclassify.
    const mimeKind = pre.manifest.kind
    const fingerprint = fingerprintDocument({
      surface: pre.surface,
      mimeKind,
    })
    const slotCheck = checkSlotMatch({
      expectedCategoryId: spec.id,
      fingerprint,
    })

    if (slotCheck.status === "mismatch") {
      await db
        .update(workflowRuns)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: `Document classified as '${slotCheck.detectedCategoryId}' but uploaded into '${spec.id}' slot`,
          output: {
            classification: {
              status: "mismatch",
              expectedCategoryId: spec.id,
              detectedCategoryId: slotCheck.detectedCategoryId,
              scores: fingerprint.scoresByCategory,
              signals: slotCheck.signals,
            },
          },
        })
        .where(eq(workflowRuns.id, workflowRunId))
      await db
        .update(documents)
        .set({ status: "rejected" })
        .where(eq(documents.id, input.documentId))
      return {
        ok: false,
        workflowRunId,
        iterations: 0,
        error: `Wrong slot: this looks like a ${slotCheck.detectedCategoryId}, not a ${spec.id}`,
      }
    }

    // 6. Run the agent — with up to one validator-feedback retry
    //
    // Chunked branch: when the spec opted into `chunkStrategy: "sheet"`
    // and the source is actually xlsx, split the workbook and run the
    // agent once per sheet. We merge the verdicts via spec.mergeChunks
    // before validation, so the existing validator + persistor flow is
    // unchanged.
    let attempts = 0
    let lastFeedback: string | null = null
    let agentResult: AgentRunResult
    let validation:
      | ReturnType<typeof validateVerdict>
      | null = null

    const wantsSheetChunking =
      spec.chunkStrategy === "sheet" && isXlsxBuffer(input.buffer)
    if (wantsSheetChunking) {
      const chunks = splitXlsxBySheet(input.buffer)
      if (chunks.length > 1 && spec.mergeChunks) {
        const perChunkVerdicts: unknown[] = []
        let mergedIterations = 0
        const mergedTotals = {
          input_tokens: 0,
          output_tokens: 0,
          cache_read_tokens: 0,
          cache_create_tokens: 0,
        }
        const mergedIterationLog: unknown[] = []
        const mergedRunMeta: Record<string, unknown> = { chunks: [] }
        let mergedFinalText = ""
        let firstFailure: AgentRunResult | null = null
        for (let i = 0; i < chunks.length; i++) {
          const ch = chunks[i]!
          attempts += 1
          const chunkResult = await runAgent({
            runId: `${workflowRunId}::chunk-${i}-${ch.name.slice(0, 24)}`,
            spec,
            source: {
              buffer: ch.buffer,
              // Tag the filename with the sheet so the agent's logs
              // are easy to trace back to a tab.
              filename: `${input.filename}#${ch.name}`,
              mimeType:
                input.mimeType ??
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
            agentSpecMarkdown,
            options: { feedback: null, onProgress: input.onProgress },
          })
          mergedIterations += chunkResult.iterations
          if (chunkResult.totals) {
            mergedTotals.input_tokens += chunkResult.totals.input_tokens ?? 0
            mergedTotals.output_tokens += chunkResult.totals.output_tokens ?? 0
            mergedTotals.cache_read_tokens +=
              chunkResult.totals.cache_read_tokens ?? 0
            mergedTotals.cache_create_tokens +=
              chunkResult.totals.cache_create_tokens ?? 0
          }
          if (chunkResult.iterationLog)
            mergedIterationLog.push(...chunkResult.iterationLog)
          if (chunkResult.finalText)
            mergedFinalText += `\n--- sheet: ${ch.name} ---\n${chunkResult.finalText}`
          ;(mergedRunMeta.chunks as unknown[]).push({
            index: ch.index,
            sheet: ch.name,
            ok: chunkResult.ok,
            iterations: chunkResult.iterations,
          })
          if (!chunkResult.ok || chunkResult.verdict === undefined) {
            // First-failure tracking — we still let the other chunks
            // run so partial output is visible, but we'll fail the
            // overall run if any chunk failed.
            if (!firstFailure) firstFailure = chunkResult
            continue
          }
          perChunkVerdicts.push(chunkResult.verdict)
        }
        // If literally no chunk yielded a verdict, fail in the same
        // shape the single-shot path would.
        if (perChunkVerdicts.length === 0) {
          const cause = firstFailure?.error ?? "All sheet chunks failed"
          await markRunFailed(workflowRunId, cause, {
            iterations: mergedIterations,
            totals: mergedTotals,
            iterationLog: mergedIterationLog,
            runMeta: mergedRunMeta,
            attempts,
          })
          return {
            ok: false,
            workflowRunId,
            iterations: mergedIterations,
            error: cause,
            totals: mergedTotals,
          }
        }
        const merged = spec.mergeChunks(perChunkVerdicts as never)
        agentResult = {
          ok: true,
          verdict: merged,
          iterations: mergedIterations,
          totals: mergedTotals,
          iterationLog: mergedIterationLog,
          runMeta: mergedRunMeta,
          finalText: mergedFinalText,
        } as unknown as AgentRunResult
        validation = validateVerdict({
          verdict: agentResult.verdict,
          schema: spec.schema,
          candidates: pre.candidates,
        })
        if (!validation.ok && MAX_VALIDATION_RETRIES === 0) {
          await markRunFailed(workflowRunId, "Validation failed", {
            validationErrors: validation.errors,
            coverageGaps: validation.coverageGaps,
            iterations: mergedIterations,
            totals: mergedTotals,
            iterationLog: mergedIterationLog,
            runMeta: mergedRunMeta,
            attempts,
            rejectedVerdict: agentResult.verdict,
          })
          return {
            ok: false,
            workflowRunId,
            iterations: mergedIterations,
            verdict: agentResult.verdict,
            validationErrors: validation.errors,
            coverageGaps: validation.coverageGaps,
            totals: mergedTotals,
          }
        }
        // Fall through to step 7 (persist) — agentResult + validation
        // are populated as if a single agent call had succeeded.
      }
    }

    while (!wantsSheetChunking || !agentResult!) {
      attempts += 1
      agentResult = await runAgent({
        runId: `${workflowRunId}::attempt-${attempts}`,
        spec,
        source: {
          buffer: input.buffer,
          filename: input.filename,
          mimeType: input.mimeType,
        },
        agentSpecMarkdown,
        options: { feedback: lastFeedback, onProgress: input.onProgress },
      })

      if (!agentResult.ok || agentResult.verdict === undefined) {
        await markRunFailed(
          workflowRunId,
          agentResult.error ?? "Agent did not submit a verdict",
          {
            iterations: agentResult.iterations,
            totals: agentResult.totals,
            iterationLog: agentResult.iterationLog,
            runMeta: agentResult.runMeta,
            // Surface the chunked-path ledger (units_in/units_ok + per-unit
            // failure reasons) so result.json shows WHY each unit failed
            // — otherwise "0 tokens, 6 units failed" is opaque.
            ledger: agentResult.ledger,
            attempts,
          },
        )
        return {
          ok: false,
          workflowRunId,
          iterations: agentResult.iterations,
          error: agentResult.error ?? "Agent did not submit a verdict",
          totals: agentResult.totals,
        }
      }

      validation = validateVerdict({
        verdict: agentResult.verdict,
        schema: spec.schema,
        candidates: pre.candidates,
      })

      // Chunked-path failures hide inside coverage_warnings as
      // `_chunk_N` rows — the merged verdict can still pass an open
      // schema (e.g. z.unknown()). Treat any dropped chunk as a
      // terminal failure so the UI surfaces "Review required" instead
      // of "extracted with 1 field populated".
      const droppedChunks = extractDroppedChunkWarnings(agentResult.verdict)
      if (droppedChunks.length > 0) {
        const message = `Partial extraction — ${droppedChunks.length} chunk${droppedChunks.length === 1 ? "" : "s"} could not be extracted (${droppedChunks.map((d) => d.field).join(", ")})`
        await markRunFailed(workflowRunId, message, {
          droppedChunks,
          iterations: agentResult.iterations,
          totals: agentResult.totals,
          iterationLog: agentResult.iterationLog,
          runMeta: agentResult.runMeta,
          ledger: agentResult.ledger,
          attempts,
          rejectedVerdict: agentResult.verdict,
        })
        return {
          ok: false,
          workflowRunId,
          iterations: agentResult.iterations,
          verdict: agentResult.verdict,
          error: message,
          totals: agentResult.totals,
        }
      }

      if (validation.ok) break

      if (attempts > MAX_VALIDATION_RETRIES) {
        await markRunFailed(workflowRunId, "Validation failed", {
          validationErrors: validation.errors,
          coverageGaps: validation.coverageGaps,
          iterations: agentResult.iterations,
          totals: agentResult.totals,
          iterationLog: agentResult.iterationLog,
          runMeta: agentResult.runMeta,
          attempts,
          // Snapshot the agent's verdict on failure so we can see what
          // shape was actually submitted — invaluable for diagnosing
          // schema mismatches.
          rejectedVerdict: agentResult.verdict,
        })
        return {
          ok: false,
          workflowRunId,
          iterations: agentResult.iterations,
          verdict: agentResult.verdict,
          validationErrors: validation.errors,
          coverageGaps: validation.coverageGaps,
          totals: agentResult.totals,
        }
      }

      // Build the feedback string for the next attempt
      lastFeedback = buildValidationFeedback(validation.errors, validation.coverageGaps)
    }

    // 7. Persist via the spec's persistor — UNLESS the caller opted
    //    out (addenda pipeline wants the verdict only, no mutation of
    //    the project's current state).
    try {
      if (input.persist !== false) {
        const persist = getPersistor(spec.id) ?? spec.persistor
        await persist(validation!.value as never, input.context)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Persistor failed"
      await markRunFailed(workflowRunId, message, {
        iterations: agentResult.iterations,
        totals: agentResult.totals,
        iterationLog: agentResult.iterationLog,
        runMeta: agentResult.runMeta,
        attempts,
      })
      return {
        ok: false,
        workflowRunId,
        iterations: agentResult.iterations,
        verdict: agentResult.verdict,
        error: message,
        totals: agentResult.totals,
      }
    }

    // 8. Mark success on the workflow + document
    const verdictHash = createHash("sha256")
      .update(stringifyJsonSafe(agentResult.verdict))
      .digest("hex")

    // Cache-eligibility gate: a run is only re-usable by future
    // uploads of the same bytes if its coverage ledger balances AND
    // the verdict carries content beyond coverage metadata. Belt-and-
    // suspenders against cache-poisoning: stub-schema runs that emit
    // an empty `{coverage_warnings:[...]}` and runs whose chunked
    // ledger is short MUST NOT be cached.
    const cacheEligible = isVerdictCacheEligible(agentResult.verdict)

    const successOutput = jsonSafe({
      iterations: agentResult.iterations,
      totals: agentResult.totals,
      iterationLog: agentResult.iterationLog,
      runMeta: agentResult.runMeta,
      verdict: validation!.value,
      // Raw agent verdict BEFORE flatten/zod-parse — invaluable for
      // debugging when the flatten preprocess strips data.
      rawAgentVerdict: agentResult.verdict,
      verdictHash,
      attempts,
      cache_eligible: cacheEligible,
    })
    await db
      .update(workflowRuns)
      .set({
        status: "succeeded",
        finishedAt: new Date(),
        output: successOutput,
      })
      .where(eq(workflowRuns.id, workflowRunId))
    await dumpRunToDisk({
      workflowRunId,
      status: "succeeded",
      output: {
        ...successOutput,
        documentId: input.documentId,
        filename: input.filename,
        category: spec.id,
      },
    })

    await db
      .update(documents)
      .set({
        status: "scanned",
        uploadedAt: new Date(),
      })
      .where(eq(documents.id, input.documentId))

    await recordAudit({
      workspaceId: input.context.workspaceId,
      projectId: input.context.projectId,
      actorUserId: input.context.userId,
      actorKind: "user",
      action: `ai.extract.succeeded:${spec.id}`,
      targetKind: "document",
      targetId: input.documentId,
      payload: {
        iterations: agentResult.iterations,
        totals: agentResult.totals,
        runMeta: agentResult.runMeta,
        verdictHash,
        attempts,
      },
    })

    return {
      ok: true,
      workflowRunId,
      iterations: agentResult.iterations,
      verdict: agentResult.verdict,
      totals: agentResult.totals,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workflow crashed"
    await markRunFailed(workflowRunId, message)
    return {
      ok: false,
      workflowRunId,
      iterations: 0,
      error: message,
    }
  }
}

/**
 * Pull the `_chunk_N` WARN rows out of a chunked-path verdict's
 * `coverage_warnings` array. These are appended by `runChunkedAgent`
 * when a chunk hits its retry cap; their presence means the verdict is
 * partial and should not be treated as a successful extraction.
 */
/**
 * A verdict is cache-eligible only if:
 *   - it has at least one meaningful (non-coverage / non-ledger) key, AND
 *   - it carries no `_chunk_*` coverage warnings (chunked-path failures), AND
 *   - it carries no `_dev_cap` coverage warnings (AI_CHUNKED_MAX_UNITS), AND
 *   - if a `_coverage_ledger` is present, units_ok === units_in AND
 *     no `units_skipped` / `dev_cap_applied` recorded.
 */
function isVerdictCacheEligible(verdict: unknown): boolean {
  if (!verdict || typeof verdict !== "object" || Array.isArray(verdict)) {
    return false
  }
  const v = verdict as Record<string, unknown>
  const droppedChunks = extractDroppedChunkWarnings(verdict)
  if (droppedChunks.length > 0) return false
  // _dev_cap warning means AI_CHUNKED_MAX_UNITS truncated the run —
  // never cache a capped result (re-running without the cap would
  // otherwise replay the truncated verdict).
  const warnings = v.coverage_warnings
  if (Array.isArray(warnings)) {
    for (const w of warnings) {
      if (w && typeof w === "object") {
        const field = (w as { field?: unknown }).field
        if (typeof field === "string" && field === "_dev_cap") return false
      }
    }
  }
  const ledger = v._coverage_ledger as
    | {
        units_in?: number
        units_ok?: number
        units_skipped?: unknown
        dev_cap_applied?: unknown
      }
    | undefined
  if (ledger) {
    if (typeof ledger.units_in === "number" && typeof ledger.units_ok === "number") {
      if (ledger.units_ok !== ledger.units_in) return false
    }
    if (Array.isArray(ledger.units_skipped) && ledger.units_skipped.length > 0) {
      return false
    }
    if (ledger.dev_cap_applied != null) return false
  }
  const meaningfulKeys = Object.keys(v).filter(
    (k) => k !== "coverage_warnings" && k !== "_coverage_ledger" && k !== "instances_examined",
  )
  return meaningfulKeys.length > 0
}

function extractDroppedChunkWarnings(
  verdict: unknown,
): Array<{ field: string; message: string }> {
  if (!verdict || typeof verdict !== "object") return []
  const warnings = (verdict as { coverage_warnings?: unknown })
    .coverage_warnings
  if (!Array.isArray(warnings)) return []
  const out: Array<{ field: string; message: string }> = []
  for (const w of warnings) {
    if (w && typeof w === "object") {
      const field = (w as { field?: unknown }).field
      const message = (w as { message?: unknown }).message
      if (typeof field === "string" && field.startsWith("_chunk_")) {
        out.push({
          field,
          message: typeof message === "string" ? message : "",
        })
      }
    }
  }
  return out
}

function buildValidationFeedback(
  errors: { path: string; message: string }[],
  coverageGaps: { candidateId: string; field: string }[],
): string {
  const parts: string[] = []
  if (errors.length > 0) {
    parts.push("Schema errors:")
    for (const e of errors.slice(0, 30)) {
      parts.push(`  - ${e.path}: ${e.message}`)
    }
  }
  if (coverageGaps.length > 0) {
    parts.push("Missing coverage (these candidates were not in instances_examined):")
    for (const g of coverageGaps.slice(0, 30)) {
      parts.push(`  - ${g.field} :: ${g.candidateId}`)
    }
  }
  return parts.join("\n")
}

async function markRunFailed(
  workflowRunId: string,
  error: string,
  output?: Record<string, unknown>,
): Promise<void> {
  // Defensive: the rejected verdict / iteration log may carry BigInts
  // (zod-parsed values, bigintLike fields) that JSON.stringify can't
  // serialise. Round-trip through jsonSafe so the failure write itself
  // doesn't fail with "Do not know how to serialize a BigInt".
  const safeOutput = output ? jsonSafe(output) : undefined
  await db
    .update(workflowRuns)
    .set({
      status: "failed",
      finishedAt: new Date(),
      error,
      output: safeOutput,
    })
    .where(eq(workflowRuns.id, workflowRunId))
  await dumpRunToDisk({
    workflowRunId,
    status: "failed",
    error,
    output: safeOutput,
  })
}

/**
 * Persist the deterministic pre-extractor's output (manifest, surface,
 * candidates) to `runs/<workflowRunId>/` so the user can inspect what
 * the agent received — even after the sandbox is destroyed.
 */
async function dumpPreExtractArtefacts(
  workflowRunId: string,
  pre: { manifest: unknown; surface: string; candidates: unknown },
): Promise<void> {
  try {
    const dir = resolve(process.cwd(), "runs", workflowRunId)
    await mkdir(dir, { recursive: true })
    const tokens = approxTokens(pre.surface)
    await Promise.all([
      writeFile(
        resolve(dir, "manifest.json"),
        JSON.stringify(pre.manifest, null, 2),
      ),
      writeFile(resolve(dir, "surface.md"), pre.surface),
      writeFile(
        resolve(dir, "candidates.json"),
        JSON.stringify(pre.candidates, null, 2),
      ),
      writeFile(
        resolve(dir, "tokens.json"),
        JSON.stringify(
          {
            chars: pre.surface.length,
            approx_tokens: tokens,
            // Sonnet 4.6 list pricing as of 2026-Q2: $3 / MTok in, $15 out
            //   input  = approx_tokens × $3   / 1_000_000
            //   output = ~3000 tokens × $15   / 1_000_000  (typical verdict)
            estimated_cost_usd: Number(
              ((tokens * 3 + 3000 * 15) / 1_000_000).toFixed(4),
            ),
            routing:
              tokens <= 175_000 ? ("single_shot" as const) : ("chunked" as const),
          },
          null,
          2,
        ),
      ),
    ])
  } catch (err) {
    console.warn("[extract.dumpPreExtract] write failed", err)
  }
}

/** Approximate Sonnet tokens — 3.5 chars/token is a good prose heuristic. */
function approxTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}

/**
 * Write every workflow run's terminal state to
 * `runs/<workflowRunId>/result.json` so every artefact for a run lives in
 * one directory: pre-extract triple, sandbox, log/iter-NNN, chunks/, and
 * now the final result. Best-effort; never throws.
 */
async function dumpRunToDisk(payload: {
  workflowRunId: string
  status: "succeeded" | "failed"
  error?: string
  output?: unknown
}): Promise<void> {
  try {
    const dir = resolve(process.cwd(), "runs", payload.workflowRunId)
    await mkdir(dir, { recursive: true })
    const path = resolve(dir, "result.json")
    await writeFile(
      path,
      JSON.stringify(
        {
          workflowRunId: payload.workflowRunId,
          status: payload.status,
          error: payload.error ?? null,
          finishedAt: new Date().toISOString(),
          output: payload.output ?? null,
        },
        // bigint → string so JSON.stringify doesn't throw
        (_k, v) => (typeof v === "bigint" ? `${v.toString()}n` : v),
        2,
      ),
    )
  } catch (err) {
    console.warn("[extract.dumpRun] write failed", err)
  }
}

/**
 * V2-11 — Look up a prior successful workflow_run with the same surface
 * hash (same bytes → same surface → same verdict). Restricted to the same
 * workspace + same kind. Returns the cached output (verdict + totals etc.)
 * or null if no hit.
 */
async function findCachedVerdict(args: {
  workspaceId: string
  kind: string
  surfaceHash: string
  currentRunId: string
}): Promise<{ workflowRunId: string; output: unknown } | null> {
  const { and: andOp, eq: eqOp, sql, ne } = await import("drizzle-orm")
  const rows = await db
    .select({
      id: workflowRuns.id,
      output: workflowRuns.output,
    })
    .from(workflowRuns)
    .where(
      andOp(
        eqOp(workflowRuns.workspaceId, args.workspaceId),
        eqOp(workflowRuns.kind, args.kind),
        eqOp(workflowRuns.status, "succeeded"),
        ne(workflowRuns.id, args.currentRunId),
        sql`${workflowRuns.input}->>'surfaceHash' = ${args.surfaceHash}`,
        // Defence-in-depth: a row with cache_eligible explicitly false
        // (poisoned by a previous chunked-partial / stub-empty result)
        // must NOT be served. Older rows without the field are still
        // honoured to preserve back-compat.
        sql`(${workflowRuns.output}->>'cache_eligible')::text IS DISTINCT FROM 'false'`,
      ),
    )
    .orderBy(sql`${workflowRuns.finishedAt} DESC NULLS LAST`)
    .limit(1)
  if (rows.length === 0) return null
  const row = rows[0]!
  return { workflowRunId: row.id, output: row.output }
}
