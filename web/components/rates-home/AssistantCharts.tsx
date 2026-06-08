"use client";

// Charts + citations + export, derived entirely from the tool results already
// present in each assistant message — no extra data, no invented numbers. Three
// renderers cover (almost) every query: bars (categorical), line (time series),
// and ranges (min·q1·median·q3·max box) for the many "single number" answers.

import * as React from "react";

type Call = { name: string; input?: unknown; result?: unknown };

export type RangeRow = {
  label?: string;
  min: number;
  q1?: number;
  median: number;
  q3?: number;
  max: number;
};
export type ChartSpec =
  | { kind: "bars" | "line"; title: string; unit?: string; data: { label: string; value: number }[] }
  | { kind: "ranges"; title: string; unit?: string; rows: RangeRow[] };

const toNum = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

export function extractCharts(calls?: readonly Call[]): ChartSpec[] {
  const charts: ChartSpec[] = [];
  for (const c of calls ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = c.result as Record<string, any> | undefined;
    if (!r || typeof r !== "object") continue;

    const bars = (
      a: unknown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      label: (x: any) => string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      val: (x: any) => unknown,
    ) =>
      arr(a)
        .map((x) => ({ label: label(x), value: toNum(val(x)) }))
        .filter((d) => d.value != null) as { label: string; value: number }[];

    // line: time series
    if (arr(r.series).length) {
      const data = bars(r.series, (s) => String(s.year), (s) => s.median);
      if (data.length) charts.push({ kind: "line", title: `${r.query ?? "Rate"} — yearly median ${r.currency ?? ""}`.trim(), unit: r.currency, data });
    }
    // bars: histogram
    if (arr(r.histogram).length) {
      const data = bars(r.histogram, (h) => `${h.from}–${h.to}`, (h) => h.count);
      if (data.length) charts.push({ kind: "bars", title: `${r.query ?? "Rate"} distribution (${r.unit ?? ""})`, data });
    }
    // bars: elemental
    if (arr(r.elements).length) {
      const data = bars(r.elements, (e) => String(e.element), (e) => e.median);
      if (data.length > 1) charts.push({ kind: "bars", title: `Elemental breakdown ${r.currency ?? ""}/m²`.trim(), data });
    } else if (arr(r.byElement).length) {
      const data = bars(r.byElement, (e) => String(e.element), (e) => e.median);
      if (data.length > 1) charts.push({ kind: "bars", title: `By element ${r.currency ?? ""}/m²`.trim(), data });
    }
    // bars: party
    if (arr(r.parties).length) {
      const data = bars(r.parties, (p) => `${p.party}${p.unit ? " /" + p.unit : ""}`, (p) => p.median);
      if (data.length) charts.push({ kind: "bars", title: `${r.query ?? ""} by ${r.by ?? "party"} ${r.currency ?? ""}`.trim(), data });
    }
    // bars: design ratios
    if (arr(r.ratios).length) {
      const data = bars(r.ratios, (x) => `${x.assetType ?? x.assetClass ?? ""} ${x.element ?? ""}`.trim() || String(x.element), (x) => x.median);
      if (data.length) charts.push({ kind: "bars", title: `Design ratios (per ${r.ratios?.[0]?.unit ?? "unit"})`, data });
    }
    // bars: area efficiency (3 scalars)
    if (typeof r.giaToGfa === "number" || typeof r.buaToGfa === "number" || typeof r.gfaPerKey === "number") {
      const data = [
        { label: "GIA/GFA", value: toNum(r.giaToGfa) },
        { label: "BUA/GFA", value: toNum(r.buaToGfa) },
        { label: "GFA/key", value: toNum(r.gfaPerKey) },
      ].filter((d) => d.value != null) as { label: string; value: number }[];
      if (data.length) charts.push({ kind: "bars", title: "Area efficiency (ratios)", data });
    }
    // bars: project compare / cost per m²
    if (arr(r.compare).length) {
      const data = bars(r.compare, (p) => String(p.name ?? p.query), (p) => p.costPerGiaAed);
      if (data.length) charts.push({ kind: "bars", title: "Cost per m² (GIA) — comparison", data });
    } else if (arr(r.projects).length > 1) {
      const data = bars(r.projects, (p) => String(p.name), (p) => p.costPerGiaAed);
      if (data.length > 1) charts.push({ kind: "bars", title: "Cost per m² (GIA) by project", data });
    }
    // ranges: per-unit spread (market_rate)
    if (arr(r.perUnit).length) {
      const rows = arr(r.perUnit)
        .map((u) => ({ label: String(u.unit), min: toNum(u.min), q1: toNum(u.q1) ?? undefined, median: toNum(u.median), q3: toNum(u.q3) ?? undefined, max: toNum(u.max) }))
        .filter((x) => x.median != null && x.min != null && x.max != null && (x.max as number) >= (x.min as number)) as RangeRow[];
      if (rows.length) charts.push({ kind: "ranges", title: `${r.query ?? ""} — spread by unit ${r.currency ?? ""}`.trim(), rows });
    }
    // ranges: generic single median + spread (benchmark_rate, cost_per_key, rate_distribution)
    else if (typeof r.median === "number" && (typeof r.q1 === "number" || typeof r.min === "number")) {
      const min = toNum(r.min) ?? toNum(r.q1);
      const max = toNum(r.max) ?? toNum(r.q3);
      const median = toNum(r.median);
      if (min != null && max != null && median != null && max >= min) {
        const title = (r.unit ? `Range (${r.unit})` : r.currency ? `Range (${r.currency}/m²)` : "Range");
        charts.push({ kind: "ranges", title, unit: r.currency, rows: [{ min, q1: toNum(r.q1) ?? undefined, median, q3: toNum(r.q3) ?? undefined, max }] });
      }
    }
  }
  return charts.slice(0, 3);
}

