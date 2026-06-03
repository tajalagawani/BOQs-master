import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { metaPath } from "@/lib/paths";
import { readMeta, updateMeta } from "@/lib/runMeta";
import { runPomiPipeline } from "@/lib/boq/pomiPipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

interface StartBody {
  mapping?: unknown; // user-confirmed column mapping (recorded, informational)
  model?: string; // optional Claude model override for classification
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const meta = await readMeta(runId);
  if (!meta) {
    return NextResponse.json({ error: "run not found" }, { status: 404 });
  }
  if (meta.status === "running") {
    return NextResponse.json({ runId, status: "already running" });
  }

  let model: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as StartBody;
    if (body?.mapping) {
      await fs.writeFile(
        metaPath(runId).replace(/meta\.json$/, "mapping.json"),
        JSON.stringify(body.mapping, null, 2),
        "utf-8",
      );
    }
    model = typeof body?.model === "string" ? body.model : undefined;
  } catch {
    /* best-effort */
  }

  await updateMeta(runId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  // Fire-and-forget: the POMI pipeline runs in-process and streams progress to
  // run.log (tailed by /api/run/[runId]/log). On a long-lived Node server the
  // promise keeps running after this response returns.
  void runPomiPipeline(runId, model);

  return NextResponse.json({ runId, status: "started" });
}
