// RatesX AI assistant — tool-calling agent.
// Runs a Claude loop that answers cost/rate questions by calling the read-only
// warehouse tools (tools.ts). Every number comes from a tool result; the model
// never recalls rates from training and never estimates when the library is
// empty.

import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, DEFAULT_MODEL, assertAiAvailable } from "@/modules/ai-extraction/client";
import { TOOL_DEFS, executeTool } from "./tools";

const SYSTEM = `You are the RatesX Assistant — a construction cost-data analyst for the IOX RatesX warehouse (a UAE/GCC rates library, mostly AED).

GROUND RULES
- Answer ONLY from tool results. For ANY number, call a tool first. Never recall or estimate rates from your own knowledge.
- Default currency is AED and default area basis is GIA unless the user says otherwise.
- Always report: the figure, its unit (e.g. "AED/m² GIA" or "AED/m³"), the sample size (projects or priced lines), and quote the median with the q1–q3 range when available.
- If a tool returns rows = 0 (or a "no data" note), tell the user the library has no data for that — DO NOT invent a number.
- If the question needs a breakdown the data doesn't capture (e.g. RTA-vs-private roads, curtain-wall-vs-cladding, green-certification premium %, precast-vs-in-situ, acceleration impact %, or city-level when only national data exists), call list_dimensions to confirm what exists, then say that dimension isn't captured and offer the closest available cut.

TOOL GUIDE
- benchmark_rate: cost per m² for NRM elements / asset classes. Map domain terms to elements:
  • "MEP" → Mechanical, Electrical, Chilled Water, District Cooling Plant
  • "wet utilities" → Potable Water, Sewerage, Stormwater, Irrigation
  • "dry utilities" → Electrical, Telecom, Substation 0.4/11-22kV, Gas, Streetlighting
  • "soft landscaping" → Public Realm - Open Space, Streetscape, Irrigation
  • "hard landscaping / paving / footpaths" → Streetscape, Roads, External Works
  • "infrastructure works" → Roads, Earthworks, External Works (or assetClass 'Infrastructure')
  • "façade / external envelope" → Building External Envelope
  • "reinforced concrete / shell & core" → Substructure, Superstructure
- market_rate: per-unit material/work rates (AAC blockwork, waterproofing, natural stone, concrete, asphalt, granular fill, cement, steel, aggregates). Rates only compare WITHIN a unit — read perUnit[]. When the user asks "per m²" or "per m³", report THAT unit's median from perUnit (look for unit "m2"/"m3"); never quote a lump-sum/count unit (item, nr, ls, lot, set) as a per-area rate. If only lump-sum units exist for the item, say the library has it priced per <unit>, not per m².
- elemental_breakdown: the element composition of an asset class (for "break down the cost components").
- escalation: inflation index factor between two years.
- design_ratios: quantity-per-area ratios (e.g. m² of formwork per m² of floor) by element + asset type — for "how much <element> per m²", "wall-to-floor ratio".
- cost_per_key: project cost per key/unit (hotel key, villa, residential unit, stadium seat) by asset class/country.
- project_lookup: profile a named project (or pass two names to compare projects side by side).
- rate_trend: year-by-year median rate of an actual material/work item (real history) — prefer over escalation when the user names a material.
- party_benchmark: median rate of an item grouped by contractor or employer — for "cheapest contractor for X". Compare WITHIN a unit.
- area_efficiency: GIA/GFA & BUA/GFA net-to-gross ratios and GFA per key, by asset class/country.
- rate_distribution: full spread (min/q1/median/q3/max + histogram) of one item's unit rate — for "range/spread of X".
- evidence: real source rows (project, description, rate, year) behind a figure — use when asked to "show the data / which projects", and to cite.
- list_dimensions: call when unsure a filter value exists.

RENDERING: trends (rate_trend), distributions (rate_distribution), elemental breakdowns and party comparisons are automatically drawn as a chart, and a "data points / Sources" line + CSV export appear under your answer — so DON'T paste big ASCII tables or long number lists; give the headline figures in prose and let the chart show the rest. When you used evidence/project_lookup, you can say "see the sourced lines below".

STYLE: be conversational. In one short, natural sentence say what you're about to look up (e.g. "Let me pull the UAE infrastructure benchmarks…"), THEN call the tool, then give the answer. After the data comes back, lead with the number, then the q1–q3 range and sample size, then one line of caveat. Keep it warm but concise. You may call several tools across the turn — a brief line before each is good.`;

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantToolCall {
  name: string;
  input: unknown;
  result: unknown;
}

