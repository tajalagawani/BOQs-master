import type Anthropic from "@anthropic-ai/sdk"
import { readFile as fsReadFile } from "node:fs/promises"

import {
  ANTHROPIC_BETAS,
  DEFAULT_EFFORT,
  DEFAULT_MAX_ITERATIONS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MODEL,
  type ThinkingEffort,
  anthropic,
  assertAiAvailable,
} from "@/modules/ai-extraction/client"
import { preExtractDocument } from "@/modules/ai-extraction/pre"
import type { DocSpec } from "@/modules/ai-extraction/specs/types"

import { Sandbox } from "./sandbox"
import { buildTools, type Executor } from "./tools"

// No transient retries — one shot per leaf, surface the error. Restore
// [5, 15, 30, 60, 120, 180] to bring back exponential backoff on
// overloaded/5xx/network blips.
const BACKOFF_S: number[] = []
const TRANSIENT_HINTS = [
  "overloaded",
  "stream terminated",
  "econnreset",
  "etimedout",
  "und_err_socket",
  "und_err_connect",
  "eai_again",
  "fetch failed",
  "socket hang up",
] as const
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504, 529])

export interface AgentProgressEvent {
  iteration: number
  maxIterations: number
  /** Short human-readable line describing what just happened. */
  lastAction: string
  /** Tool names that ran on this turn ([] when the model only emitted text). */
  tools: string[]
  /** Anthropic stop reason for the turn. */
  stopReason: string | null
  /** Tokens consumed on THIS turn (not cumulative). */
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreateTokens: number
}

export interface AgentRunOptions {
  model?: string
  effort?: ThinkingEffort
  maxTokens?: number
  maxIterations?: number
  /** If set, prepended to the user prompt as a retry note from a prior failed attempt. */
  feedback?: string | null
  /** Fired after every iteration with a short progress update. */
  onProgress?: (event: AgentProgressEvent) => void | Promise<void>
}

export interface AgentRunInput {
  /** Per-run id (also names the sandbox tmpdir). */
  runId: string
  /** The spec for the doc category being extracted. */
  spec: DocSpec<unknown>
  /** The source file. */
  source: {
    buffer: Buffer
    filename: string
    mimeType?: string | null
  }
  /** The markdown spec text the agent will read. */
  agentSpecMarkdown: string
  options?: AgentRunOptions
}

export interface IterationUsage {
  iteration: number
  at: string
  duration_ms?: number
  input_tokens: number
  output_tokens: number
  cache_read: number
  cache_create: number
  stop_reason: string | null
  tool_uses: string[]
  tool_inputs?: Array<{ name: string; input: unknown }>
  tool_execs?: Array<{
    name: string
    input: unknown
    duration_ms: number
    ok: boolean
    result_preview: string
  }>
  thinking_chars?: number
  text_chars?: number
  text_preview?: string
  thinking_preview?: string
}

export interface AgentRunTotals {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_create_tokens: number
}

export interface AgentRunMeta {
  model_alias: string
  effort: ThinkingEffort
  thinking: "adaptive"
  temperature: 1
  betas: readonly string[]
}

export interface AgentRunResult {
  ok: boolean
  iterations: number
  verdict?: unknown
  error?: string
  finalText: string
  totals: AgentRunTotals
  iterationLog: IterationUsage[]
  runMeta: AgentRunMeta
  /** Present when the chunked path ran — surfaces the coverage ledger
   *  (units_in / units_ok / per-unit pass-fail with reasons) so the
   *  workflow can embed it in result.json. */
  ledger?: unknown
}

