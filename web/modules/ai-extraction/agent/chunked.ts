/**
 * Chunked extraction path for documents that don't fit a single Sonnet
 * call. Replaces the old greedy-pack strategy that silently dropped
 * chunks on max_tokens / parse failure.
 *
 * Strategy:
 *   1. Split surface into UNITS by a per-mime/per-spec splitter:
 *        - specification + ≥2 CSI section markers → split per CSI section
 *        - XLSX                                    → split per sheet
 *        - everything else                         → split per `## ` heading
 *      No greedy re-packing. Each unit gets its own API call.
 *   2. For each unit, call Sonnet ONCE asking it to emit a JSON object
 *      for that unit's fields. If the response truncates (max_tokens) or
 *      fails to parse, SUBDIVIDE the unit at the nearest internal
 *      boundary (PART markers / blank-line paragraph break / midpoint
 *      snapped to \n) and recurse on each half — until either it
 *      succeeds or the text falls below MIN_UNIT_CHARS.
 *   3. Coverage ledger: track `units_in` (top-level after splitting) vs
 *      `units_ok` (top-level units whose every descendant leaf succeeded).
 *      The chunked run only returns `ok:true` when they balance.
 *   4. Surface failures as `coverage_warnings: [{field:'_chunk_<unitId>'…}]`
 *      so the existing `extractDroppedChunkWarnings` terminal-failure
 *      gate in extract-document.ts fires (no requeue, no silent success
 *      even on stub schemas).
 *
 * No second LLM "merge" call. No bash. No iterations. N+0 Claude calls.
 */
import Anthropic from "@anthropic-ai/sdk"
import { mkdir, writeFile } from "node:fs/promises"
import { resolve as pathResolve } from "node:path"

import {
  anthropic,
  ANTHROPIC_BETAS,
  CHUNKED_MODEL,
  DEFAULT_CHUNKED_MAX_UNITS,
  DEFAULT_MODEL,
} from "@/modules/ai-extraction/client"
import type { DocSpec } from "@/modules/ai-extraction/specs/types"

import type { AgentProgressEvent } from "./runner"

/**
 * The runner passes `${workflowRunId}::attempt-N` as runId. The
 * workflow's other forensics (manifest.json, surface.md, result.json)
 * land at `runs/<workflowRunId>/`. We want chunked forensics to land
 * in the SAME dir — strip the `::attempt-N` suffix and any unsafe
 * path chars so all per-run files live together.
 */
function safeRunIdDir(runId: string | undefined): string | undefined {
  if (!runId) return undefined
  const justWorkflow = runId.split("::")[0]!
  return justWorkflow.replace(/[^A-Za-z0-9._-]+/g, "_")
}

export interface ChunkedRunInput {
  spec: DocSpec<unknown>
  agentSpecMarkdown: string
  surface: string
  filename: string
  /** Mime kind from the pre-extractor — drives the splitter choice. */
  mimeKind: "pdf" | "xlsx" | "docx" | "image" | "unknown"
  /** Optional — when set, per-unit artefacts are persisted to
   *  `runs/<runId>/chunks/` for post-mortem. */
  runId?: string
  /** Resolved model (runner threads `input.options?.model ?? DEFAULT_MODEL`). */
  model?: string
  /**
   * Max top-level units to extract (per env `AI_CHUNKED_MAX_UNITS`).
   * 0 = unlimited. When the splitter produces more units than this,
   * only the first N are processed; the rest are recorded as
   * `units_skipped` and the verdict is marked cache-ineligible so a
   * capped dev result never poisons a future full run.
   */
  maxUnits?: number
  /** Live progress callback — fires after each top-level unit resolves. */
  onProgress?: (event: AgentProgressEvent) => void | Promise<void>
}

export interface ChunkedRunResult {
  ok: boolean
  verdict?: unknown
  /** Top-level unit count. */
  chunks: number
  ledger: CoverageLedger
  totals: {
    input_tokens: number
    output_tokens: number
    cache_read_tokens: number
    cache_create_tokens: number
  }
  error?: string
}

// Output ceiling per call. Sonnet 4.6 supports 64k via the
// `output-128k-2025-02-19` beta (set in ANTHROPIC_BETAS).
const MAX_OUTPUT_TOKENS = 64_000
// Below this size, don't try to subdivide further — record the failure.
const MIN_UNIT_CHARS = 4_000
// Up-front fine-splitting target. Any top-level unit larger than this
// is pre-split at internal boundaries BEFORE the first API call so we
// optimise for completeness over cost: small units = no max_tokens
// truncation, no reliance on reactive recursion. ~8k chars ≈ ~2k input
// tokens → well-bounded ≤16k output tokens, far under the 64k ceiling.
const MAX_UNIT_CHARS_PRESPLIT = 8_000
// Top-level concurrency. Recursion inside extractUnit also fans out, so
// the actual peak concurrency is roughly MAX_CONCURRENT_UNITS × 2.
const MAX_CONCURRENT_UNITS = 5
// One retry per leaf on transient network errors only (stream cut,
// 5xx, 429, "overloaded"). This catches the exact failure mode that
// killed `p.1` and `p.19` in the dev-cap run ("api_error: ? terminated")
// without re-enabling any of the upstream retry layers (worker
// requeue, validation retry, single-shot transient retry — all
// remain at 1 attempt).
const TRANSIENT_MAX_ATTEMPTS = 2

/**
 * Process-wide breaker for the user-cap 400 ("You have reached your
 * specified API usage limits"). Once we see this, every subsequent
 * leaf in this process short-circuits with the same reason — no point
 * making ~250ms API round-trips just to receive the same 400. The
 * flag clears on process restart. Lifting the cap requires a console
 * change anyway, so resetting on restart is correct.
 */
let chunkedUserCapHit = false

function isUserCapError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes("specified API usage limits") ||
    msg.includes("specified API usage limit")
  )
}
const TRANSIENT_HINTS = [
  "overloaded",
  "stream terminated",
  "econnreset",
  "etimedout",
  "fetch failed",
  "socket hang up",
]
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504, 529])