export interface AssistantResult {
  answer: string;
  toolCalls: AssistantToolCall[];
}

const MAX_ITERATIONS = 8;

export async function runRatesAssistant(
  question: string,
  history: AssistantTurn[] = [],
): Promise<AssistantResult> {
  assertAiAvailable();

  const messages: Anthropic.MessageParam[] = [
    ...history
      .filter((h) => h.content?.trim())
      .map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: question },
  ];

  const toolCalls: AssistantToolCall[] = [];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const resp = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOL_DEFS as any,
      messages,
    });

    messages.push({ role: "assistant", content: resp.content });

    if (resp.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of resp.content) {
        if (block.type !== "tool_use") continue;
        let result: unknown;
        try {
          result = await executeTool(block.name, (block.input ?? {}) as Record<string, unknown>);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
        toolCalls.push({ name: block.name, input: block.input, result });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const answer = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { answer, toolCalls };
  }

  return {
    answer:
      "I wasn't able to resolve that within the lookup budget — try narrowing the question (one element/material, one country).",
    toolCalls,
  };
}

/* ─────────────────────── streaming (interactive) ─────────────────────── */

export interface AssistantTurnStats {
  tokensIn: number;
  tokensOut: number;
  answer: string;
  tools: { name: string; noData: boolean }[];
}

export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; input: unknown }
  | { type: "tool_result"; name: string; result: unknown }
  | { type: "done"; stats: AssistantTurnStats }
  | { type: "error"; message: string };

/** Heuristic: did a tool come back empty / with no usable data? */
function toolHadNoData(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  if (r.error) return true;
  if (typeof r.rows === "number" && r.rows === 0) return true;
  if (typeof r.totalRows === "number" && r.totalRows === 0) return true;
  if (Array.isArray(r.elements) && r.elements.length === 0) return true;
  if (Array.isArray(r.availableBreakdowns)) return true; // primary filter missed
  if (typeof r.note === "string" && /\bno\b/i.test(r.note)) return true;
  return false;
}

/** Streams the agent's work live: text deltas as they generate, tool-use and
 *  tool-result events as queries run, then a final `done`. */
export async function* streamRatesAssistant(
  question: string,
  history: AssistantTurn[] = [],
): AsyncGenerator<AssistantEvent> {
  assertAiAvailable();

  const messages: Anthropic.MessageParam[] = [
    ...history.filter((h) => h.content?.trim()).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: question },
  ];

  const stats: AssistantTurnStats = { tokensIn: 0, tokensOut: 0, answer: "", tools: [] };

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = anthropic.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: TOOL_DEFS as any,
      messages,
    });

    for await (const ev of stream) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
        stats.answer += ev.delta.text;
        yield { type: "text", text: ev.delta.text };
      }
    }

    const msg = await stream.finalMessage();
    stats.tokensIn += msg.usage?.input_tokens ?? 0;
    stats.tokensOut += msg.usage?.output_tokens ?? 0;
    messages.push({ role: "assistant", content: msg.content });

    if (msg.stop_reason !== "tool_use") {
      yield { type: "done", stats };
      return;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      yield { type: "tool", name: block.name, input: block.input };
      let result: unknown;
      try {
        result = await executeTool(block.name, (block.input ?? {}) as Record<string, unknown>);
      } catch (e) {
        result = { error: e instanceof Error ? e.message : String(e) };
      }
      stats.tools.push({ name: block.name, noData: toolHadNoData(result) });
      yield { type: "tool_result", name: block.name, result };
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // Hit the iteration cap without a final answer.
  yield { type: "done", stats };
}