/**
 * One adaptive agent loop. Direct `@anthropic-ai/sdk` streaming with
 * adaptive thinking at max effort, prompt caching on the system block,
 * 128k output beta, manual tool-loop, and `max_tokens` continuation.
 *
 * Mirrors the PUB-SEW adjudicator pattern — see
 * docs/AI_AGENT_MIGRATION_PLAN.md.
 */
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  assertAiAvailable()

  const model = input.options?.model ?? DEFAULT_MODEL
  const effort = input.options?.effort ?? DEFAULT_EFFORT
  const maxTokens = input.options?.maxTokens ?? DEFAULT_MAX_TOKENS
  const maxIterations = input.options?.maxIterations ?? DEFAULT_MAX_ITERATIONS

  const runMeta: AgentRunMeta = {
    model_alias: model,
    effort,
    thinking: "adaptive",
    temperature: 1,
    betas: ANTHROPIC_BETAS,
  }

  const totals: AgentRunTotals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_create_tokens: 0,
  }
  const iterationLog: IterationUsage[] = []

  const sandbox = await Sandbox.create(input.runId)

  try {
    // 1. Pre-extract: manifest.json + surface.md + candidates.json + source
    const pre = await preExtractDocument({
      buffer: input.source.buffer,
      filename: input.source.filename,
      mimeType: input.source.mimeType ?? null,
    })

    await sandbox.writeText("manifest.json", JSON.stringify(pre.manifest, null, 2))
    await sandbox.writeText("surface.md", pre.surface)
    await sandbox.writeText("candidates.json", JSON.stringify(pre.candidates, null, 2))
    await sandbox.writeBytes(`source/${input.source.filename}`, input.source.buffer)

    // ── V2-7 router ──────────────────────────────────────────────────
    // Surface ≤ 700_000 chars (~175k tokens) → single-shot inline below.
    // Surface > 700_000 chars                 → chunked path (one Sonnet
    //                                            call per ≤150k-token
    //                                            chunk, deterministic merge)
    if (pre.surface.length > 700_000) {
      const { runChunkedAgent } = await import("./chunked")
      const chunked = await runChunkedAgent({
        spec: input.spec,
        agentSpecMarkdown: input.agentSpecMarkdown,
        surface: pre.surface,
        filename: input.source.filename,
        mimeKind: pre.manifest.kind as
          | "pdf"
          | "xlsx"
          | "docx"
          | "image"
          | "unknown",
        runId: input.runId,
        model,
        // maxUnits left undefined here — falls back to
        // DEFAULT_CHUNKED_MAX_UNITS from env inside runChunkedAgent.
        // Set AI_CHUNKED_MAX_UNITS in .env.local to cap (e.g. 49 for
        // dev); 0 = unlimited.
        onProgress: input.options?.onProgress,
      })
      if (input.options?.onProgress) {
        await input.options.onProgress({
          iteration: 1,
          maxIterations: 1,
          lastAction: `chunked: merged ${chunked.chunks} chunk verdicts`,
          tools: ["chunked"],
          stopReason: chunked.ok ? "end_turn" : "error",
          inputTokens: chunked.totals.input_tokens,
          outputTokens: chunked.totals.output_tokens,
          cacheReadTokens: chunked.totals.cache_read_tokens,
          cacheCreateTokens: chunked.totals.cache_create_tokens,
        })
      }
      return {
        ok: chunked.ok,
        iterations: chunked.chunks,
        verdict: chunked.verdict,
        finalText: "",
        totals: chunked.totals,
        iterationLog: [
          {
            iteration: 1,
            at: new Date().toISOString(),
            duration_ms: 0,
            input_tokens: chunked.totals.input_tokens,
            output_tokens: chunked.totals.output_tokens,
            cache_read: chunked.totals.cache_read_tokens,
            cache_create: chunked.totals.cache_create_tokens,
            stop_reason: "chunked_merge",
            tool_uses: ["chunked"],
          },
        ],
        runMeta,
        ledger: chunked.ledger,
        error: chunked.error,
      }
    }

    // 2. Build the agent runtime (single-shot path)
    let verdict: unknown = null
    const { apiTools, executors } = buildTools(sandbox, {
      setVerdict: (v) => {
        verdict = v
      },
    })

    const systemBlocks = buildSystemBlocks(input.spec, input.agentSpecMarkdown, maxIterations)
    // Inline the full reading surface when it fits — single-shot path.
    // 700_000 chars ≈ 175k tokens, leaves ~25k headroom for the system
    // prompt + spec markdown + thinking budget in Sonnet's 200k window.
    const inlineSurface = pre.surface
    const userText = buildUserPrompt(input, maxIterations, inlineSurface)

    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
      { role: "user", content: userText },
    ]

    let finalText = ""
    let continuingAfterMaxTokens = false
    let iteration = 0

    // Persist a per-run log directory for full per-iteration inspection.
    const { mkdir: fsMkdir, writeFile: fsWriteFile } = await import("node:fs/promises")
    const { resolve: pathResolve } = await import("node:path")
    const logDir = pathResolve(process.cwd(), "runs", input.runId, "log")
    await fsMkdir(logDir, { recursive: true }).catch(() => {})

    // Persist the exact prompt that will be sent on iteration 1 so the
    // user can see — verbatim — what the agent was shown. Includes
    // system blocks (with cache markers), the first user message, the
    // tool surface, and run-time knobs.
    await fsWriteFile(
      pathResolve(process.cwd(), "runs", input.runId, "prompt.json"),
      JSON.stringify(
        {
          path: "single-shot",
          model,
          effort,
          maxTokens,
          maxIterations,
          betas: ANTHROPIC_BETAS,
          systemBlocks,
          messages,
          tools: apiTools,
          thinkingConfig: undefined, // injected per request inside openStreamWithRetry
        },
        null,
        2,
      ),
    ).catch((e) => console.warn(`[agent ${input.runId}] prompt write failed`, e))

    while (iteration < maxIterations) {
      iteration += 1
      const iterStartMs = Date.now()

      // Snapshot the iteration index for the live handler — the handler
      // closes over the current iteration so progress writes carry the
      // right number even after the loop variable advances.
      const currentIteration = iteration
      const liveHandler = (block: Anthropic.Beta.Messages.BetaContentBlock) => {
        if (block.type === "tool_use") {
          const action = describeLiveBlock(block)
          // Best-effort, non-blocking — fire-and-forget so streaming
          // never blocks on a slow DB write.
          if (input.options?.onProgress) {
            void Promise.resolve(
              input.options.onProgress({
                iteration: currentIteration,
                maxIterations,
                lastAction: action,
                tools: [block.name],
                stopReason: "streaming",
                inputTokens: 0,
                outputTokens: 0,
                cacheReadTokens: 0,
                cacheCreateTokens: 0,
              }),
            ).catch(() => {
              /* noop */
            })
          }
        }
      }

      const response = await openStreamWithRetry({
        model,
        maxTokens,
        effort,
        systemBlocks,
        messages,
        apiTools,
        onContentBlock: liveHandler,
      })

      const stopReason = response.stop_reason ?? null
      const usage = response.usage as
        | (Anthropic.Beta.Messages.BetaUsage & {
            cache_creation_input_tokens?: number | null
            cache_read_input_tokens?: number | null
          })
        | undefined
      const inputTokens = usage?.input_tokens ?? 0
      const outputTokens = usage?.output_tokens ?? 0
      const cacheRead = usage?.cache_read_input_tokens ?? 0
      const cacheCreate = usage?.cache_creation_input_tokens ?? 0
      totals.input_tokens += inputTokens
      totals.output_tokens += outputTokens
      totals.cache_read_tokens += cacheRead
      totals.cache_create_tokens += cacheCreate

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use",
      )
      const textBlocks = response.content.filter(
        (b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text",
      )
      const thinkingBlocks = response.content.filter(
        (b) => (b as { type?: string }).type === "thinking",
      ) as Array<{ type: "thinking"; thinking?: string }>
      const textThisTurn = textBlocks.map((b) => b.text).join("")
      const thinkingThisTurn = thinkingBlocks
        .map((b) => (b as { thinking?: string }).thinking ?? "")
        .join("")

      if (continuingAfterMaxTokens) {
        finalText += textThisTurn
        continuingAfterMaxTokens = false
      } else {
        finalText = textThisTurn
      }

      const apiDurationMs = Date.now() - iterStartMs

      iterationLog.push({
        iteration,
        at: new Date().toISOString(),
        duration_ms: apiDurationMs,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_read: cacheRead,
        cache_create: cacheCreate,
        stop_reason: stopReason,
        tool_uses: toolUseBlocks.map((t) => t.name),
        tool_inputs: toolUseBlocks.map((t) => ({
          name: t.name,
          input: truncateForLog(t.input, 2000),
        })),
        thinking_chars: thinkingThisTurn.length,
        text_chars: textThisTurn.length,
        text_preview: textThisTurn.slice(0, 400),
        thinking_preview: thinkingThisTurn.slice(0, 600),
      })

      // Dump the full per-iteration snapshot to disk for forensic review.
      // Includes the full raw response content (tool inputs, thinking, text).
      await fsWriteFile(
        pathResolve(logDir, `iter-${String(iteration).padStart(3, "0")}.json`),
        JSON.stringify(
          {
            iteration,
            at: new Date().toISOString(),
            api_duration_ms: apiDurationMs,
            usage: {
              input_tokens: inputTokens,
              output_tokens: outputTokens,
              cache_read: cacheRead,
              cache_create: cacheCreate,
            },
            stop_reason: stopReason,
            response_content: response.content,
          },
          null,
          2,
        ),
      ).catch((e) => console.warn(`[agent ${input.runId}] log write failed`, e))

      // Build a one-line progress description and emit it.
      const tools = toolUseBlocks.map((t) => t.name)
      const lastAction = describeIteration({
        iteration,
        tools,
        textPreview: textThisTurn,
        stopReason,
        toolUseBlocks,
      })
      console.log(
        `[agent ${input.runId}] iter ${iteration}/${maxIterations} · ${lastAction} · ` +
          `tokens=${inputTokens}→${outputTokens} cache=r${cacheRead}/c${cacheCreate} stop=${stopReason ?? "?"}`,
      )
      if (input.options?.onProgress) {
        try {
          await input.options.onProgress({
            iteration,
            maxIterations,
            lastAction,
            tools,
            stopReason,
            inputTokens,
            outputTokens,
            cacheReadTokens: cacheRead,
            cacheCreateTokens: cacheCreate,
          })
        } catch (err) {
          console.warn(`[agent ${input.runId}] onProgress threw`, err)
        }
      }

      // 2a. Handle max_tokens mid-turn truncation: push the partial
      //     assistant turn + a nudge to resume.
      if (stopReason === "max_tokens" && toolUseBlocks.length === 0) {
        messages.push({ role: "assistant", content: response.content })
        messages.push({
          role: "user",
          content:
            "Your previous response was truncated by the output token limit. " +
            "Resume EXACTLY where you left off — start with the next character, " +
            "do not repeat what you already emitted, do not summarise, do not restart.",
        })
        continuingAfterMaxTokens = true
        continue
      }

      // 2b. If the model used tools, run them and feed the results back.
      if (toolUseBlocks.length > 0) {
        const toolResults: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = []
        const toolExecLog: Array<{
          name: string
          input: unknown
          duration_ms: number
          ok: boolean
          result_preview: string
        }> = []
        let verdictSubmitted = false

        for (const block of toolUseBlocks) {
          const execStartMs = Date.now()
          const executor: Executor | undefined = executors[block.name]
          if (!executor) {
            const payload = {
              ok: false,
              error: `Unknown tool: ${block.name}`,
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: JSON.stringify(payload),
            })
            toolExecLog.push({
              name: block.name,
              input: truncateForLog(block.input, 2000),
              duration_ms: Date.now() - execStartMs,
              ok: false,
              result_preview: JSON.stringify(payload).slice(0, 600),
            })
            continue
          }

          try {
            const parsed = executor.parse(block.input)
            const result = await executor.run(parsed)
            const serialized = JSON.stringify(result)
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: serialized,
            })
            toolExecLog.push({
              name: block.name,
              input: truncateForLog(block.input, 2000),
              duration_ms: Date.now() - execStartMs,
              ok: true,
              result_preview: serialized.slice(0, 600),
            })
            if (block.name === "submit_verdict") {
              verdictSubmitted = true
            }
          } catch (err) {
            const payload = {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: JSON.stringify(payload),
            })
            toolExecLog.push({
              name: block.name,
              input: truncateForLog(block.input, 2000),
              duration_ms: Date.now() - execStartMs,
              ok: false,
              result_preview: JSON.stringify(payload).slice(0, 600),
            })
          }
        }

        // Annotate the iteration log with tool execution detail.
        const last = iterationLog[iterationLog.length - 1]
        if (last) last.tool_execs = toolExecLog
        // Persist tool results for this iteration to disk.
        await fsWriteFile(
          pathResolve(logDir, `iter-${String(iteration).padStart(3, "0")}-results.json`),
          JSON.stringify({ iteration, tool_execs: toolExecLog }, null, 2),
        ).catch(() => {})

        messages.push({ role: "assistant", content: response.content })
        messages.push({ role: "user", content: toolResults })

        if (verdictSubmitted && verdict !== null) {
          return {
            ok: true,
            iterations: iteration,
            verdict,
            finalText,
            totals,
            iterationLog,
            runMeta,
          }
        }
        continue
      }

      // 2c. No tools and stop_reason !== max_tokens — the model is done.
      messages.push({ role: "assistant", content: response.content })

      if (verdict !== null) {
        return {
          ok: true,
          iterations: iteration,
          verdict,
          finalText,
          totals,
          iterationLog,
          runMeta,
        }
      }

      return {
        ok: false,
        iterations: iteration,
        error:
          stopReason === "end_turn"
            ? "Model ended the turn without calling submit_verdict"
            : `Loop ended with stop_reason=${stopReason ?? "null"}`,
        finalText,
        totals,
        iterationLog,
        runMeta,
      }
    }

    return {
      ok: false,
      iterations: iteration,
      error: `Reached max iterations (${maxIterations}) without a verdict`,
      finalText,
      totals,
      iterationLog,
      runMeta,
    }
  } catch (err) {
    return {
      ok: false,
      iterations: iterationLog.length,
      error: err instanceof Error ? err.message : String(err),
      finalText: "",
      totals,
      iterationLog,
      runMeta,
    }
  }
  // Note: the sandbox dir is intentionally NOT destroyed. Its files
  // (manifest.json, surface.md, candidates.json, source/, scripts/,
  // and any helper files the agent wrote) live at
  // `<repoRoot>/runs/<runId>/sandbox/` for inspection. A separate
  // cleanup job can prune old runs if needed.
}

