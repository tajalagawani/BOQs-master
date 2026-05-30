import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import { v4 as uuidv4 } from "uuid";
import { ensureRunDir, inputPath } from "@/lib/paths";
import { writeMeta } from "@/lib/runMeta";
import { createProject, projectNameFromFile } from "@/lib/projectStore";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
  }
  const name = file.name || "input.xlsx";
  if (!name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "file must be an .xlsx" },
      { status: 400 },
    );
  }

  const runId = uuidv4().slice(0, 8);
  await ensureRunDir(runId);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(inputPath(runId), buf);

  await writeMeta(runId, {
    runId,
    originalName: name,
    startedAt: new Date().toISOString(),
    status: "uploaded",
  });

  // Auto-create a project linked to this run. Project id == run id.
  await createProject({
    id: runId,
    runId,
    name: projectNameFromFile(name),
    fileName: name,
    status: "processing",
  });

  return NextResponse.json({ runId, projectId: runId, originalName: name });
}
