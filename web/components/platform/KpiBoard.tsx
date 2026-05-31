"use client";

import { useMemo, useState } from "react";
import { Search, X, LayoutGrid, ListFilter } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Kpi } from "@/lib/platform/kpi-types";
import type { MatrixStatus } from "@/lib/platform/matrix-types";
import { KpiCard } from "./KpiCard";

interface Props {
  kpis: Kpi[];
}

type StatusFilter = MatrixStatus | "all";
type Grouping = "component" | "status" | "phase" | "none";

const STATUS_OPTIONS: { value: StatusFilter; label: string; dot: string }[] = [
  { value: "all", label: "All", dot: "bg-zinc-400" },
  { value: "green", label: "Met", dot: "bg-emerald-500" },
  { value: "yellow", label: "Substantively met", dot: "bg-amber-400" },
  { value: "orange", label: "Weak", dot: "bg-orange-500" },
  { value: "red", label: "Deferred", dot: "bg-rose-500" },
];

const GROUPING_OPTIONS: { value: Grouping; label: string }[] = [
  { value: "component", label: "Component" },
  { value: "status", label: "Status" },
  { value: "phase", label: "Phase" },
  { value: "none", label: "None" },
];

export function KpiBoard({ kpis }: Props) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [grouping, setGrouping] = useState<Grouping>("component");

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: kpis.length,
      green: 0,
      yellow: 0,
      orange: 0,
      red: 0,
      unknown: 0,
    };
    for (const k of kpis) if (k.status in c) c[k.status as StatusFilter]++;
    return c;
  }, [kpis]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kpis.filter((k) => {
      if (status !== "all" && k.status !== status) return false;
      if (!q) return true;
      return (
        k.kpi.toLowerCase().includes(q) ||
        k.subComponent.toLowerCase().includes(q) ||
        k.component.toLowerCase().includes(q) ||
        k.weHave.toLowerCase().includes(q) ||
        k.missing.toLowerCase().includes(q)
      );
    });
  }, [kpis, status, query]);

  const groups = useMemo(() => groupKpis(filtered, grouping), [filtered, grouping]);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by KPI code, title, or text…"
            className="w-full h-9 pl-9 pr-9 text-[12.5px] bg-zinc-50 border border-zinc-200 rounded-md placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700"
              aria-label="Clear search"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full text-[11.5px] font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white ring-1 ring-zinc-900"
                    : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:text-zinc-900 hover:ring-zinc-300",
                )}
              >
                <span className={cn("size-1.5 rounded-full", opt.dot)} />
                {opt.label}
                <span
                  className={cn(
                    "tabular-nums text-[10.5px] ml-0.5",
                    active ? "text-zinc-300" : "text-zinc-400",
                  )}
                >
                  {counts[opt.value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Grouping toggle */}
        <div className="ml-auto flex items-center gap-1 bg-zinc-100 rounded-md p-0.5">
          <span className="inline-flex items-center pl-2 pr-1 text-[10.5px] text-zinc-500">
            <ListFilter className="size-3 mr-1" strokeWidth={1.75} /> Group
          </span>
          {GROUPING_OPTIONS.map((opt) => {
            const active = grouping === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setGrouping(opt.value)}
                className={cn(
                  "h-7 px-2.5 text-[11.5px] font-medium rounded transition-colors",
                  active
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
          <div className="size-10 mx-auto rounded-xl bg-zinc-100 inline-flex items-center justify-center text-zinc-500">
            <LayoutGrid className="size-4" strokeWidth={1.75} />
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">No KPIs match these filters</h3>
          <p className="mt-1 text-[11.5px] text-zinc-500">
            Try clearing the search or switching the status filter to "All".
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.title}>
              <header className="flex items-baseline justify-between mb-2.5 px-1">
                <h2 className="text-[12.5px] font-semibold text-zinc-900">
                  {g.title}
                  <span className="ml-2 text-[11px] font-normal text-zinc-500">
                    {g.items.length} {g.items.length === 1 ? "KPI" : "KPIs"}
                  </span>
                </h2>
                {g.hint && <span className="text-[10.5px] text-zinc-400">{g.hint}</span>}
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {g.items.map((k) => (
                  <KpiCard key={k.kpi} kpi={k} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function groupKpis(
  kpis: Kpi[],
  grouping: Grouping,
): { title: string; hint?: string; items: Kpi[] }[] {
  if (grouping === "none") {
    return [{ title: "All KPIs", items: kpis }];
  }
  if (grouping === "component") {
    const map = new Map<string, Kpi[]>();
    const order = new Map<string, number>();
    for (const k of kpis) {
      if (!map.has(k.component)) {
        map.set(k.component, []);
        order.set(k.component, k.componentRef);
      }
      map.get(k.component)!.push(k);
    }
    return [...map.entries()]
      .sort((a, b) => (order.get(a[0]) ?? 0) - (order.get(b[0]) ?? 0))
      .map(([component, items]) => {
        const ref = order.get(component) ?? 0;
        const green = items.filter((k) => k.status === "green").length;
        return {
          title: `${ref}. ${component}`,
          hint: `${green}/${items.length} met`,
          items,
        };
      });
  }
  if (grouping === "status") {
    const order: MatrixStatus[] = ["red", "orange", "yellow", "green"];
    const titles: Record<MatrixStatus, string> = {
      green: "🟢 Met",
      yellow: "🟡 Substantively met (PO decision deferred)",
      orange: "🟠 Weak (action required)",
      red: "🔴 Deferred (per PO)",
      unknown: "Unknown",
    };
    return order
      .map((s) => ({
        title: titles[s],
        items: kpis.filter((k) => k.status === s),
      }))
      .filter((g) => g.items.length > 0);
  }
  // phase
  const map = new Map<number, Kpi[]>();
  for (const k of kpis) {
    if (!map.has(k.phase)) map.set(k.phase, []);
    map.get(k.phase)!.push(k);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([phase, items]) => ({
      title: phase > 0 ? `Phase ${phase}` : "No phase",
      items,
    }));
}
