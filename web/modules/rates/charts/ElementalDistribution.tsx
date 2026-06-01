"use client";

// Elemental-by-Project · Distribution view.
// One row per NRM L1 element, on a SHARED LOG x-axis — because building
// elements (hundreds/m²), infra elements (tens/m²) and the Unclassified
// residual (thousands/m²) span three orders of magnitude and can't share a
// linear axis. Each row shows a min–max whisker, IQR band, every project as a
// dot, and the median marker; the absolute median is in the right column.
// Rows flex to fill the height — no scrolling. Click a dot → drawer.

import { useMemo } from "react";
import type { ElementalProject } from "@/modules/rates/lib/db/queries";
import {
  type Basis,
  projectElementValues,
  quartiles,
  fmt,
} from "@/modules/rates/charts/elemental-data";
import { elementColor, sortElements } from "@/modules/rates/charts/elemental-palette";

interface Props {
  projects: ElementalProject[];
  basis: Basis;
  refYear: number;
  inflationOn: boolean;
  currency: string;
  onSelectProject?: (projectId: string) => void;
}

interface Point {
  projectId: string;
  project: string;
  value: number;
}

const LABEL_W = 188;
const VALUE_W = 60;
const PAD = 4; // % padding at each end of the track

function tickLabel(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(v % 1_000 ? 1 : 0).replace(/\.0$/, "") + "k";
  return `${Math.round(v)}`;
}

function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 7) - 3) * 2; // ±6px, deterministic
}

