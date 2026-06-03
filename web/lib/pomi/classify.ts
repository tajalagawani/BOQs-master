// Structured POMI classifier — no agent, no sandbox.
//
// Deterministic parser gives us items per sheet; we send each sheet's items to
// Claude in batches and force a structured tool call that returns one POMI code
// per item. The 604-code reference table is cached in the system prompt (paid
// once per cache window), so dozens of batches stay cheap. Returned codes are
// validated against the real table; anything invalid/low-confidence is flagged.

import Anthropic from "@anthropic-ai/sdk";
import { loadCodes, byCode, codeTableText, type PomiCode } from "./codes";
import { section_summary } from "./sections";

export type ClassifyItem = {
  sheet: string;
  ref?: string;
  description?: string;
  spec?: string;
  full_description: string;
  unit: string;
  quantity?: number | null;
  rate?: number | null;
  amount?: number | null;
  section_context?: string;
};

// Per-sheet structural context shown to the model (column layout + headings).
export type SheetMeta = { name: string; column_map?: Record<string, number>; sheet_title?: string };

export type PomiMapping = {
  section: string;
  sub_section: string; // = l1_name, kept for back-compat
  l1_code: string;
  l1_name: string;
  l2_code: string;
  l2_name: string;
  l3_code: string;
  l3_name: string;
  code: string;
  pomi_desc: string;
  nrm_code: string;
  nrm_desc: string;
  method: string;
  confidence: number;
  engine: string;
  needs_review: boolean;
  rationale: string;
};

/**
 * Decompose a POMI code into its 4 levels. The 7-char code is
 * Section(1) + L1(2) + L2(2) + L3(2); the level *names* are the links of the
 * ancestor chain in full_text ("SECTION A … › Restrictions › <clause> › <item>").
 * A level whose digits are "00" is absent (empty).
 */
export interface PomiLevels {
  l1_code: string; l1_name: string;
  l2_code: string; l2_name: string;
  l3_code: string; l3_name: string;
}
function decompose(c: PomiCode): PomiLevels {
  const code = c.code || "";
  const segs = (c.full_text || "").split("›").map((s) => s.trim());
  const lvl = (raw: string) => (raw && raw !== "00" ? raw : "");
  const present = (raw: string, name?: string) => (lvl(raw) ? name || "" : "");
  return {
    l1_code: lvl(code.slice(1, 3)), l1_name: present(code.slice(1, 3), segs[1]),
    l2_code: lvl(code.slice(3, 5)), l2_name: present(code.slice(3, 5), segs[2]),
    l3_code: lvl(code.slice(5, 7)), l3_name: present(code.slice(5, 7), segs[3]),
  };
}

const MODEL = process.env.POMI_MAP_MODEL || "claude-sonnet-4-6";
const BATCH = 40;
const CONCURRENCY = 4;
const REVIEW_THRESHOLD = Number(process.env.POMI_REVIEW_THRESHOLD) || 75;

// Approximate USD pricing per 1M tokens (estimate; cache write = 1.25× input,
// cache read = 0.1× input).
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
  "claude-opus-4-8": { in: 15.0, out: 75.0 },
};

export type UsageStats = {
  model: string;
  batches: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  cost_usd: number;
};

type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

function estimateCost(model: string, u: TokenUsage): number {
  const p = PRICING[model] || PRICING["claude-sonnet-4-6"];
  const cost =
    (u.input_tokens * p.in +
      u.cache_creation_input_tokens * p.in * 1.25 +
      u.cache_read_input_tokens * p.in * 0.1 +
      u.output_tokens * p.out) /
    1_000_000;
  return Math.round(cost * 10000) / 10000;
}

const TOOL = {
  name: "submit_pomi_codes",
  description: "Return the single best POMI code for each numbered item.",
  input_schema: {
    type: "object" as const,
    properties: {
      mappings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            i: { type: "integer", description: "the item index given in the prompt" },
            code: { type: "string", description: "a 7-character POMI code from the reference table" },
            confidence: { type: "number", description: "0–100; be honest, <85 means a human should check" },
            rationale: { type: "string", description: "one short phrase" },
          },
          required: ["i", "code", "confidence"],
        },
      },
    },
    required: ["mappings"],
  },
};