export function extractSources(calls?: readonly Call[]): string[] {
  const names = new Set<string>();
  for (const c of calls ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = c.result as Record<string, any> | undefined;
    if (!r) continue;
    for (const a of [r.samples, r.projects, r.compare]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (Array.isArray(a)) a.forEach((x: any) => { if (x?.project) names.add(x.project); if (x?.name) names.add(x.name); });
    }
  }
  return [...names].slice(0, 8);
}

export function extractSampleSize(calls?: readonly Call[]): number {
  let n = 0;
  for (const c of calls ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = c.result as Record<string, any> | undefined;
    if (!r) continue;
    for (const k of ["rows", "projects", "totalRows", "count", "matches", "samples"]) {
      const v = Array.isArray(r[k]) ? (r[k] as unknown[]).length : Number(r[k]);
      if (Number.isFinite(v)) n = Math.max(n, v as number);
    }
  }
  return n;
}

export function extractCsv(calls?: readonly Call[]): { filename: string; csv: string } | null {
  for (const c of calls ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = c.result as Record<string, any> | undefined;
    if (!r) continue;
    const a = (r.series || r.histogram || r.elements || r.byElement || r.parties || r.perUnit || r.samples || r.ratios || r.projects) as unknown;
    if (Array.isArray(a) && a.length && typeof a[0] === "object") {
      const cols = Object.keys(a[0] as object);
      const esc = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csv = [cols.join(","), ...a.map((row) => cols.map((k) => esc((row as Record<string, unknown>)[k])).join(","))].join("\n");
      return { filename: `${c.name}.csv`, csv };
    }
  }
  return null;
}

/* ---------- renderers ---------- */

const fmt = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: Math.abs(n) < 10 ? 2 : 0 });

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3">
      <div className="mb-2 text-[11px] font-medium text-zinc-500">{spec.title}</div>
      {spec.kind === "ranges" ? (
        <Ranges rows={spec.rows} />
      ) : spec.kind === "line" ? (
        <Sparkline data={spec.data} />
      ) : (
        <Bars data={spec.data} />
      )}
    </div>
  );
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const rows = [...data].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 12);
  const max = Math.max(1, ...rows.map((d) => Math.abs(d.value)));
  return (
    <div className="flex flex-col gap-1">
      {rows.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="w-28 shrink-0 truncate text-zinc-600" title={d.label}>{d.label}</span>
          <div className="h-3.5 flex-1 overflow-hidden rounded bg-zinc-100">
            <div className="h-full rounded bg-zinc-800/85" style={{ width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-zinc-700">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ data }: { data: { label: string; value: number }[] }) {
  if (data.length < 2) return <Bars data={data} />;
  const vals = data.map((d) => d.value);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const W = 100, H = 28;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * W},${H - ((d.value - min) / span) * H}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full">
        <polyline points={pts} fill="none" stroke="#27272a" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{data[0].label}: {fmt(data[0].value)}</span>
        <span>{data[data.length - 1].label}: {fmt(data[data.length - 1].value)}</span>
      </div>
    </div>
  );
}

function Ranges({ rows }: { rows: RangeRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.slice(0, 8).map((r, i) => {
        const span = r.max - r.min || 1;
        const pct = (v: number) => ((v - r.min) / span) * 100;
        const boxL = r.q1 != null ? pct(r.q1) : pct(r.median);
        const boxR = r.q3 != null ? pct(r.q3) : pct(r.median);
        return (
          <div key={i} className="text-[11px]">
            {r.label ? <div className="mb-0.5 text-zinc-600">{r.label}</div> : null}
            <div className="relative h-5">
              <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-zinc-200" />
              <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-zinc-300/70" style={{ left: `${boxL}%`, width: `${Math.max(1, boxR - boxL)}%` }} />
              <div className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded bg-zinc-900" style={{ left: `${pct(r.median)}%` }} />
            </div>
            <div className="mt-0.5 flex justify-between tabular-nums text-[10px] text-zinc-400">
              <span>{fmt(r.min)}</span>
              <span className="font-medium text-zinc-700">median {fmt(r.median)}</span>
              <span>{fmt(r.max)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