// ─────────────────────────────────────────────────────────────────────
// Streaming + retry
// ─────────────────────────────────────────────────────────────────────

interface StreamArgs {
  model: string
  maxTokens: number
  effort: ThinkingEffort
  systemBlocks: Anthropic.Beta.Messages.BetaTextBlockParam[]
  messages: Anthropic.Beta.Messages.BetaMessageParam[]
  apiTools: Anthropic.Beta.Messages.BetaTool[]
  /** Fired as each content block (text / tool_use / thinking) streams in. */
  onContentBlock?: (block: Anthropic.Beta.Messages.BetaContentBlock) => void
}

async function openStreamWithRetry(
  args: StreamArgs,
): Promise<Anthropic.Beta.Messages.BetaMessage> {
  let lastError: unknown = null

  // Opus 4.7 supports `thinking: { type: "adaptive" }` + `output_config.effort`.
  // Sonnet / Haiku use the older budget-based extended thinking. Branching on
  // model name so we can ship the same runner across all three.
  const isOpus = args.model.startsWith("claude-opus")
  const effortBudget: Record<string, number> = {
    low: 1024,
    medium: 4000,
    high: 12000,
    xhigh: 24000,
    max: 32000,
  }
  const thinkingConfig = isOpus
    ? ({ type: "adaptive" as const })
    : ({ type: "enabled" as const, budget_tokens: effortBudget[args.effort] ?? 4000 })
  const outputConfig = isOpus ? { effort: args.effort } : undefined

  for (let attempt = 0; attempt <= BACKOFF_S.length; attempt += 1) {
    try {
      const stream = anthropic.beta.messages.stream({
        model: args.model,
        max_tokens: args.maxTokens,
        temperature: 1,
        thinking: thinkingConfig,
        ...(outputConfig ? { output_config: outputConfig } : {}),
        system: args.systemBlocks,
        messages: args.messages,
        tools: args.apiTools,
        betas: [...ANTHROPIC_BETAS],
      })

      // Live block events — fire as each text/tool_use/thinking block
      // streams in, BEFORE the turn is fully assembled. The UI polls
      // extraction_job.progress and renders the latest action without
      // waiting for finalMessage() to resolve (which can take 20s+ on
      // a heavy turn).
      if (args.onContentBlock) {
        stream.on("contentBlock", args.onContentBlock)
      }

      return await stream.finalMessage()
    } catch (err) {
      lastError = err
      if (!isTransient(err) || attempt === BACKOFF_S.length) {
        throw err
      }
      const waitS = BACKOFF_S[attempt]!
      console.warn(
        `[agent] transient error (attempt ${attempt + 1}/${BACKOFF_S.length + 1}); sleeping ${waitS}s — ${describeError(err)}`,
      )
      await new Promise((r) => setTimeout(r, waitS * 1000))
    }
  }
  throw lastError
}

