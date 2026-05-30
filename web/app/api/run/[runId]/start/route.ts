import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import {
  inputPath,
  resultPath,
  logPath,
  POMI_APP,
  POMI_MASTER,
  REPO_ROOT,
  metaPath,
} from "@/lib/paths";
import { readMeta, updateMeta } from "@/lib/runMeta";
import { updateProject } from "@/lib/projectStore";

export const runtime = "nodejs";

interface StartBody {
  mapping?: unknown; // reserved for future column-override pass-through
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

  // Stash the user-confirmed mapping next to meta so future tooling can use it
  try {
    const body = (await req.json().catch(() => ({}))) as StartBody;
    if (body?.mapping) {
      await fs.writeFile(
        metaPath(runId).replace(/meta\.json$/, "mapping.json"),
        JSON.stringify(body.mapping, null, 2),
        "utf-8",
      );
    }
  } catch {
    /* best-effort */
  }

  const input = inputPath(runId);
  const output = resultPath(runId);
  const log = logPath(runId);
  const logStream = createWriteStream(log, { flags: "a" });

  await updateMeta(runId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  // Spawn the existing CLI verbatim — no engine changes required
  const proc = spawn(
    "python3",
    ["-u", POMI_APP, POMI_MASTER, input, "--out", output],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    },
  );

  proc.stdout.on("data", (chunk) => logStream.write(chunk));
  proc.stderr.on("data", (chunk) => logStream.write(chunk));
  proc.on("close", async (code) => {
    logStream.end();
    const ok = code === 0;
    await updateMeta(runId, {
      status: ok ? "complete" : "failed",
      exitCode: code ?? -1,
      endedAt: new Date().toISOString(),
    });
    // Link the result file to the project so the workspace can load it.
    await updateProject(runId, {
      status: ok ? "complete" : "failed",
      sourceFile: ok ? output : undefined,
      completedAt: new Date().toISOString(),
    });
  });
  proc.on("error", async (err) => {
    logStream.write(`\n[spawn error] ${err.message}\n`);
    logStream.end();
    await updateMeta(runId, {
      status: "failed",
      exitCode: -1,
      endedAt: new Date().toISOString(),
    });
    await updateProject(runId, {
      status: "failed",
      completedAt: new Date().toISOString(),
    });
  });

  return NextResponse.json({ runId, status: "started", pid: proc.pid });
}
