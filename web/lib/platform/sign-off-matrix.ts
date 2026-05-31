import "server-only";

import { getDoc } from "./docs";
import type { MatrixRow, MatrixStatus } from "./matrix-types";

export type { MatrixRow, MatrixStatus } from "./matrix-types";

export interface MatrixTally {
  green: number;
  yellow: number;
  orange: number;
  red: number;
  total: number;
}

const EMOJI_TO_STATUS: Record<string, MatrixStatus> = {
  "🟢": "green",
  "🟡": "yellow",
  "🟠": "orange",
  "🔴": "red",
};

/**
 * Parse `docs/quality/sign-off-matrix.md`. The matrix is a single table
 * under a `## Matrix` heading with these columns:
 *
 *   KPI | Component | Sub-Component | Phase | Status | Evidence | Assessor
 *
 * Status cells start with a coloured emoji that we use as the canonical
 * bucket. The Evidence cell holds either backtick-quoted file paths or
 * inline markdown links — we extract both.
 */
export async function parseSignOffMatrix(): Promise<MatrixRow[]> {
  const doc = await getDoc("quality/sign-off-matrix");
  const md = doc?.content;
  if (!md) return [];

  const rows: MatrixRow[] = [];
  const lines = md.split(/\r?\n/);

  let inTable = false;
  let headerSeen = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!inTable) {
      if (/^\|\s*KPI\s*\|/i.test(line)) {
        inTable = true;
        headerSeen = false;
      }
      continue;
    }
    if (!line.startsWith("|")) {
      inTable = false;
      continue;
    }
    if (!headerSeen) {
      if (/^\|\s*-+/.test(line)) headerSeen = true;
      continue;
    }

    const cells = splitMdRow(line);
    if (cells.length < 7) continue;
    const [kpi, component, subComponent, phaseRaw, statusRaw, evidenceRaw] = cells;

    const phase = Number(phaseRaw.replace(/\D+/g, "")) || 0;
    const emoji = (statusRaw.trim().match(/^(\S+)/)?.[1] ?? "") as keyof typeof EMOJI_TO_STATUS;
    const status: MatrixStatus = EMOJI_TO_STATUS[emoji] ?? "unknown";

    const evidence = evidenceRaw.trim();
    const evidencePaths = extractPaths(evidence);

    rows.push({
      kpi,
      component,
      subComponent,
      phase,
      status,
      statusLabel: statusRaw.trim().replace(/^\S+\s*/, ""),
      evidence,
      evidencePaths,
    });
  }

  return rows;
}

function splitMdRow(line: string): string[] {
  const inner = line.replace(/^\|/, "").replace(/\|\s*$/, "");
  return inner.split("|").map((c) => c.trim());
}

function extractPaths(evidence: string): string[] {
  const paths = new Set<string>();
  for (const m of evidence.matchAll(/`([^`]+)`/g)) {
    const p = m[1].trim();
    if (looksLikePath(p)) paths.add(stripTrailingPunct(p));
  }
  for (const m of evidence.matchAll(/\]\(([^)]+)\)/g)) {
    const p = m[1].trim();
    if (looksLikePath(p)) paths.add(stripTrailingPunct(p));
  }
  return [...paths];
}

function looksLikePath(p: string): boolean {
  if (p.startsWith("http://") || p.startsWith("https://")) return false;
  if (p.startsWith("#")) return false;
  return /[a-z0-9_\-]+\/[a-z0-9_\-./]+/i.test(p) || p.endsWith(".md") || p.endsWith(".yaml");
}

function stripTrailingPunct(p: string): string {
  return p.replace(/[.,;:)\]]+$/, "");
}

export async function tallyMatrix(): Promise<MatrixTally> {
  const rows = await parseSignOffMatrix();
  const t: MatrixTally = { green: 0, yellow: 0, orange: 0, red: 0, total: rows.length };
  for (const r of rows) {
    if (r.status === "unknown") continue;
    t[r.status]++;
  }
  return t;
}
