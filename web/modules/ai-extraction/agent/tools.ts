/**
 * Agent tool surface — V2 trims this to a single tool: `submit_verdict`.
 *
 * Pre-V2 the agent had bash/python/read_file/write_file for spelunking the
 * sandbox. With single-shot (full surface inlined) + chunked extraction,
 * no shell is needed — the model reads the surface from the prompt and
 * emits the verdict directly via this one tool.
 */
import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import type { Sandbox } from "./sandbox"

export interface VerdictReceiver {
  setVerdict(verdict: unknown): void
}

export interface Executor {
  parse(input: unknown): unknown
  run(parsed: unknown): Promise<unknown>
}

export interface ToolBundle {
  apiTools: Anthropic.Beta.Messages.BetaTool[]
  executors: Record<string, Executor>
}

export function buildTools(
  _sandbox: Sandbox,
  receiver: VerdictReceiver,
): ToolBundle {
  const verdictSchema = z.object({
    verdict: z.unknown().describe("The structured verdict JSON."),
  })

  const apiTools: Anthropic.Beta.Messages.BetaTool[] = [
    {
      type: "custom",
      name: "submit_verdict",
      description:
        "Submit the final structured verdict JSON. The loop terminates after this call. The verdict must match the category-specific schema described in the system prompt.",
      input_schema: {
        type: "object",
        properties: {
          verdict: {
            description: "The structured verdict JSON matching the spec schema.",
          },
        },
        required: ["verdict"],
      },
    },
  ]

  const executors: Record<string, Executor> = {
    submit_verdict: {
      parse: (input) => verdictSchema.parse(input),
      run: async (parsed) => {
        const { verdict } = parsed as z.infer<typeof verdictSchema>
        receiver.setVerdict(verdict)
        return { ok: true, message: "Verdict accepted." }
      },
    },
  }

  return { apiTools, executors }
}