function isTransient(err: unknown): boolean {
  if (!err) return false
  const e = err as { status?: number; message?: string; cause?: unknown }
  if (typeof e.status === "number" && TRANSIENT_STATUS.has(e.status)) return true
  const msg = (e.message ?? "").toLowerCase()
  if (TRANSIENT_HINTS.some((h) => msg.includes(h))) return true
  const causeMsg = ((e.cause as { message?: string } | undefined)?.message ?? "").toLowerCase()
  if (TRANSIENT_HINTS.some((h) => causeMsg.includes(h))) return true
  return false
}

function describeError(err: unknown): string {
  const e = err as { status?: number; message?: string }
  return `${e.status ?? "?"} ${e.message ?? String(err)}`.slice(0, 200)
}

// ─────────────────────────────────────────────────────────────────────
// Prompt construction
// ─────────────────────────────────────────────────────────────────────

function buildSystemBlocks(
  spec: DocSpec<unknown>,
  agentSpecMarkdown: string,
  maxIterations: number,
): Anthropic.Beta.Messages.BetaTextBlockParam[] {
  const base = `You are the ProcureX document extraction adjudicator for the category "${spec.id}" (${spec.label}).

The full document surface is inlined in the user message — read it directly from context.

Pipeline:

1. Read the surface in the user message.
2. Map every readable field to the schema in the category spec below.
3. For fields you cannot find in the surface, set them to null (do NOT invent).
4. Call submit_verdict with the final JSON. Hard cap: ${maxIterations} iterations (but you should only need 1).

The only tool available is:
  - submit_verdict(verdict)  terminate the loop with the structured value

Be specific. Match the schema exactly. Don't wrap the verdict in markdown fences.`

  const specSection = `--- CATEGORY SPEC ---

${agentSpecMarkdown}

--- END SPEC ---`

  // Two blocks: base prompt + spec markdown. The spec markdown is the
  // larger / more stable chunk, so we cache after it. Anthropic caches
  // up to and including the block tagged with cache_control.
  return [
    { type: "text", text: base },
    {
      type: "text",
      text: specSection,
      cache_control: { type: "ephemeral" },
    },
  ]
}