// ─────────────────────────────────────────────────────────────────────
// Splitter strategy — per-spec / per-mime
// ─────────────────────────────────────────────────────────────────────

export interface Unit {
  id: string
  text: string
}

type Splitter = (surface: string) => Unit[]

/**
 * Pick a splitter based on spec id + mime kind. Order matters: the most
 * specific signal wins. Falls back through CSI → XLSX-sheet → `## `
 * heading → whole-surface-one-unit.
 */
export function splitStrategyFor(
  specId: string,
  mimeKind: ChunkedRunInput["mimeKind"],
): Splitter {
  if (specId === "specification") {
    return (s) => {
      const csi = splitByCsiSections(s)
      // Defence against a TOC-only PDF: if every CSI marker sits in
      // the first 5% of the surface (= the cover page's table of
      // contents) the "sections" are not real body boundaries and we
      // get one giant tail unit containing 95% of the doc. Detect that
      // and fall back to per-page splits.
      const tocOnly = isCsiTocOnly(s, csi)
      if (csi.length >= 2 && !tocOnly) return csi
      return splitByMarkdownHeadings(s)
    }
  }
  if (mimeKind === "xlsx") {
    return (s) => {
      const sheets = splitBySheetHeadings(s)
      if (sheets.length >= 1) return sheets
      return splitByMarkdownHeadings(s)
    }
  }
  return splitByMarkdownHeadings
}

/**
 * Returns true when the CSI splitter's output looks like it found only
 * TOC mentions, not real body section starts. Heuristic: the FINAL
 * unit's text is larger than the SUM of every other unit's text, which
 * means every CSI marker lived in the surface preamble (the TOC) and
 * the entire body fell into one tail unit.
 */
function isCsiTocOnly(surface: string, units: Unit[]): boolean {
  if (units.length < 2) return false
  const lastChars = units[units.length - 1]!.text.length
  const otherChars = units
    .slice(0, -1)
    .reduce((s, u) => s + u.text.length, 0)
  // Tail dominates by 4x: every "section" before it is just a TOC line.
  return lastChars > otherChars * 4 && lastChars > surface.length * 0.5
}

/** Split per `## ` markdown heading (default). */
function splitByMarkdownHeadings(surface: string): Unit[] {
  const lines = surface.split("\n")
  const out: Unit[] = []
  let bufLines: string[] = []
  let bufId = "unit_0"
  let idx = 0
  for (const line of lines) {
    if (line.startsWith("## ") && bufLines.length > 0) {
      out.push({ id: bufId, text: bufLines.join("\n") })
      bufLines = []
      idx += 1
      bufId = headingToId(line, idx)
    }
    if (line.startsWith("## ") && bufLines.length === 0 && out.length === 0) {
      // First heading — establishes id for the first unit.
      bufId = headingToId(line, idx)
    }
    bufLines.push(line)
  }
  if (bufLines.length > 0) {
    out.push({ id: bufId, text: bufLines.join("\n") })
  }
  if (out.length === 0) {
    return [{ id: "unit_0", text: surface }]
  }
  return out
}

/** Split per `## Sheet:` heading (XLSX). */
function splitBySheetHeadings(surface: string): Unit[] {
  const lines = surface.split("\n")
  const out: Unit[] = []
  let bufLines: string[] = []
  let bufId = "preamble"
  let idx = 0
  for (const line of lines) {
    const m = line.match(/^##\s+Sheet:\s+`([^`]+)`/)
    if (m && bufLines.length > 0) {
      out.push({ id: bufId, text: bufLines.join("\n") })
      bufLines = []
      idx += 1
      bufId = `sheet:${m[1]!.trim()}`
    } else if (m && bufLines.length === 0) {
      bufId = `sheet:${m[1]!.trim()}`
    }
    bufLines.push(line)
  }
  if (bufLines.length > 0) {
    out.push({ id: bufId, text: bufLines.join("\n") })
  }
  return out
}

/**
 * Split per CSI section start. Pattern: `Section NN NN NN — Title` or
 * `SECTION NN NN NN - Title`, on its own line, anywhere in the surface.
 * Catches both Markdown-prefixed and `[p.N]`-prefixed lines.
 */
function splitByCsiSections(surface: string): Unit[] {
  const lines = surface.split("\n")
  const pattern = /(?:^|\])\s*(?:SECTION|Section)\s+(\d{2})\s+(\d{2})\s+(\d{2})\s*[—–-]/
  const starts: { lineIdx: number; id: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]!.match(pattern)
    if (m) {
      starts.push({
        lineIdx: i,
        id: `csi:${m[1]}${m[2]}${m[3]}`,
      })
    }
  }
  if (starts.length < 2) return [] // signal: not enough matches, caller falls back
  const out: Unit[] = []
  // Preamble (anything before the first section start)
  if (starts[0]!.lineIdx > 0) {
    out.push({ id: "preamble", text: lines.slice(0, starts[0]!.lineIdx).join("\n") })
  }
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i]!.lineIdx
    const to = i + 1 < starts.length ? starts[i + 1]!.lineIdx : lines.length
    out.push({ id: starts[i]!.id, text: lines.slice(from, to).join("\n") })
  }
  return out
}

/**
 * Pre-split oversize units at internal boundaries (PART markers / blank
 * lines / nearest newline) until every produced sub-unit fits in
 * `MAX_UNIT_CHARS_PRESPLIT`. This is the "small units up-front"
 * optimisation: each leaf is bounded before the first API call so the
 * model never sees a unit large enough to risk truncation.
 *
 * The returned sub-units keep the parent's id with binary-suffixed
 * children (`p.47` → `p.47~0`, `p.47~1`, `p.47~0~0`, …). The TOP-LEVEL
 * count returned to the caller stays equal to the splitter's output —
 * pre-splitting affects leaves, not ledger units. Caller groups by the
 * top-level id (everything before the first `.` after the type prefix).
 */
function preSplitOversize(units: Unit[]): Unit[] {
  const out: Unit[] = []
  for (const u of units) {
    if (u.text.length <= MAX_UNIT_CHARS_PRESPLIT) {
      out.push(u)
      continue
    }
    out.push(...subdivideToTarget(u, MAX_UNIT_CHARS_PRESPLIT))
  }
  return out
}

