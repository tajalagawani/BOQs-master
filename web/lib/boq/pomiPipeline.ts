/**
 * The POMI pipeline that powers a BOQs run. Replaces the old Python coder:
 *   1. parse the uploaded workbook (deterministic Python engine)
 *   2. classify every item against the POMI reference (Claude)
 *   3. write result.xlsx in the shape the BOQs UI reads (MASTER BOQs + sheets)
 *
 * Progress is appended to the run's run.log so the existing LiveLog SSE keeps
 * working unchanged. Meta + project status are updated on completion/failure.
 */
import { appendFile } from "node:fs/promises";
import { inputPath, resultPath, logPath } from "@/lib/paths";
import { updateMeta } from "@/lib/runMeta";
import { updateProject } from "@/lib/projectStore";
import { parseBOQ } from "@/lib/pomi/parse";
import { classifyItems, type ClassifyItem } from "@/lib/pomi/classify";
import { writeResultWorkbook } from "@/lib/boq/writeResult";
import type { BOQResult } from "@/lib/pomi/schema";

export async function runPomiPipeline(runId: string, model?: string): Promise<void> {
  const log = (line: string) => appendFile(logPath(runId), line + "\n", "utf-8").catch(() => {});

  try {
    await log("→ Parsing workbook…");
    const parsed = (await parseBOQ(inputPath(runId))) as BOQResult;
    const items = parsed.items || [];
    await log(`✓ Parsed ${items.length} items across ${(parsed.sheets || []).length} sheets.`);

    if (items.length === 0) {
      await log("✗ No measured items found in this workbook.");
      await finish(runId, false, 0, 0);
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

    await log(`→ Classifying ${items.length} items against the POMI reference…`);
    const mappings = await classifyItems(toClassify, sheetMetas, {
      model,
      onProgress: (done, total) => {
        // one rolling line per batch — readable in the live log
        void log(`  mapped ${done}/${total}`);
      },
    });

    let needsReview = 0;
    items.forEach((it, i) => {
      it.pomi = mappings[i];
      if (mappings[i].needs_review) needsReview += 1;
    });
    const mapped = mappings.filter((m) => m.code).length;

    await log("→ Writing result workbook…");
    await writeResultWorkbook(resultPath(runId), parsed);
    await log(`✓ Done — ${mapped}/${items.length} mapped, ${needsReview} need review.`);

    await finish(runId, true, items.length, mapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pipeline failed";
    await log(`✗ ${message}`);
    await finish(runId, false, 0, 0);
  }
}

async function finish(runId: string, ok: boolean, totalItems: number, coded: number) {
  await updateMeta(runId, {
    status: ok ? "complete" : "failed",
    endedAt: new Date().toISOString(),
    exitCode: ok ? 0 : 1,
    stats: { totalItems, coded },
  });
  await updateProject(runId, {
    status: ok ? "complete" : "failed",
    sourceFile: ok ? resultPath(runId) : undefined,
    completedAt: new Date().toISOString(),
  });
}
