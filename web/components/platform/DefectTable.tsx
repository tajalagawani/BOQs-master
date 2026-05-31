"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search, X, BadgeCheck, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  severityTone,
  type Defect,
  type DefectSeverity,
  type DefectState,
} from "@/lib/platform/defect-types";

interface Props {
  defects: Defect[];
}

type SortKey = "id" | "severity" | "module" | "date";

const SEV_FILTERS: { value: DefectSeverity | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const STATE_FILTERS: { value: DefectState | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const SEV_RANK: Record<DefectSeverity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
  Unknown: 4,
};

export function DefectTable({ defects }: Props) {
  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<DefectSeverity | "all">("all");
  const [state, setState] = useState<DefectState | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const modules = useMemo(() => {
    const set = new Set(defects.map((d) => d.module));
    return ["all", ...[...set].sort()];
  }, [defects]);
  const [module, setModule] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = defects.filter((d) => {
      if (sev !== "all" && d.severity !== sev) return false;
      if (state !== "all" && d.state !== state) return false;
      if (module !== "all" && d.module !== module) return false;
      if (!q) return true;
      return (
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.module.toLowerCase().includes(q) ||
        d.notes.toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = a.id.localeCompare(b.id);
      else if (sortKey === "severity") cmp = SEV_RANK[a.severity] - SEV_RANK[b.severity];
      else if (sortKey === "module") cmp = a.module.localeCompare(b.module);
      else cmp = a.date.localeCompare(b.date);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [defects, query, sev, state, module, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "date" || k === "severity" ? "desc" : "asc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="size-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, title, module, notes…"
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

        <Chips
          label="Severity"
          value={sev}
          onChange={(v) => setSev(v as DefectSeverity | "all")}
          options={SEV_FILTERS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Chips
          label="State"
          value={state}
          onChange={(v) => setState(v as DefectState | "all")}
          options={STATE_FILTERS.map((o) => ({ value: o.value, label: o.label }))}
        />
        <Chips
          label="Module"
          value={module}
          onChange={setModule}
          options={modules.map((m) => ({ value: m, label: m === "all" ? "All" : m }))}
        />

        <div className="ml-auto text-[11.5px] text-zinc-500 tabular-nums">
          {filtered.length} of {defects.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
          <div className="size-10 mx-auto rounded-xl bg-emerald-50 text-emerald-700 inline-flex items-center justify-center ring-1 ring-emerald-200">
            <BadgeCheck className="size-4" strokeWidth={1.75} />
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">No defects match these filters</h3>
          <p className="mt-1 text-[11.5px] text-zinc-500">
            {defects.length === 0
              ? "Defect log is empty."
              : "Try clearing the search or relaxing the filters."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wide">
                <tr>
                  <Th sortable onClick={() => toggleSort("id")} active={sortKey === "id"} dir={sortDir}>
                    ID
                  </Th>
                  <Th sortable onClick={() => toggleSort("severity")} active={sortKey === "severity"} dir={sortDir}>
                    Sev
                  </Th>
                  <Th sortable onClick={() => toggleSort("module")} active={sortKey === "module"} dir={sortDir}>
                    Module
                  </Th>
                  <Th>Title</Th>
                  <Th sortable onClick={() => toggleSort("date")} active={sortKey === "date"} dir={sortDir}>
                    Date
                  </Th>
                  <Th>State</Th>
                  <Th>Resolution</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((d) => {
                  const tone = severityTone(d.severity);
                  return (
                    <tr key={d.id} className="hover:bg-zinc-50/60">
                      <td className="px-3 py-2 font-mono text-[11.5px] text-zinc-900 whitespace-nowrap">
                        {d.id}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10.5px] font-medium ring-1",
                            tone.bg,
                            tone.text,
                            tone.ring,
                          )}
                        >
                          {d.severity === "Critical" && <AlertOctagon className="size-2.5" strokeWidth={2} />}
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-zinc-700">{d.module}</td>
                      <td className="px-3 py-2 max-w-[420px]">
                        <div className="text-zinc-900 line-clamp-2" title={d.title}>
                          {d.title}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums text-zinc-600 text-[11.5px]">
                        {d.date}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 h-5 text-[10.5px] font-medium ring-1",
                            d.state === "open"
                              ? "bg-rose-50 text-rose-700 ring-rose-200"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                          )}
                        >
                          {d.state === "open" ? "Open" : "Closed"}
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[300px]">
                        <div className="text-zinc-600 text-[11.5px] line-clamp-2" title={d.notes}>
                          {d.ownerOrCommit && (
                            <span className="text-zinc-500">{d.ownerOrCommit} · </span>
                          )}
                          {d.notes}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  sortable,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  if (!sortable) {
    return <th className="px-3 py-2 text-left font-medium">{children}</th>;
  }
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-zinc-900",
          active && "text-zinc-900",
        )}
      >
        {children}
        <ArrowUpDown className={cn("size-3", !active && "opacity-40")} strokeWidth={2} />
        {active && (
          <span className="text-[9px] uppercase">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}

function Chips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5 bg-zinc-100 rounded-md p-0.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-6.5 px-2 text-[11px] font-medium rounded transition-colors whitespace-nowrap",
                active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