function subdivideToTarget(unit: Unit, target: number): Unit[] {
  if (unit.text.length <= target) return [unit]
  const offset = chooseSplitOffset(unit.text)
  const left = unit.text.slice(0, offset).trim()
  const right = unit.text.slice(offset).trim()
  // Refuse to subdivide if either side would be empty — better one
  // oversize unit than infinite recursion. Reactive recursion will
  // still try to split it on max_tokens.
  if (left.length === 0 || right.length === 0) return [unit]
  // Subdivision suffix uses `~` — NOT `.` — because base IDs like
  // `p.1`, `p.47` already contain `.`. Using `.0`/`.1` here would
  // collide with page IDs and topLevelIdOf would mis-attribute `p.1`'s
  // leaves to a phantom top unit `p`.
  return [
    ...subdivideToTarget({ id: `${unit.id}~0`, text: left }, target),
    ...subdivideToTarget({ id: `${unit.id}~1`, text: right }, target),
  ]
}

/**
 * Recover the top-level id from a pre-split or recursion-suffixed id.
 * Subdivisions use the `~` delimiter (see subdivideToTarget +
 * extractUnit recursion). `p.47` → `p.47`. `p.47~0~1` → `p.47`.
 * `csi:033000~1` → `csi:033000`. `sheet:2B~0` → `sheet:2B`.
 */
function topLevelIdOf(id: string): string {
  const idx = id.indexOf("~")
  if (idx >= 0) return id.substring(0, idx)
  return id
}

function headingToId(line: string, fallbackIdx: number): string {
  const page = line.match(/\[ref:p=(\d+)\]/)
  if (page) return `p.${page[1]}`
  const sheet = line.match(/\[ref:sheet=([^\]]+)\]/)
  if (sheet) return `sheet:${sheet[1]!.trim()}`
  const csi = line.match(/(?:SECTION|Section)\s+(\d{2})\s+(\d{2})\s+(\d{2})/)
  if (csi) return `csi:${csi[1]}${csi[2]}${csi[3]}`
  return `unit_${fallbackIdx}`
}

// ─────────────────────────────────────────────────────────────────────
// Boundary-biased halving for recursion
// ─────────────────────────────────────────────────────────────────────

/**
 * Choose a split point inside a unit's text. Preference order:
 *   1. CSI inner boundary (PART 1/2/3 markers)
 *   2. Blank-line paragraph break closest to midpoint
 *   3. Nearest `\n` to midpoint
 *   4. Raw midpoint (only when no newline exists at all)
 */
function chooseSplitOffset(text: string): number {
  const mid = Math.floor(text.length / 2)
  // 1. PART markers
  const partRe = /\n\s*PART\s+[123]\b/g
  const partCandidates: number[] = []
  let m
  while ((m = partRe.exec(text)) !== null) partCandidates.push(m.index)
  if (partCandidates.length > 0) {
    const closest = nearestTo(partCandidates, mid)
    // Reject the very first or very last PART marker if it would yield
    // a near-empty first/second half.
    if (closest > MIN_UNIT_CHARS / 2 && text.length - closest > MIN_UNIT_CHARS / 2) {
      return closest
    }
  }
  // 2. Blank-line paragraph break
  const paraRe = /\n\s*\n/g
  const paraCandidates: number[] = []
  while ((m = paraRe.exec(text)) !== null) paraCandidates.push(m.index)
  if (paraCandidates.length > 0) {
    return nearestTo(paraCandidates, mid)
  }
  // 3. Nearest `\n`
  const nlBefore = text.lastIndexOf("\n", mid)
  const nlAfter = text.indexOf("\n", mid)
  if (nlBefore >= 0 && nlAfter >= 0) {
    return mid - nlBefore <= nlAfter - mid ? nlBefore : nlAfter
  }
  if (nlBefore >= 0) return nlBefore
  if (nlAfter >= 0) return nlAfter
  // 4. Raw midpoint
  return mid
}

function nearestTo(arr: number[], target: number): number {
  let best = arr[0]!
  let bestDist = Math.abs(best - target)
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i]! - target)
    if (d < bestDist) {
      best = arr[i]!
      bestDist = d
    }
  }
  return best
}

// ─────────────────────────────────────────────────────────────────────
// Per-leaf API call
// ─────────────────────────────────────────────────────────────────────

interface LeafCallResult {
  ok: boolean
  verdict?: unknown
  reason?: string
  stopReason: string | null
  durationMs: number
  rawText: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read: number
    cache_create: number
  }
  attempts: number
}

