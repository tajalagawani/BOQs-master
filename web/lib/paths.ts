import path from "node:path";
import fs from "node:fs/promises";

/**
 * Repository root — one level above the `web/` Next.js project.
 * That's where pomi_coder_app.py, pomi_rules.py, the POMI master and
 * the existing output/ folder live.
 */
export const REPO_ROOT = path.resolve(process.cwd(), "..");

/** Absolute path to the Python entrypoint we already use from the CLI. */
export const POMI_APP = path.join(REPO_ROOT, "pomi_coder_app.py");

/** Absolute path to the master POMI coding workbook. */
export const POMI_MASTER = path.join(REPO_ROOT, "POMI_CODING_FINAL 1 (1).xlsx");

/**
 * Per-run storage lives under /tmp/iox-runs/{runId}/
 *   - input.xlsx   – the uploaded BoQ
 *   - result.xlsx  – the POMI-coded output (produced by the Python)
 *   - run.log      – the captured stdout of the Python process
 *   - meta.json    – metadata (status, started_at, ended_at, file name)
 */
export function runDir(runId: string) {
  return path.join("/tmp", "iox-runs", runId);
}

export async function ensureRunDir(runId: string) {
  const dir = runDir(runId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export const inputPath  = (runId: string) => path.join(runDir(runId), "input.xlsx");
export const resultPath = (runId: string) => path.join(runDir(runId), "result.xlsx");
export const logPath    = (runId: string) => path.join(runDir(runId), "run.log");
export const metaPath   = (runId: string) => path.join(runDir(runId), "meta.json");

/** Best-effort lookup: list runs that have a meta.json on disk. */
export async function listRunIds(): Promise<string[]> {
  const base = path.join("/tmp", "iox-runs");
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}
