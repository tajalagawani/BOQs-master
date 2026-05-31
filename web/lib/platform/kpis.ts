import "server-only";

import { parseBacklog } from "./backlog";
import { parseSignOffMatrix } from "./sign-off-matrix";
import type { MatrixRow } from "./matrix-types";
import { statusLabel, type Kpi, type KpiTally } from "./kpi-types";

export type { Kpi, KpiTally } from "./kpi-types";
export { statusTone, statusLabel, STATUS_BUCKET_ORDER } from "./kpi-types";

const COMPONENT_REF: Record<string, number> = {
  "Foundation & Security": 1,
  "Data & Architecture": 2,
  "Integration Capability": 3,
  "Operational Readiness": 4,
  "Platform Launch / First Live Service": 5,
};

export async function getAllKpis(): Promise<Kpi[]> {
  const [matrix, backlog] = await Promise.all([
    parseSignOffMatrix(),
    parseBacklog(),
  ]);

  const backlogByKpi = new Map<string, (typeof backlog)[number]>();
  for (const b of backlog) backlogByKpi.set(b.kpi, b);

  return matrix.map((m: MatrixRow): Kpi => {
    const b = backlogByKpi.get(m.kpi);
    return {
      kpi: m.kpi,
      component: m.component,
      componentRef: COMPONENT_REF[m.component] ?? 0,
      subComponent: m.subComponent,
      phase: m.phase,
      status: m.status,
      statusLabel: statusLabel(m.status),
      weHave: b?.weHave ?? "",
      missing: b?.missing ?? "",
      evidence: m.evidence,
      evidencePaths: m.evidencePaths,
    };
  });
}

export async function getKpi(id: string): Promise<Kpi | null> {
  const all = await getAllKpis();
  return all.find((k) => k.kpi.toLowerCase() === id.toLowerCase()) ?? null;
}

export async function getKpiTally(): Promise<KpiTally> {
  const all = await getAllKpis();
  const t: KpiTally = {
    total: all.length,
    green: 0,
    yellow: 0,
    orange: 0,
    red: 0,
    greenPct: 0,
    byComponent: [],
    byPhase: [],
  };

  const byComp = new Map<number, { ref: number; component: string; total: number; green: number }>();
  const byPhase = new Map<number, { phase: number; total: number; green: number }>();

  for (const k of all) {
    if (k.status !== "unknown") t[k.status]++;
    const c = byComp.get(k.componentRef) ?? {
      ref: k.componentRef,
      component: k.component,
      total: 0,
      green: 0,
    };
    c.total++;
    if (k.status === "green") c.green++;
    byComp.set(k.componentRef, c);

    const p = byPhase.get(k.phase) ?? { phase: k.phase, total: 0, green: 0 };
    p.total++;
    if (k.status === "green") p.green++;
    byPhase.set(k.phase, p);
  }

  t.greenPct = t.total > 0 ? Math.round((t.green / t.total) * 100) : 0;
  t.byComponent = [...byComp.values()].sort((a, b) => a.ref - b.ref);
  t.byPhase = [...byPhase.values()].sort((a, b) => a.phase - b.phase);
  return t;
}