async function callExtractOnce(args: {
  spec: DocSpec<unknown>
  agentSpecMarkdown: string
  filename: string
  unitId: string
  text: string
  model: string
}): Promise<LeafCallResult> {
  const startMs = Date.now()

  // Breaker: if a previous leaf already hit the user-cap 400 this
  // process, return the same reason immediately. Saves ~250ms per leaf
  // and prevents flooding the API after we know the cap is hit.
  if (chunkedUserCapHit) {
    return {
      ok: false,
      reason:
        "api_error: user-cap (breaker tripped earlier this process — Anthropic returned 'specified API usage limits' 400)",
      stopReason: null,
      durationMs: 0,
      rawText: "",
      usage: { input_tokens: 0, output_tokens: 0, cache_read: 0, cache_create: 0 },
      attempts: 0,
    }
  }

  // IMPORTANT: the system block must be IDENTICAL across every leaf
  // for prompt caching to hit. Anything per-unit (unitId, filename)
  // belongs in the user message. With the old shape (`UNIT "${unitId}"`
  // inside system) the cache key was unique per leaf and every call
  // paid full price for the spec markdown — cache_read_tokens stayed
  // at 0 on every run. Moving per-leaf identity to the user message
  // makes the system block constant per (spec, model) so subsequent
  // leaves hit the cache.
  const system = `You are the ProcureX extraction adjudicator for category "${args.spec.id}" (${args.spec.label}).

You are seeing ONE UNIT of a large document that is being processed in parts. A deterministic merger combines your partial verdict with the other units' verdicts after every call.

YOUR JOB on this unit:
  1. SCAN every line for schema fields you can identify.
  2. For SCALAR fields (string/number/boolean) — if the value appears ANYWHERE in this unit, FILL IT IN. Do not output null just because the field "might be in another unit". If you see "Contract form code: XYZ" you extract "XYZ".
  3. For ARRAYS — include only rows that appear in THIS unit. The merger dedupes across units.
  4. If a scalar truly is NOT in this unit, set it to null.
  5. NEVER invent values. If unsure, set null.

Output a single JSON object matching the schema in the spec below. No prose, no markdown fences. KEEP THE JSON COMPACT — your hard output ceiling is ${MAX_OUTPUT_TOKENS} tokens; if you sense the response would exceed it, omit boilerplate/standard-clause display fields and prioritise EXTRACT fields.

--- CATEGORY SPEC ---
${args.agentSpecMarkdown}
--- END SPEC ---`

  const user = `Filename: ${args.filename}
Unit: ${args.unitId}

--- UNIT SURFACE ---
${args.text}
--- END UNIT ---

Emit the partial verdict JSON now.`

  let lastErr: unknown = null
  for (let attempt = 1; attempt <= TRANSIENT_MAX_ATTEMPTS; attempt++) {
    try {
      // MUST stream — the SDK rejects non-streaming calls whose
      // worst-case execution time (~max_tokens / throughput) exceeds
      // 10 minutes. At max_tokens=64k that ceiling trips immediately
      // and every call fails with
      //   "Streaming is required for operations that may take longer
      //    than 10 minutes."
      // Haiku 4.5 doesn't use extended thinking, so drop the
      // `interleaved-thinking-2025-05-14` beta for it — only keep
      // the output-extension beta. Sonnet/Opus get both.
      const betas = args.model.startsWith("claude-haiku")
        ? ANTHROPIC_BETAS.filter((b) => b !== "interleaved-thinking-2025-05-14")
        : [...ANTHROPIC_BETAS]
      const stream = anthropic.beta.messages.stream({
        model: args.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: [
          { type: "text", text: system, cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: user }],
        betas,
      })
      const resp = await stream.finalMessage()

      const u = resp.usage as Anthropic.Beta.Messages.BetaUsage & {
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }
      const usage = {
        input_tokens: u.input_tokens ?? 0,
        output_tokens: u.output_tokens ?? 0,
        cache_read: u.cache_read_input_tokens ?? 0,
        cache_create: u.cache_creation_input_tokens ?? 0,
      }
      const stopReason = resp.stop_reason ?? null

      const text = resp.content
        .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim()

      // max_tokens → response is almost certainly truncated; subdivide.
      if (stopReason === "max_tokens") {
        return {
          ok: false,
          reason: "max_tokens",
          stopReason,
          durationMs: Date.now() - startMs,
          rawText: text,
          usage,
          attempts: attempt,
        }
      }

      const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
      try {
        const verdict = JSON.parse(stripped)
        return {
          ok: true,
          verdict,
          stopReason,
          durationMs: Date.now() - startMs,
          rawText: text,
          usage,
          attempts: attempt,
        }
      } catch {
        const start = stripped.indexOf("{")
        const end = stripped.lastIndexOf("}")
        if (start >= 0 && end > start) {
          try {
            const verdict = JSON.parse(stripped.slice(start, end + 1))
            return {
              ok: true,
              verdict,
              stopReason,
              durationMs: Date.now() - startMs,
              rawText: text,
              usage,
              attempts: attempt,
            }
          } catch {
            // fall through to subdivide
          }
        }
        return {
          ok: false,
          reason: "json_parse",
          stopReason,
          durationMs: Date.now() - startMs,
          rawText: text,
          usage,
          attempts: attempt,
        }
      }
    } catch (err) {
      lastErr = err
      if (isUserCapError(err) && !chunkedUserCapHit) {
        chunkedUserCapHit = true
        console.warn(
          "[chunked.user-cap] Anthropic returned 'specified API usage limits' 400. Disabling further chunked extraction calls for the rest of this process; remaining leaves will short-circuit. Raise the cap in console.anthropic.com or restart the process after a cap reset.",
        )
      }
      if (!isTransient(err) || attempt === TRANSIENT_MAX_ATTEMPTS) {
        return {
          ok: false,
          reason: `api_error: ${describeError(err)}`,
          stopReason: null,
          durationMs: Date.now() - startMs,
          rawText: "",
          usage: { input_tokens: 0, output_tokens: 0, cache_read: 0, cache_create: 0 },
          attempts: attempt,
        }
      }
      await new Promise((r) => setTimeout(r, attempt * 1500))
    }
  }
  return {
    ok: false,
    reason: `api_error: ${describeError(lastErr)}`,
    stopReason: null,
    durationMs: Date.now() - startMs,
    rawText: "",
    usage: { input_tokens: 0, output_tokens: 0, cache_read: 0, cache_create: 0 },
    attempts: TRANSIENT_MAX_ATTEMPTS,
  }
}

function isTransient(err: unknown): boolean {
  if (!err) return false
  const e = err as { status?: number; message?: string }
  if (typeof e.status === "number" && TRANSIENT_STATUS.has(e.status)) return true
  const msg = (e.message ?? "").toLowerCase()
  return TRANSIENT_HINTS.some((h) => msg.includes(h))
}

function describeError(err: unknown): string {
  if (!err) return "unknown"
  const e = err as { status?: number; message?: string }
  return `${e.status ?? "?"} ${(e.message ?? String(err)).slice(0, 180)}`
}

// ─────────────────────────────────────────────────────────────────────
// Recursive unit extraction
// ─────────────────────────────────────────────────────────────────────

export interface LeafResult {
  unitId: string
  ok: boolean
  verdict?: unknown
  reason?: string
  chars: number
  depth: number
  durationMs: number
  stopReason: string | null
  usage: LeafCallResult["usage"]
  attempts: number
}