function systemBlocks(tableText: string) {
  return [
    {
      type: "text" as const,
      text:
        "You are a quantity surveyor expert in POMI (Principles of Measurement International, RICS). " +
        "Classify each Bill of Quantities item into exactly one POMI section (A–R) and the most specific " +
        "7-character POMI code. Choose the section by the NATURE of the work, not just the unit. The sheet/" +
        "trade the item comes from is a strong prior. Always return a real code from the reference table " +
        "for every item. Give an honest confidence 0–100.\n\nPOMI sections:\n" + section_summary(),
    },
    {
      // The big reference table — cached so repeated batches don't re-pay for it.
      type: "text" as const,
      text: "POMI CODE REFERENCE (code<TAB>section<TAB>measurement<TAB>description):\n" + tableText,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

const num = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

// Render the sheet's structure and text IN ORDER: heading lines whenever the
// section/Part context changes, then each item with ref, unit, qty, rate, amount
// and its spec+description. The model sees the real layout, not isolated rows.
function buildUserPrompt(meta: SheetMeta, items: ClassifyItem[], indices: number[]): string {
  const colInfo = meta.column_map
    ? "columns: " + Object.entries(meta.column_map).map(([k, v]) => `${k}=col${v}`).join(", ")
    : "";
  const headings = [...new Set(items.map((it) => it.section_context).filter(Boolean))].slice(0, 40);

  const lines: string[] = [];
  let lastCtx = "";
  items.forEach((it, j) => {
    const idx = indices[j];
    const ctx = it.section_context || "";
    if (ctx && ctx !== lastCtx) {
      lines.push(`\n== ${ctx} ==`);
      lastCtx = ctx;
    }
    const vals = [
      it.ref ? `ref ${it.ref}` : "",
      it.unit ? `unit ${it.unit}` : "",
      it.quantity != null ? `qty ${num(it.quantity)}` : "",
      it.rate != null ? `rate ${num(it.rate)}` : "",
      it.amount != null ? `amt ${num(it.amount)}` : "",
    ].filter(Boolean).join(" · ");
    const spec = it.spec && it.spec !== it.full_description ? `\n     spec: ${it.spec.slice(0, 220)}` : "";
    const desc = it.description || it.full_description;
    lines.push(`  [#${idx}] ${vals}\n     ${desc.slice(0, 260)}${spec}`);
  });

  return (
    `Sheet "${meta.name}"${meta.sheet_title ? ` (${meta.sheet_title})` : ""}. ${colInfo}\n` +
    (headings.length ? `Headings/Parts in this sheet: ${headings.join(" | ")}\n` : "") +
    `\nBelow are the sheet's items in order, with their headings as context. ` +
    `Assign a POMI code to every [#index]. Use the heading/trade as a strong prior.\n` +
    lines.join("\n")
  );
}

async function classifyBatch(
  client: Anthropic,
  meta: SheetMeta,
  items: ClassifyItem[],
  indices: number[],
  tableText: string,
  codeMap: Map<string, PomiCode>,
  model: string
): Promise<{ out: Map<number, PomiMapping>; usage: any }> {
  const out = new Map<number, PomiMapping>();
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemBlocks(tableText),
    tools: [TOOL],
    tool_choice: { type: "tool", name: TOOL.name },
    messages: [{ role: "user", content: buildUserPrompt(meta, items, indices) }],
  });

  const block = msg.content.find((b) => b.type === "tool_use") as any;
  const mappings: any[] = block?.input?.mappings ?? [];
  for (const m of mappings) {
    const idx = m.i;
    const code = codeMap.get(m.code);
    if (idx == null || !indices.includes(idx)) continue;
    if (!code) continue; // invalid code -> leave to fallback below
    // models return confidence on either a 0–1 or 0–100 scale; normalise to 0–100.
    let conf = Number(m.confidence) || 0;
    if (conf > 0 && conf <= 1) conf = conf * 100;
    conf = Math.round(conf);
    const lv = decompose(code);
    out.set(idx, {
      section: code.section, sub_section: lv.l1_name, ...lv, code: code.code,
      pomi_desc: code.full_text || code.description,
      nrm_code: code.nrm_code, nrm_desc: code.nrm_desc, method: code.measurement,
      confidence: conf, engine: model, needs_review: conf < REVIEW_THRESHOLD,
      rationale: m.rationale || "",
    });
  }
  return { out, usage: msg.usage };
}

function emptyMapping(reason: string): PomiMapping {
  return {
    section: "", sub_section: "",
    l1_code: "", l1_name: "", l2_code: "", l2_name: "", l3_code: "", l3_name: "",
    code: "", pomi_desc: "", nrm_code: "", nrm_desc: "", method: "",
    confidence: 0, engine: MODEL, needs_review: true, rationale: reason,
  };
}

export type ClassifyEvents = {
  model?: string;
  onProgress?: (done: number, total: number) => void;
  onMapped?: (entries: { index: number; mapping: PomiMapping }[]) => void;
  onUsage?: (stats: UsageStats) => void;
};

/** Classify all items (grouped by sheet, batched, concurrent). Order preserved. */
export async function classifyItems(
  items: ClassifyItem[],
  sheetMetas: SheetMeta[] = [],
  opts: ClassifyEvents = {}
): Promise<PomiMapping[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  const model = opts.model || MODEL;
  await loadCodes();
  const codeMap = await byCode();
  const tableText = await codeTableText();
  const client = new Anthropic();
  const metaByName = new Map(sheetMetas.map((m) => [m.name, m]));

  // Build batches as (sheet, indices[]) grouped by sheet to give the model trade context.
  type Batch = { sheet: string; indices: number[] };
  const bySheet = new Map<string, number[]>();
  items.forEach((it, i) => {
    const arr = bySheet.get(it.sheet) || [];
    arr.push(i);
    bySheet.set(it.sheet, arr);
  });
  const batches: Batch[] = [];
  for (const [sheet, idxs] of bySheet) {
    for (let k = 0; k < idxs.length; k += BATCH) {
      batches.push({ sheet, indices: idxs.slice(k, k + BATCH) });
    }
  }

  const results: PomiMapping[] = new Array(items.length).fill(null) as any;
  let done = 0;
  const total = items.length;
  const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  let batchCount = 0;

  // simple concurrency pool
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY);
    await Promise.all(
      slice.map(async (b) => {
        const batchItems = b.indices.map((idx) => items[idx]);
        const meta = metaByName.get(b.sheet) || { name: b.sheet };
        const entries: { index: number; mapping: PomiMapping }[] = [];
        try {
          const { out: got, usage: u } = await classifyBatch(client, meta, batchItems, b.indices, tableText, codeMap, model);
          if (u) {
            usage.input_tokens += u.input_tokens || 0;
            usage.output_tokens += u.output_tokens || 0;
            usage.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
            usage.cache_read_input_tokens += u.cache_read_input_tokens || 0;
            batchCount += 1;
          }
          for (const idx of b.indices) {
            const mapping = got.get(idx) || emptyMapping("model returned no code for this item");
            results[idx] = mapping;
            entries.push({ index: idx, mapping });
          }
        } catch (err) {
          const reason = `classify error: ${err instanceof Error ? err.message : err}`;
          for (const idx of b.indices) {
            const mapping = emptyMapping(reason);
            results[idx] = mapping;
            entries.push({ index: idx, mapping });
          }
        }
        done += b.indices.length;
        opts.onMapped?.(entries);
        opts.onProgress?.(done, total);
      })
    );
  }

  opts.onUsage?.({ model, batches: batchCount, ...usage, cost_usd: estimateCost(model, usage) });
  return results.map((r) => r || emptyMapping("unprocessed"));
}