function buildUserPrompt(
  input: AgentRunInput,
  _maxIterations: number,
  inlineSurface: string,
): string {
  const feedback = input.options?.feedback?.trim()
  const feedbackBlock = feedback
    ? `\n\nNOTE FROM PREVIOUS ATTEMPT (validation failed — address these before resubmitting):\n${feedback}\n`
    : ""

  return (
    `Document category: "${input.spec.id}" (${input.spec.label})\n` +
    `File: ${input.source.filename}\n` +
    `Mime: ${input.source.mimeType ?? "unknown"}\n\n` +
    `The entire document surface is below. Read it, then call submit_verdict ONCE with the JSON matching the schema in the system prompt. instances_examined may be empty.\n\n` +
    `--- BEGIN SURFACE ---\n${inlineSurface}\n--- END SURFACE ---` +
    feedbackBlock
  )
}

function describeLiveBlock(block: Anthropic.Beta.Messages.BetaToolUseBlock): string {
  const input = (block.input ?? {}) as Record<string, unknown>
  // Prefer the model-supplied English description (required on bash /
  // python / write_file). Falls back to the raw command if missing.
  const desc =
    typeof input.description === "string" && input.description.trim().length > 0
      ? input.description.trim()
      : null
  if (block.name === "bash") {
    if (desc) return desc
    const cmd = String(input.command ?? "").replace(/\s+/g, " ").slice(0, 70)
    return `bash: ${cmd}`
  }
  if (block.name === "python") {
    if (desc) return desc
    const code = String(input.code ?? "")
      .split("\n")[0]!
      .slice(0, 70)
    return `python: ${code}`
  }
  if (block.name === "read_file") return `Read ${String(input.path ?? "")}`
  if (block.name === "write_file") {
    if (desc) return desc
    return `Write ${String(input.path ?? "")}`
  }
  if (block.name === "submit_verdict") return "Submitting final verdict"
  return block.name
}

