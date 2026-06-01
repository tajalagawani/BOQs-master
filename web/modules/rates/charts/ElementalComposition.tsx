"use client";

// Elemental-by-Project · Composition view.
// One vertical stacked bar per project; segments = NRM L1 elements; value =
// cost per m² (BUA / GIA / GFA), optionally inflation-adjusted. A "100%" toggle
// switches the y-axis to share-of-total. A persistent, clickable legend lets the
// officer isolate elements; clicking a bar opens the project detail drawer.

import { useEffect, useMemo, useRef, useState } from "react";
import { ComposedChart, ChartTooltip } from "@heroui-pro/react";
import { Brush } from "recharts";
import type { ElementalProject } from "@/modules/rates/lib/db/queries";
import {
  type Basis,
  projectElementValues,
  projectTotal,
  compactNumber,
  fmt,
} from "@/modules/rates/charts/elemental-data";
import { elementColor, sortElements } from "@/modules/rates/charts/elemental-palette";

interface Props {
  projects: ElementalProject[];
  basis: Basis;
  refYear: number;
  inflationOn: boolean;
  normalized: boolean;
  currency: string;
  onSelectProject?: (projectId: string) => void;
}

export function ElementalComposition({
  projects,
  basis,
  refYear,
  inflationOn,
  normalized,
  currency,
  onSelectProject,
}: Props) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // Measure the chart area so the bars fill the available height (no scroll).
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartH, setChartH] = useState(380);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setChartH(Math.max(220, el.clientHeight)));
    ro.observe(el);
    setChartH(Math.max(220, el.clientHeight));
    return () => ro.disconnect();
  }, []);

  const { rows, elements } = useMemo(() => {
    const present = new Set<string>();
    const built = projects
      .map((p) => {
        const vals = projectElementValues(p, basis, refYear, inflationOn);
        vals.forEach((v) => present.add(v.label));
        const map = new Map(vals.map((v) => [v.label, v.value]));
        return { p, map, total: projectTotal(vals) };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);

    const elements = sortElements([...present]);
    const rows = built.map(({ p, map, total }) => {
      const row: Record<string, number | string> = {
        projectId: p.projectId,
        project: p.project.length > 24 ? p.project.slice(0, 24) + "…" : p.project,
        fullProject: p.project,
        baseYear: p.baseYear ?? 0,
        currency: p.currency ?? currency,
        __total: total,
      };
      for (const el of elements) {
        const v = map.get(el) ?? 0;
        row[el] = v;
        row[`${el}__pct`] = total > 0 ? Math.round((v / total) * 1000) / 10 : 0;
      }
      return row;
    });
    return { rows, elements };
  }, [projects, basis, refYear, inflationOn, currency]);

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center h-full text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-white/70">
        No project benchmarks match the current filters.
      </div>
    );
  }

  const toggle = (el: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(el)) next.delete(el);
      else next.add(el);
      return next;
    });
  const isolate = (el: string) =>
    setHidden((prev) => {
      // Click-to-isolate: if already isolated to this element, clear.
      const others = elements.filter((e) => e !== el);
      const alreadyIsolated = others.every((e) => prev.has(e)) && !prev.has(el);
      return alreadyIsolated ? new Set() : new Set(others);
    });

  const yFormatter = (v: number) => (normalized ? `${v}%` : compactNumber(v));
  const unit = normalized ? "% of project total" : `${currency}/m² · ${basis}`;
  const manyBars = rows.length > 40;
  const brushEnd = Math.min(rows.length - 1, manyBars ? 23 : rows.length - 1);

  /* ── Tooltip ─────────────────────────────────────────────── */
  const renderTooltip = ({
    active,
    label,
    payload,
  }: {
    active?: boolean;
    label?: string;
    payload?: Array<{
      name?: string;
      value?: number;
      color?: string;
      fill?: string;
      dataKey?: string | number;
      payload?: Record<string, number | string>;
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const meta = payload[0]?.payload ?? {};
    const total = Number(meta.__total ?? 0);
    const cur = (meta.currency as string) || currency;

    const items = payload
      .map((p) => {
        const key = String(p.dataKey ?? "");
        const el = key.endsWith("__pct") ? key.slice(0, -5) : key;
        const abs = Number(meta[el] ?? 0);
        return { el, abs, color: p.color ?? p.fill };
      })
      .filter((it) => it.abs > 0)
      .sort((a, b) => b.abs - a.abs);
    if (items.length === 0) return null;

    return (
      <ChartTooltip indicator="line">
        <ChartTooltip.Header>
          {(meta.fullProject as string) || label}
          {meta.baseYear ? (
            <span className="text-muted text-[10px] ml-1.5 font-normal">· {meta.baseYear}</span>
          ) : null}
        </ChartTooltip.Header>
        {items.map((it, i) => (
          <ChartTooltip.Item key={i}>
            <ChartTooltip.Indicator color={it.color} />
            <ChartTooltip.Label>{it.el}</ChartTooltip.Label>
            <ChartTooltip.Value>
              {cur} {fmt(it.abs)}
              {total > 0 ? (
                <span className="text-muted ml-1">({Math.round((it.abs / total) * 100)}%)</span>
              ) : null}
            </ChartTooltip.Value>
          </ChartTooltip.Item>
        ))}
        <div className="border-separator mt-1 flex items-center justify-between border-t pt-1.5">
          <span className="text-muted text-xs font-medium">Total ({basis})</span>
          <span className="text-foreground text-xs font-semibold tabular-nums">
            {cur} {fmt(total)}
          </span>
        </div>
      </ChartTooltip>
    );
  };

  const anyHidden = hidden.size > 0;

  return (
    <div className="w-full h-full flex flex-col bg-white/85 backdrop-blur-[1px] border border-zinc-200/70 rounded-2xl px-4 pt-3 pb-2 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.05)] overflow-hidden">
      <div className="shrink-0 flex items-center justify-between mb-1">
        <span className="text-[11px] text-zinc-500">
          {rows.length} {rows.length === 1 ? "project" : "projects"} · sorted by total
        </span>
        <span className="text-[11px] font-medium text-zinc-600 tabular-nums">{unit}</span>
      </div>

      <div ref={chartRef} className="flex-1 min-h-0">
      <ComposedChart data={rows} height={chartH}>
        <ComposedChart.Grid vertical={false} />
        <ComposedChart.XAxis
          dataKey="project"
          tickMargin={8}
          angle={-35}
          textAnchor="end"
          height={96}
          interval={manyBars ? "preserveStartEnd" : 0}
          tick={{ fontSize: 10, fill: "#52525b" }}
        />
        <ComposedChart.YAxis
          tickFormatter={yFormatter}
          width={48}
          domain={normalized ? [0, 100] : undefined}
          allowDataOverflow={normalized}
          tick={{ fontSize: 11, fill: "#52525b" }}
        />
        {elements.map((el, i) => (
          <ComposedChart.Bar
            key={el}
            dataKey={normalized ? `${el}__pct` : el}
            name={el}
            fill={elementColor(el)}
            stackId="e"
            hide={hidden.has(el)}
            maxBarSize={40}
            radius={i === elements.length - 1 ? [3, 3, 0, 0] : undefined}
            cursor="pointer"
            onClick={(_d: unknown, index: number) =>
              onSelectProject?.(rows[index]?.projectId as string)
            }
          />
        ))}
        <ComposedChart.Tooltip content={renderTooltip} />
        {manyBars ? (
          <Brush
            dataKey="project"
            height={24}
            stroke="#60B78C"
            fill="rgba(96, 183, 140, 0.08)"
            travellerWidth={10}
            startIndex={0}
            endIndex={brushEnd}
          />
        ) : null}
      </ComposedChart>
      </div>

      {/* ── Legend (click = isolate, ⌥/long = toggle) ──────────── */}
      <div className="shrink-0 mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-zinc-100 pt-2 max-h-[112px] overflow-y-auto">
        {elements.map((el) => {
          const off = hidden.has(el);
          return (
            <button
              key={el}
              type="button"
              onClick={(e) => (e.altKey ? toggle(el) : isolate(el))}
              title={off ? "Hidden — click to show" : "Click to isolate · ⌥-click to hide"}
              className={
                "inline-flex items-center gap-1.5 text-[10.5px] leading-none transition-opacity " +
                (off ? "opacity-35 line-through" : "opacity-100 hover:opacity-70")
              }
            >
              <span
                className="size-2.5 rounded-[3px] shrink-0"
                style={{ backgroundColor: elementColor(el) }}
              />
              <span className="text-zinc-700">{el}</span>
            </button>
          );
        })}
        {anyHidden ? (
          <button
            type="button"
            onClick={() => setHidden(new Set())}
            className="text-[10.5px] text-zinc-500 underline underline-offset-2 hover:text-zinc-900 ml-1"
          >
            Show all
          </button>
        ) : null}
      </div>
    </div>
  );
}
