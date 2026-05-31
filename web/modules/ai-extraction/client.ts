import Anthropic from "@anthropic-ai/sdk"

import { env } from "@/modules/core/env"

/**
 * Anthropic SDK singleton.
 *
 * The document-extraction agent uses the direct SDK (not AI Gateway) so it
 * can engage adaptive thinking at max effort, prompt caching, and the 128k
 * output beta — none of which are exposed through the AI SDK abstraction.
 *
 * See docs/AI_AGENT_MIGRATION_PLAN.md for the rationale.
 */
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
})

export type ThinkingEffort = "low" | "medium" | "high" | "xhigh" | "max"

export const DEFAULT_MODEL = env.AI_DEFAULT_MODEL
/** Model used specifically by the chunked extractor (`agent/chunked.ts`). */
export const CHUNKED_MODEL = env.AI_CHUNKED_MODEL
export const DEFAULT_EFFORT: ThinkingEffort = env.AI_DEFAULT_EFFORT
export const DEFAULT_MAX_ITERATIONS = env.AI_MAX_ITERATIONS
export const DEFAULT_MAX_TOKENS = env.AI_MAX_TOKENS
/** 0 = unlimited. See `AI_CHUNKED_MAX_UNITS` in env.ts. */
export const DEFAULT_CHUNKED_MAX_UNITS = env.AI_CHUNKED_MAX_UNITS
/** When true, skip the optional Haiku classifier entirely. */
export const AI_CLASSIFY_DISABLED = env.AI_CLASSIFY_DISABLED

export const ANTHROPIC_BETAS = [
  "interleaved-thinking-2025-05-14",
  "output-128k-2025-02-19",
] as const

export function isAiConfigured(): boolean {
  return Boolean(env.ANTHROPIC_API_KEY)
}

/** Throws a clear error when no provider credentials are configured. */
export function assertAiAvailable(): void {
  if (!isAiConfigured()) {
    throw new Error(
      "AI_NOT_CONFIGURED: set ANTHROPIC_API_KEY in .env.local",
    )
  }
}