export function ElementalDistribution({
  projects,
  basis,
  refYear,
  inflationOn,
  currency,
  onSelectProject,
}: Props) {
  const { rows, logMin, logMax, ticks, maxN } = useMemo(() => {
    const byElement = new Map<string, Point[]>();
    let gMin = Infinity;
    let gMax = 0;
    for (const p of projects) {
      for (const v of projectElementValues(p, basis, refYear, inflationOn)) {
        const arr = byElement.get(v.label) ?? [];
        arr.push({ projectId: p.projectId, project: p.project, value: v.value });
        byElement.set(v.label, arr);
        if (v.value > 0) {
          gMin = Math.min(gMin, v.value);
          gMax = Math.max(gMax, v.value);
        }
      }
    }
    if (!isFinite(gMin)) gMin = 1;
    gMin = Math.max(1, gMin);
    gMax = Math.max(gMax, gMin * 10); // guarantee at least one decade of range

    const labels = sortElements([...byElement.keys()]);
    let maxN = 0;
    const rows = labels.map((label) => {
      const points = byElement.get(label)!;
      maxN = Math.max(maxN, points.length);
      return { label, points, q: quartiles(points.map((p) => p.value))! };
    });

    const logMin = Math.log10(gMin);
    const logMax = Math.log10(gMax);
    const lo = Math.floor(logMin);
    const hi = Math.ceil(logMax);
    const ticks: number[] = [];
    for (let k = lo; k <= hi; k++) ticks.push(10 ** k);
    return { rows, logMin, logMax, ticks, maxN };
  }, [projects, basis, refYear, inflationOn]);

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center h-full text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-white/70">
        No project benchmarks match the current filters.
      </div>
    );
  }

  const span = logMax - logMin;
  const pos = (v: number) => {
    if (v <= 0 || span <= 0) return PAD;
    const c = Math.min(Math.max(Math.log10(v), logMin), logMax);
    return PAD + ((c - logMin) / span) * (100 - 2 * PAD);
  };
  const single = maxN <= 1;

  return (
    <div className="w-full h-full flex flex-col bg-white/85 backdrop-blur-[1px] border border-zinc-200/70 rounded-2xl px-4 pt-3 pb-3 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.05)] overflow-hidden">
      <div className="shrink-0 flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-zinc-500">
          {rows.length} elements · log scale ·{" "}
          {single ? "single project" : `up to ${maxN} projects`}
        </span>
        <span className="text-[11px] font-medium text-zinc-600 tabular-nums">
          {currency}/m² · {basis}
        </span>
      </div>

      {single ? (
        <p className="shrink-0 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 mb-1.5">
          Showing one project — select more from the left to compare each element’s spread.
        </p>
      ) : null}

      {/* gridlines + ruler + rows share one positioned wrapper */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* vertical decade gridlines */}
        <div className="absolute top-5 bottom-0 pointer-events-none" style={{ left: LABEL_W, right: VALUE_W }}>
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 w-px bg-zinc-100"
              style={{ left: `${pos(t)}%` }}
            />
          ))}
        </div>

        {/* ruler */}
        <div className="shrink-0 flex items-stretch text-[10px] text-zinc-400 h-5">
          <div style={{ width: LABEL_W }} className="shrink-0">
            Element
          </div>
          <div className="relative flex-1">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${pos(t)}%` }}
              >
                {tickLabel(t)}
              </span>
            ))}
          </div>
          <div style={{ width: VALUE_W }} className="shrink-0 text-right pr-0.5">
            median
          </div>
        </div>

        {/* rows fill remaining height */}
        <div className="flex-1 min-h-0 flex flex-col">
          {rows.map(({ label, points, q }) => {
            const color = elementColor(label);
            return (
              <div
                key={label}
                className="flex-1 min-h-0 flex items-center rounded-md hover:bg-zinc-50/70 group"
              >
                {/* label */}
                <div style={{ width: LABEL_W }} className="shrink-0 pr-3 flex items-center gap-1.5 min-w-0">
                  <span className="size-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-zinc-700 truncate">{label}</span>
                  {!single ? (
                    <span className="text-[10px] text-zinc-400 tabular-nums shrink-0 ml-auto">
                      n={q.n}
                    </span>
                  ) : null}
                </div>

                {/* track */}
                <div className="relative flex-1 h-full min-h-0">
                  {!single && q.n > 1 ? (
                    <>
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-px bg-zinc-300"
                        style={{ left: `${pos(q.min)}%`, width: `${pos(q.max) - pos(q.min)}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 rounded-[3px] opacity-25"
                        style={{
                          left: `${pos(q.q1)}%`,
                          width: `${Math.max(pos(q.q3) - pos(q.q1), 0.6)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </>
                  ) : null}
                  {points.map((pt, pi) => (
                    <button
                      key={`${pt.projectId}-${pi}`}
                      type="button"
                      onClick={() => onSelectProject?.(pt.projectId)}
                      title={`${pt.project} · ${currency} ${fmt(pt.value)}`}
                      className="absolute size-[7px] rounded-full ring-[1.5px] ring-white hover:scale-150 hover:z-10 transition-transform cursor-pointer"
                      style={{
                        left: `${pos(pt.value)}%`,
                        top: `calc(50% + ${jitter(pt.projectId)}px)`,
                        transform: "translate(-50%, -50%)",
                        backgroundColor: color,
                      }}
                    />
                  ))}
                  {!single && q.n > 1 ? (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full ring-2 ring-white shadow-sm pointer-events-none"
                      style={{ left: `${pos(q.median)}%`, marginLeft: -5, backgroundColor: color }}
                    />
                  ) : null}
                </div>

                {/* median value */}
                <div
                  style={{ width: VALUE_W }}
                  className="shrink-0 text-right pr-0.5 text-[11px] tabular-nums text-zinc-700"
                >
                  {tickLabel(q.median)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 mt-1.5 pt-1.5 border-t border-zinc-100 flex items-center gap-4 text-[10px] text-zinc-400">
        {!single ? (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-2.5 rounded-[3px] bg-zinc-400 opacity-25" /> IQR
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-2.5 rounded-full ring-2 ring-white bg-zinc-500" /> median
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-[7px] rounded-full bg-zinc-500" /> project · click to open
            </span>
          </>
        ) : null}
        <span className="ml-auto">logarithmic axis · {currency}/m² · {basis}</span>
      </div>
    </div>
  );
}