/**
 * Recursively extract a unit. Returns a FLAT list of leaf results
 * (one per terminal API call). The caller groups them back by top-level
 * unit id.
 */
async function extractUnit(args: {
  unitId: string
  text: string
  depth: number
  spec: DocSpec<unknown>
  agentSpecMarkdown: string
  filename: string
  model: string
  runId?: string
  onLeaf?: (leaf: LeafResult, raw: LeafCallResult) => void
}): Promise<LeafResult[]> {
  const call = await callExtractOnce({
    spec: args.spec,
    agentSpecMarkdown: args.agentSpecMarkdown,
    filename: args.filename,
    unitId: args.unitId,
    text: args.text,
    model: args.model,
  })

  if (call.ok) {
    const leaf: LeafResult = {
      unitId: args.unitId,
      ok: true,
      verdict: call.verdict,
      chars: args.text.length,
      depth: args.depth,
      durationMs: call.durationMs,
      stopReason: call.stopReason,
      usage: call.usage,
      attempts: call.attempts,
    }
    args.onLeaf?.(leaf, call)
    return [leaf]
  }

  // Subdivide if we can.
  const splittable = args.text.length >= MIN_UNIT_CHARS * 2
  if (splittable && (call.reason === "max_tokens" || call.reason === "json_parse")) {
    const offset = chooseSplitOffset(args.text)
    const left = args.text.slice(0, offset).trim()
    const right = args.text.slice(offset).trim()
    if (left.length >= MIN_UNIT_CHARS && right.length >= MIN_UNIT_CHARS) {
      const [l, r] = await Promise.all([
        extractUnit({
          ...args,
          // `~` delimiter (NOT `.`) — see topLevelIdOf comment. Using
          // `.` would collide with page IDs like `p.1` which already
          // contain a dot.
          unitId: `${args.unitId}~0`,
          text: left,
          depth: args.depth + 1,
        }),
        extractUnit({
          ...args,
          unitId: `${args.unitId}~1`,
          text: right,
          depth: args.depth + 1,
        }),
      ])
      return [...l, ...r]
    }
  }

  // Terminal leaf failure (too small to subdivide, or non-recoverable error).
  // ALWAYS surface the underlying call.reason — never replace it with
  // "min_size_floor" or "unknown", because that's what hid the real
  // API error in earlier runs. When the leaf could not be split
  // further, append that as a note so the constraint is still visible.
  const baseReason = call.reason ?? "unknown"
  const reasonText = !splittable && (call.reason === "max_tokens" || call.reason === "json_parse")
    ? `${baseReason} (text below MIN_UNIT_CHARS — could not subdivide further)`
    : baseReason
  const leaf: LeafResult = {
    unitId: args.unitId,
    ok: false,
    reason: reasonText,
    chars: args.text.length,
    depth: args.depth,
    durationMs: call.durationMs,
    stopReason: call.stopReason,
    usage: call.usage,
    attempts: call.attempts,
  }
  // Loud signal so dev-server output shows WHY a leaf died, not just that
  // it did. Without this the only forensics are chunks/<id>-error.txt and
  // coverage.json.
  console.warn(
    `[chunked.leaf-fail] unit=${args.unitId} depth=${args.depth} chars=${args.text.length} ` +
      `reason=${leaf.reason} stop=${leaf.stopReason ?? "-"} duration=${leaf.durationMs}ms ` +
      `attempts=${leaf.attempts}`,
  )
  args.onLeaf?.(leaf, call)
  return [leaf]
}

// ─────────────────────────────────────────────────────────────────────
// Coverage ledger
// ─────────────────────────────────────────────────────────────────────

export interface CoverageLedger {
  /** Top-level units actually attempted (after env cap). */
  units_in: number
  /** Top-level units whose every descendant leaf succeeded. */
  units_ok: number
  /** Total top units the splitter produced BEFORE any cap was applied.
   *  When `dev_cap_applied` is set, this is larger than `units_in`. */
  total_units_in_doc: number
  /** Hard cap from env, if any tripped on this run. */
  dev_cap_applied?: number
  /** Top-level unit ids that were skipped because of the cap. */
  units_skipped?: string[]
  units: Array<{
    id: string
    ok: boolean
    leaves: number
    failed_leaves?: Array<{
      id: string
      reason: string
      chars: number
      depth: number
    }>
  }>
  totals: {
    input_tokens: number
    output_tokens: number
    cache_read: number
    cache_create: number
    duration_ms: number
  }
}

// ─────────────────────────────────────────────────────────────────────
// Deterministic merge of partial verdicts (unchanged contract)
// ─────────────────────────────────────────────────────────────────────

export function mergePartialVerdicts(
  partials: unknown[],
  dedupeKeys: Record<string, string> = {},
): unknown {
  return partials.reduce(
    (acc, partial) => mergeValue(acc, partial, "", dedupeKeys),
    {} as Record<string, unknown>,
  )
}

function mergeValue(
  a: unknown,
  b: unknown,
  path: string,
  dedupeKeys: Record<string, string>,
): unknown {
  if (b === null || b === undefined) return a
  if (a === null || a === undefined) return b

  if (Array.isArray(a) && Array.isArray(b)) {
    const merged = [...a, ...b]
    const lastSegment = path.split(".").pop() ?? ""
    const key = dedupeKeys[lastSegment]
    if (key) {
      const seen = new Set<unknown>()
      return merged.filter((row) => {
        if (row && typeof row === "object" && key in (row as object)) {
          const k = (row as Record<string, unknown>)[key]
          if (seen.has(k)) return false
          seen.add(k)
        }
        return true
      })
    }
    return merged
  }

  if (
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const out: Record<string, unknown> = { ...(a as object) }
    for (const [k, v] of Object.entries(b as object)) {
      out[k] = mergeValue(
        (a as Record<string, unknown>)[k],
        v,
        path ? `${path}.${k}` : k,
        dedupeKeys,
      )
    }
    return out
  }

  return a
}

// ─────────────────────────────────────────────────────────────────────
// Public entrypoint
// ─────────────────────────────────────────────────────────────────────

