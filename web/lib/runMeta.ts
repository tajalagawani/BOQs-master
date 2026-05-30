import fs from "node:fs/promises";
import { metaPath } from "./paths";

export type RunStatus = "uploaded" | "running" | "complete" | "failed";

export interface RunMeta {
  runId: string;
  originalName: string;
  startedAt: string;
  endedAt?: string;
  status: RunStatus;
  exitCode?: number;
  stats?: {
    totalItems?: number;
    coded?: number;
    rule?: number;
    fuzzy?: number;
    ai?: number;
    grandTotal?: number;
  };
}

export async function writeMeta(runId: string, meta: RunMeta): Promise<void> {
  await fs.writeFile(metaPath(runId), JSON.stringify(meta, null, 2), "utf-8");
}

export async function readMeta(runId: string): Promise<RunMeta | null> {
  try {
    const raw = await fs.readFile(metaPath(runId), "utf-8");
    return JSON.parse(raw) as RunMeta;
  } catch {
    return null;
  }
}

export async function updateMeta(
  runId: string,
  patch: Partial<RunMeta>,
): Promise<RunMeta | null> {
  const current = await readMeta(runId);
  if (!current) return null;
  const next = { ...current, ...patch };
  await writeMeta(runId, next);
  return next;
}
