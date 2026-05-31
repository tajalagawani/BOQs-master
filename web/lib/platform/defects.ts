import "server-only";

import { getDoc } from "./docs";
import type { Defect, DefectSeverity, DefectState } from "./defect-types";

export type { Defect, DefectSeverity, DefectState } from "./defect-types";
export { severityTone } from "./defect-types";

export interface DefectStats {
  totalLifetime: number;
  openTotal: number;
  openCritical: number;
  openHigh: number;
  openMedium: number;
  openLow: number;
  closedTotal: number;
  bySeverity: { severity: DefectSeverity; count: number }[];
  byModule: { module: string; count: number }[];
}

const SEVERITIES: DefectSeverity[] = ["Critical", "High", "Medium", "Low"];

/**
 * Parse `docs/quality/defect-log.md`. Detects the open-vs-closed table
 * by the 5th-column header name ("Opened" → open, "Closed" → closed).
 * Rows whose title cell is `_(none currently)_` (or just `—`) are
 * treated as placeholders and skipped.
 */
export async function parseDefects(): Promise<Defect[]> {
  const doc = await getDoc("quality/defect-log");
  const md = doc?.content;
  if (!md) return [];

  const lines = md.split(/\r?\n/);
  const defects: Defect[] = [];

  let inTable: DefectState | null = null;
  let headerSeen = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (!inTable) {
      if (/^\|\s*ID\s*\|.*\|\s*(Opened)\s*\|/i.test(line)) {
        inTable = "open";
        headerSeen = false;
      } else if (/^\|\s*ID\s*\|.*\|\s*(Closed)\s*\|/i.test(line)) {
        inTable = "closed";
        headerSeen = false;
      }
      continue;
    }

    if (!line.startsWith("|")) {
      inTable = null;
      continue;
    }
    if (!headerSeen) {
      if (/^\|\s*-+/.test(line)) headerSeen = true;
      continue;
    }

    const cells = splitMdRow(line);
    if (cells.length < 7) continue;
    const [id, sevRaw, module, title, date, ownerOrCommit, notes] = cells;

    if (!id || id === "—" || /_\(none/i.test(title)) continue;

    const sev = sevRaw.replace(/\*\*/g, "").trim();
    const severity: DefectSeverity = SEVERITIES.includes(sev as DefectSeverity)
      ? (sev as DefectSeverity)
      : "Unknown";

    defects.push({
      id,
      state: inTable,
      severity,
      module,
      title: title.replace(/^_+|_+$/g, ""),
      date,
      ownerOrCommit,
      notes,
    });
  }

  return defects;
}

export async function getDefectStats(): Promise<DefectStats> {
  const defects = await parseDefects();
  const stats: DefectStats = {
    totalLifetime: defects.length,
    openTotal: 0,
    openCritical: 0,
    openHigh: 0,
    openMedium: 0,
    openLow: 0,
    closedTotal: 0,
    bySeverity: [],
    byModule: [],
  };

  const sevMap = new Map<DefectSeverity, number>();
  const modMap = new Map<string, number>();

  for (const d of defects) {
    if (d.state === "open") {
      stats.openTotal++;
      if (d.severity === "Critical") stats.openCritical++;
      else if (d.severity === "High") stats.openHigh++;
      else if (d.severity === "Medium") stats.openMedium++;
      else if (d.severity === "Low") stats.openLow++;
    } else {
      stats.closedTotal++;
    }
    sevMap.set(d.severity, (sevMap.get(d.severity) ?? 0) + 1);
    modMap.set(d.module, (modMap.get(d.module) ?? 0) + 1);
  }

  stats.bySeverity = [...sevMap.entries()]
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  stats.byModule = [...modMap.entries()]
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);

  return stats;
}

function splitMdRow(line: string): string[] {
  const inner = line.replace(/^\|/, "").replace(/\|\s*$/, "");
  return inner.split("|").map((c) => c.trim());
}

function severityRank(s: DefectSeverity): number {
  return ["Critical", "High", "Medium", "Low", "Unknown"].indexOf(s);
}