/** Trim deep tool inputs / results so the iteration log stays bounded. */
function truncateForLog(value: unknown, maxLen: number): unknown {
  if (typeof value === "string") {
    return value.length > maxLen ? value.slice(0, maxLen) + `…[+${value.length - maxLen}c]` : value
  }
  if (Array.isArray(value)) return value.map((v) => truncateForLog(v, maxLen))
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = truncateForLog(v, maxLen)
    }
    return out
  }
  return value
}

function describeIteration(args: {
  iteration: number
  tools: string[]
  textPreview: string
  stopReason: string | null
  toolUseBlocks: Anthropic.Beta.Messages.BetaToolUseBlock[]
}): string {
  if (args.tools.length === 0) {
    if (args.stopReason === "max_tokens") return "Output truncated — resuming"
    const text = args.textPreview.replace(/\s+/g, " ").trim().slice(0, 80)
    return text ? `Thinking: ${text}` : "Thinking…"
  }
  const last = args.toolUseBlocks[args.toolUseBlocks.length - 1]
  if (!last) return args.tools.join(", ")
  // Delegate to the same English-aware describer used in the live stream
  // handler so the iteration line and the per-block line stay aligned.
  return describeLiveBlock(last)
}

/**
 * Load the agent's category spec markdown from the repo's docs/specs
 * directory. Called once per run.
 */
export async function loadAgentSpec(specPath: string): Promise<string> {
  try {
    return await fsReadFile(specPath, "utf8")
  } catch (err) {
    return `Spec file ${specPath} not found: ${(err as Error).message}`
  }
}
