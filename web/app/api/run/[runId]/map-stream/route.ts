import { writeFile } from "node:fs/promises";
import { inputPath, resultPath, resultJsonPath, logPath } from "@/lib/paths";
import { readMeta, updateMeta } from "@/lib/runMeta";
import { updateProject } from "@/lib/projectStore";
import { parseBOQ } from "@/lib/pomi/parse";
import { classifyItems, type ClassifyItem } from "@/lib/pomi/classify";
import { writeResultWorkbook } from "@/lib/boq/writeResult";
import type { BOQResult } from "@/lib/pomi/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Stream the POMI mapping for a run as SSE so the UI can render the result
 * table live, filling in as each batch lands — then persist result.xlsx and
 * flip the run/project to complete so the grid + workspace keep working.
 *
 * Events: parsed { result } · mapped { entries } · progress { done,total }
 *         done { summary } · error { message }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const meta = await readMeta(runId);
  if (!meta) {
    return new Response(JSON.stringify({ error: "run not found" }), { status: 404 });
  }
  const model = (await req.json().catch(() => ({} as { model?: string }))).model || undefined;

  await updateMeta(runId, { status: "running", startedAt: new Date().toISOString() });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        // Ignore enqueue errors (client disconnected) — the pipeline still
        // finishes and persists, so a late disconnect can't fail a done run.
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* controller closed */
        }
      };
      try {
        const parsed = (await parseBOQ(inputPath(runId))) as BOQResult;
        const items = parsed.items || [];
        send({ type: "parsed", result: parsed });

        if (items.length === 0) {
          await writeFile(logPath(runId), "No measured items found.\n", "utf-8").catch(() => {});
          await fail(runId);
          send({ type: "error", message: "No measured items found in this workbook." });
          controller.close();
          return;
        }

        const toClassify: ClassifyItem[] = items.map((it) => ({
          sheet: it.sheet,
          ref: it.ref || "",
          description: it.description || "",
          spec: it.spec || "",
          full_description: it.full_description || it.description || "",
          unit: it.unit || "",
          quantity: it.quantity,
          rate: it.rate,
          amount: it.amount,
          section_context: it.section_context || "",
        }));
        const sheetMetas = (parsed.sheets || []).map((s) => ({ name: s.name, column_map: s.column_map }));

        const mappings = await classifyItems(toClassify, sheetMetas, {
          model,
          onProgress: (done, total) => send({ type: "progress", done, total }),
          onMapped: (entries) =>
            send({
              type: "mapped",
              entries: entries.map((e) => ({
                index: e.index,
                code: e.mapping.code,
                section: e.mapping.section,
                sub_section: e.mapping.l1_name || e.mapping.sub_section,
                confidence: e.mapping.confidence,
                needs_review: e.mapping.needs_review,
                pomi_desc: e.mapping.pomi_desc,
                nrm_code: e.mapping.nrm_code,
                nrm_desc: e.mapping.nrm_desc,
                method: e.mapping.method,
              })),
            }),
        });

        const by_section: Record<string, number> = {};
        let needs_review = 0;
        items.forEach((it, i) => {
          it.pomi = mappings[i];
          if (mappings[i].section)
            by_section[mappings[i].section] = (by_section[mappings[i].section] || 0) + 1;
          if (mappings[i].needs_review) needs_review += 1;
        });
        const mapped = mappings.filter((m) => m.code).length;
        parsed.summary = {
          ...parsed.summary,
          mapped,
          needs_review,
          engine: mappings[0]?.engine || "ai",
          by_section: Object.fromEntries(Object.entries(by_section).sort()),
        };

        await writeResultWorkbook(resultPath(runId), parsed);
        // Persist the full POMI result so Export can rebuild the styled
        // standalone-POMI workbook (Contents + per-sheet, POMI columns).
        await writeFile(resultJsonPath(runId), JSON.stringify(parsed), "utf-8").catch(() => {});
        await updateMeta(runId, {
          status: "complete",
          endedAt: new Date().toISOString(),
          exitCode: 0,
          stats: { totalItems: items.length, coded: mapped },
        });
        await updateProject(runId, {
          status: "complete",
          sourceFile: resultPath(runId),
          completedAt: new Date().toISOString(),
        });

        send({ type: "done", summary: { items: items.length, mapped, needs_review } });
      } catch (err) {
        await fail(runId);
        send({ type: "error", message: err instanceof Error ? err.message : "mapping failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function fail(runId: string) {
  await updateMeta(runId, { status: "failed", endedAt: new Date().toISOString(), exitCode: 1 });
  await updateProject(runId, { status: "failed", completedAt: new Date().toISOString() });
}