export async function runChunkedAgent(
  input: ChunkedRunInput,
): Promise<ChunkedRunResult> {
  // Prefer the chunked-specific model env (AI_CHUNKED_MODEL → Haiku
  // by default) so the chunked path's many small calls go to the
  // cheap/fast model, while single-shot runs keep AI_DEFAULT_MODEL.
  // Caller-supplied `input.model` still wins (used by tests).
  const model = input.model ?? CHUNKED_MODEL ?? DEFAULT_MODEL
  // Reset the user-cap breaker at the START of every run — if the user
  // raised the cap between uploads we must not keep short-circuiting
  // every leaf from a previous attempt. The breaker still works
  // WITHIN one run (first user-cap-hit → remaining leaves skip the API).
  chunkedUserCapHit = false
  const splitter = splitStrategyFor(input.spec.id, input.mimeKind)
  const allTopUnits = splitter(input.surface)

  // Apply the env cap (AI_CHUNKED_MAX_UNITS) BEFORE any extraction
  // work. 0 = unlimited. Anything above the cap is recorded as
  // skipped and the result is marked cache-ineligible so a dev-capped
  // run never poisons future full-doc cache hits.
  const cap = input.maxUnits ?? DEFAULT_CHUNKED_MAX_UNITS
  const totalUnitsInDoc = allTopUnits.length
  let topUnits: Unit[]
  let skippedTopUnits: Unit[]
  if (cap > 0 && allTopUnits.length > cap) {
    topUnits = allTopUnits.slice(0, cap)
    skippedTopUnits = allTopUnits.slice(cap)
    console.warn(
      `[chunked.cap] AI_CHUNKED_MAX_UNITS=${cap} — processing first ${topUnits.length} of ${allTopUnits.length} top units; ${skippedTopUnits.length} skipped (this verdict will NOT be cached).`,
    )
  } else {
    topUnits = allTopUnits
    skippedTopUnits = []
  }
  // Up-front fine splitting — sub-units stay grouped by parent id for
  // the ledger.
  const units = preSplitOversize(topUnits)
  const topIds = topUnits.map((u) => u.id)
  const topUnitTextById: Record<string, string> = Object.fromEntries(
    topUnits.map((u) => [u.id, u.text]),
  )

  // Empty surface — nothing to do.
  if (units.length === 0) {
    const ledger: CoverageLedger = {
      units_in: 0,
      units_ok: 0,
      total_units_in_doc: totalUnitsInDoc,
      units: [],
      totals: { input_tokens: 0, output_tokens: 0, cache_read: 0, cache_create: 0, duration_ms: 0 },
    }
    return {
      ok: false,
      chunks: 0,
      ledger,
      totals: { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_create_tokens: 0 },
      error: "no units",
    }
  }

  // Sanitize runId once — the runner passes `${workflowRunId}::attempt-N`;
  // strip the attempt suffix and any non-path-safe chars so chunked
  // forensics land in the workflow's `runs/<workflowRunId>/` dir
  // alongside manifest.json / result.json (not in a parallel
  // `runs/<id>::attempt-1/` ghost dir).
  const runIdDir = safeRunIdDir(input.runId)

  // Persist prompt + layout snapshot for forensics.
  if (runIdDir) {
    try {
      const dir = pathResolve(process.cwd(), "runs", runIdDir)
      await mkdir(dir, { recursive: true })
      await writeFile(
        pathResolve(dir, "prompt.json"),
        JSON.stringify(
          {
            path: "chunked",
            model,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            minUnitChars: MIN_UNIT_CHARS,
            maxUnitCharsPresplit: MAX_UNIT_CHARS_PRESPLIT,
            maxConcurrentUnits: MAX_CONCURRENT_UNITS,
            betas: [...ANTHROPIC_BETAS],
            spec: { id: input.spec.id, label: input.spec.label },
            mimeKind: input.mimeKind,
            filename: input.filename,
            agentSpecMarkdownChars: input.agentSpecMarkdown.length,
            topUnits: topUnits.map((u) => ({
              id: u.id,
              chars: u.text.length,
              head: u.text.slice(0, 200),
            })),
            preSplitUnits: units.map((u) => ({
              id: u.id,
              top: topLevelIdOf(u.id),
              chars: u.text.length,
            })),
            units_in: topUnits.length,
            leaves_planned: units.length,
          },
          null,
          2,
        ),
      )
    } catch (err) {
      console.warn(
        `[chunked.persist] prompt write failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // Emit a "0 / N units" baseline progress event before any API calls
  // so the UI can render the progress bar with a denominator immediately.
  if (input.onProgress) {
    try {
      await input.onProgress({
        iteration: 0,
        maxIterations: topUnits.length,
        lastAction: `chunked split: ${topUnits.length} unit${topUnits.length === 1 ? "" : "s"} → ${units.length} leaf${units.length === 1 ? "" : "es"} (mode=${
          input.spec.id === "specification" ? "csi-or-pages" : input.mimeKind === "xlsx" ? "sheets" : "headings"
        }, concurrency=${MAX_CONCURRENT_UNITS})`,
        tools: ["chunked"],
        stopReason: "streaming",
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreateTokens: 0,
      })
    } catch {
      /* noop */
    }
  }

  const totals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read: 0,
    cache_create: 0,
    duration_ms: 0,
  }
  type CollectedLeaf = { topUnitId: string; leaf: LeafResult; raw: LeafCallResult }
  const allLeaves: CollectedLeaf[] = []
  const leavesByTop: Record<string, LeafResult[]> = Object.fromEntries(
    topIds.map((id) => [id, [] as LeafResult[]]),
  )
  let leavesDone = 0
  const topUnitsCompleted = new Set<string>()
  const topUnitsExpectedLeaves: Record<string, number> = {}
  for (const u of units) {
    const top = topLevelIdOf(u.id)
    topUnitsExpectedLeaves[top] = (topUnitsExpectedLeaves[top] ?? 0) + 1
  }

  async function persistLeaf(c: CollectedLeaf): Promise<void> {
    if (!runIdDir) return
    try {
      const dir = pathResolve(process.cwd(), "runs", runIdDir, "chunks")
      await mkdir(dir, { recursive: true })
      const { leaf, raw, topUnitId } = c
      const safe = leaf.unitId.replace(/[^A-Za-z0-9._-]+/g, "_")
      if (leaf.ok) {
        await writeFile(
          pathResolve(dir, `${safe}.json`),
          JSON.stringify(
            {
              unitId: leaf.unitId,
              topUnitId,
              ok: true,
              depth: leaf.depth,
              chars: leaf.chars,
              duration_ms: leaf.durationMs,
              stop_reason: leaf.stopReason,
              attempts: leaf.attempts,
              usage: leaf.usage,
              verdict: leaf.verdict,
              raw_text_preview: raw.rawText.slice(0, 1200),
            },
            null,
            2,
          ),
        )
      } else {
        await writeFile(
          pathResolve(dir, `${safe}-error.txt`),
          [
            `unit: ${leaf.unitId}`,
            `top_unit: ${topUnitId}`,
            `depth: ${leaf.depth}`,
            `chars: ${leaf.chars}`,
            `attempts: ${leaf.attempts}`,
            `stop_reason: ${leaf.stopReason ?? "(none)"}`,
            `reason: ${leaf.reason ?? "(none)"}`,
            ``,
            `--- raw response preview (first 1200 chars) ---`,
            raw.rawText.slice(0, 1200),
            ``,
            `--- unit head (first 600 chars) ---`,
            (topUnitTextById[topUnitId] ?? "").slice(0, 600),
          ].join("\n"),
        )
      }
    } catch (writeErr) {
      console.warn(
        `[chunked.persist] leaf log failed: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`,
      )
    }
  }

  async function emitTopUnitDone(topUnitId: string): Promise<void> {
    if (topUnitsCompleted.has(topUnitId)) return
    topUnitsCompleted.add(topUnitId)
    if (!input.onProgress) return
    const leaves = leavesByTop[topUnitId] ?? []
    const ok = leaves.length > 0 && leaves.every((l) => l.ok)
    try {
      await input.onProgress({
        iteration: topUnitsCompleted.size,
        maxIterations: topUnits.length,
        lastAction: ok
          ? `unit ${topUnitId}: ok (${leaves.length} leaf${leaves.length === 1 ? "" : "es"})`
          : `unit ${topUnitId}: FAILED (${leaves.filter((l) => l.ok).length}/${leaves.length} leaves ok)`,
        tools: ["chunked"],
        stopReason: "streaming",
        inputTokens: leaves.reduce((s, l) => s + l.usage.input_tokens, 0),
        outputTokens: leaves.reduce((s, l) => s + l.usage.output_tokens, 0),
        cacheReadTokens: leaves.reduce((s, l) => s + l.usage.cache_read, 0),
        cacheCreateTokens: leaves.reduce((s, l) => s + l.usage.cache_create, 0),
      })
    } catch {
      /* noop */
    }
  }

  async function runOneUnit(u: Unit): Promise<void> {
    const topUnitId = topLevelIdOf(u.id)
    const collected: CollectedLeaf[] = []
    const leaves = await extractUnit({
      unitId: u.id,
      text: u.text,
      depth: 0,
      spec: input.spec,
      agentSpecMarkdown: input.agentSpecMarkdown,
      filename: input.filename,
      model,
      runId: input.runId,
      onLeaf: (leaf, raw) => {
        collected.push({ topUnitId, leaf, raw })
      },
    })
    leavesByTop[topUnitId] = [...(leavesByTop[topUnitId] ?? []), ...leaves]
    for (const l of leaves) {
      totals.input_tokens += l.usage.input_tokens
      totals.output_tokens += l.usage.output_tokens
      totals.cache_read += l.usage.cache_read
      totals.cache_create += l.usage.cache_create
      totals.duration_ms += l.durationMs
    }
    allLeaves.push(...collected)
    for (const c of collected) await persistLeaf(c)
    leavesDone += leaves.length
    // Emit a top-unit-done event when every planned leaf for that top
    // unit has reported back.
    const got = leavesByTop[topUnitId]?.length ?? 0
    const expected = topUnitsExpectedLeaves[topUnitId] ?? 1
    if (got >= expected) await emitTopUnitDone(topUnitId)
  }

  // Bounded-concurrency runner over pre-split units. Recursive halving
  // inside extractUnit can still spawn additional in-flight calls, so
  // peak concurrency is ~MAX_CONCURRENT_UNITS × depth.
  let cursor = 0
  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++
      if (i >= units.length) return
      await runOneUnit(units[i]!)
    }
  }

  // Heartbeat — large units can take 10+ minutes apiece, which used to
  // exceed the 20-min worker reclaim window and cause the still-running
  // agent to be killed and restarted from scratch. Tick every 3 min so
  // the worker bumps extraction_job.updated_at and the reclaimer leaves
  // this job alone. Carries `topUnitsCompleted.size` so the UI's "iter
  // X/N" counter stays accurate.
  const HEARTBEAT_MS = 3 * 60_000
  const heartbeat = input.onProgress
    ? setInterval(() => {
        const inFlight = Math.max(0, cursor - topUnitsCompleted.size)
        void Promise.resolve(
          input.onProgress!({
            iteration: topUnitsCompleted.size,
            maxIterations: topUnits.length,
            lastAction: `chunked: ${topUnitsCompleted.size}/${topUnits.length} units done, ~${inFlight} in flight`,
            tools: ["chunked"],
            stopReason: "streaming",
            inputTokens: totals.input_tokens,
            outputTokens: totals.output_tokens,
            cacheReadTokens: totals.cache_read,
            cacheCreateTokens: totals.cache_create,
          }),
        ).catch(() => {
          /* noop */
        })
      }, HEARTBEAT_MS)
    : null

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(MAX_CONCURRENT_UNITS, units.length) },
        () => worker(),
      ),
    )
  } finally {
    if (heartbeat) clearInterval(heartbeat)
  }

  // Defence: emit a final event for any top unit whose leaves all
  // returned but whose denominator was undercounted.
  for (const top of topIds) {
    if (!topUnitsCompleted.has(top)) await emitTopUnitDone(top)
  }

  // Reconstruct top-level OK status from grouped leaves.
  const unitOk: Record<string, boolean> = {}
  const unitLeaves = leavesByTop
  for (const top of topIds) {
    const leaves = leavesByTop[top] ?? []
    unitOk[top] = leaves.length > 0 && leaves.every((l) => l.ok)
  }
  void leavesDone

  // Build the ledger — one row per TOP-LEVEL unit (not per leaf).
  const ledger: CoverageLedger = {
    units_in: topUnits.length,
    units_ok: topIds.filter((id) => unitOk[id]).length,
    total_units_in_doc: totalUnitsInDoc,
    dev_cap_applied: skippedTopUnits.length > 0 ? cap : undefined,
    units_skipped:
      skippedTopUnits.length > 0 ? skippedTopUnits.map((u) => u.id) : undefined,
    units: topUnits.map((u) => {
      const leaves = unitLeaves[u.id] ?? []
      const failedLeaves = leaves.filter((l) => !l.ok)
      return {
        id: u.id,
        ok: unitOk[u.id] ?? false,
        leaves: leaves.length,
        failed_leaves: failedLeaves.length > 0
          ? failedLeaves.map((l) => ({
              id: l.unitId,
              reason: l.reason ?? "unknown",
              chars: l.chars,
              depth: l.depth,
            }))
          : undefined,
      }
    }),
    totals,
  }

  // Dump the ledger sidecar (always — even when 0/N units succeeded
  // — so the user can see the failure breakdown without grepping logs).
  if (runIdDir) {
    try {
      const dir = pathResolve(process.cwd(), "runs", runIdDir)
      await mkdir(dir, { recursive: true })
      await writeFile(
        pathResolve(dir, "coverage.json"),
        JSON.stringify(ledger, null, 2),
      )
    } catch (err) {
      console.warn(
        `[chunked.persist] coverage write failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // Merge OK leaf verdicts only. Skipped/failed leaves contribute
  // nothing. Order is splitter order → top-level units in document
  // order → leaves in subdivision order.
  const partials = allLeaves
    .filter((entry) => entry.leaf.ok)
    .map((entry) => entry.leaf.verdict)

  if (partials.length === 0) {
    return {
      ok: false,
      chunks: topUnits.length,
      ledger,
      totals: {
        input_tokens: totals.input_tokens,
        output_tokens: totals.output_tokens,
        cache_read_tokens: totals.cache_read,
        cache_create_tokens: totals.cache_create,
      },
      error: `Partial extraction — all ${topUnits.length} units failed`,
    }
  }

  // Per-spec dedupe keys (same map as before).
  const dedupeKeys: Record<string, string> = {
    responsibilityMatrixRows: "ref",
    timesForCompletion: "label",
    commencementSubmissions: "id",
    sectionsOfTheWorks: "milestone",
    phases: "phaseId",
    technicalDeliverables: "scheduleId",
    submissionSchedules: "id",
    bills: "sheet",
    sections: "sectionCode",
    signatures: "name",
    acknowledgedAddenda: "reference",
  }

  const merged = mergePartialVerdicts(partials, dedupeKeys) as Record<string, unknown>

  // Embed the ledger structurally — workflow + UI may consume it.
  merged._coverage_ledger = ledger

  // Dev-cap visibility: when AI_CHUNKED_MAX_UNITS truncated this run,
  // expose it loudly on the verdict so the UI shows "first N pages only"
  // AND so the cache-eligibility predicate in extract-document.ts
  // refuses to cache this partial result.
  if (skippedTopUnits.length > 0) {
    const existing = Array.isArray(merged.coverage_warnings)
      ? merged.coverage_warnings
      : []
    merged.coverage_warnings = [
      ...existing,
      {
        field: "_dev_cap",
        severity: "INFO",
        message: `AI_CHUNKED_MAX_UNITS=${cap} — only the first ${topUnits.length} of ${totalUnitsInDoc} units were processed; ${skippedTopUnits.length} skipped. Set the env var higher (or to 0 for unlimited) to extract the full document.`,
      },
    ]
  }

  // Surface failed TOP-LEVEL units as `_chunk_<id>` coverage warnings
  // so the existing `extractDroppedChunkWarnings` gate in
  // extract-document.ts triggers terminal failure (no requeue, no
  // silent success even on stub schemas).
  const failedUnits = ledger.units.filter((u) => !u.ok)
  if (failedUnits.length > 0) {
    const existing = Array.isArray(merged.coverage_warnings)
      ? merged.coverage_warnings
      : []
    merged.coverage_warnings = [
      ...existing,
      ...failedUnits.map((u) => ({
        field: `_chunk_${u.id}`,
        severity: "WARN",
        message: `Unit ${u.id} failed: ${u.failed_leaves?.[0]?.reason ?? "unknown"} (${
          (u.leaves ?? 0) - (u.failed_leaves?.length ?? 0)
        }/${u.leaves} leaves ok)`,
      })),
    ]
  }

  const allOk = ledger.units_ok === ledger.units_in
  return {
    ok: allOk,
    verdict: merged,
    chunks: topUnits.length,
    ledger,
    totals: {
      input_tokens: totals.input_tokens,
      output_tokens: totals.output_tokens,
      cache_read_tokens: totals.cache_read,
      cache_create_tokens: totals.cache_create,
    },
    // "Partial extraction" prefix is the terminal-failure signal the
    // worker.ts predicate matches (no requeue).
    error: allOk
      ? undefined
      : `Partial extraction — ${ledger.units_ok}/${ledger.units_in} units ok, failed: ${failedUnits
          .map((u) => u.id)
          .join(", ")}`,
  }
}

/**
 * Back-compat re-export — `splitSurfaceByHeadings` is referenced by
 * tests / older callers. Keep the old greedy-pack semantics available
 * but route the production path through `splitStrategyFor`.
 */
export function splitSurfaceByHeadings(surface: string): string[] {
  return splitByMarkdownHeadings(surface).map((u) => u.text)
}
