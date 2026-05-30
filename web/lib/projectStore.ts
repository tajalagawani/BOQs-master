/**
 * BOQ project store — backed by the unified IOX Postgres database via
 * Prisma (`BoqRun` model).
 *
 * Keeps the same public API the existing callers use
 * (`createProject`, `updateProject`, `getProject`, `listProjects`,
 * `projectNameFromFile`) so the upload route, run-start route and
 * `/boqs` page don't need to change.
 *
 * The status enum on disk was `processing | complete | failed`; the
 * DB enum is `PROCESSING | COMPLETE | FAILED`. Conversion happens at
 * the read/write boundary so callers keep using lowercase strings.
 */
import "server-only";
import { prisma } from "./prisma";
import type { BoqRun, BoqRunStatus } from "@prisma/client";

export type ProjectStatus = "processing" | "complete" | "failed";

export interface StoredProject {
  id: string;
  name: string;
  fileName: string;
  sourceFile?: string;
  status: ProjectStatus;
  runId: string;            // historical alias for id — kept for callers
  createdAt: string;
  completedAt?: string;
}

// ── enum mapping ──
function toDbStatus(s: ProjectStatus): BoqRunStatus {
  return s.toUpperCase() as BoqRunStatus;
}
function fromDbStatus(s: BoqRunStatus): ProjectStatus {
  return s.toLowerCase() as ProjectStatus;
}

// ── row → public shape ──
function rowToStored(r: BoqRun): StoredProject {
  return {
    id: r.id,
    name: r.name,
    fileName: r.fileName,
    sourceFile: r.sourceFile ?? undefined,
    status: fromDbStatus(r.status),
    runId: r.id,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString(),
  };
}

// ── reads ──
export async function listProjects(): Promise<StoredProject[]> {
  const rows = await prisma.boqRun.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToStored);
}

export async function getProject(id: string): Promise<StoredProject | null> {
  const row = await prisma.boqRun.findUnique({ where: { id } });
  return row ? rowToStored(row) : null;
}

// ── writes ──
export async function createProject(
  p: Omit<StoredProject, "createdAt">,
): Promise<StoredProject> {
  const row = await prisma.boqRun.create({
    data: {
      id: p.id,
      name: p.name,
      fileName: p.fileName,
      sourceFile: p.sourceFile,
      status: toDbStatus(p.status),
      completedAt: p.completedAt ? new Date(p.completedAt) : undefined,
    },
  });
  return rowToStored(row);
}

export async function updateProject(
  id: string,
  patch: Partial<StoredProject>,
): Promise<StoredProject | null> {
  // Build a Prisma-shaped patch from the public shape
  const data: Partial<{
    name: string;
    fileName: string;
    sourceFile: string | null;
    status: BoqRunStatus;
    completedAt: Date | null;
  }> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.fileName !== undefined) data.fileName = patch.fileName;
  if (patch.sourceFile !== undefined) data.sourceFile = patch.sourceFile ?? null;
  if (patch.status !== undefined) data.status = toDbStatus(patch.status);
  if (patch.completedAt !== undefined) {
    data.completedAt = patch.completedAt ? new Date(patch.completedAt) : null;
  }

  try {
    const row = await prisma.boqRun.update({
      where: { id },
      data,
    });
    return rowToStored(row);
  } catch {
    return null;
  }
}

/** Derive a human-friendly project name from a file name. */
export function projectNameFromFile(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base
    .replace(/_/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\d+\)$/, "")
    .replace(/\s+POMI[\s_-]*coded$/i, "")
    .trim();
}
