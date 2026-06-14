"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Search,
  X,
  ExternalLink,
  Server,
  HardDrive,
  Network,
  ShieldCheck,
  Activity,
  Globe2,
  Database,
  KeyRound,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { AzureResource } from "@/lib/platform/infrastructure";

interface Props {
  resources: AzureResource[];
}

type SortKey = "name" | "typeLabel" | "location";

const ICONS: Record<string, React.ReactNode> = {
  "Virtual machine": <Server className="size-3.5" strokeWidth={1.75} />,
  "Managed disk": <HardDrive className="size-3.5" strokeWidth={1.75} />,
  "Network interface": <Network className="size-3.5" strokeWidth={1.75} />,
  "Network security group": <ShieldCheck className="size-3.5" strokeWidth={1.75} />,
  "Public IP address": <Globe2 className="size-3.5" strokeWidth={1.75} />,
  "Virtual network": <Network className="size-3.5" strokeWidth={1.75} />,
  "Log Analytics workspace": <Activity className="size-3.5" strokeWidth={1.75} />,
  "Data collection rule": <Activity className="size-3.5" strokeWidth={1.75} />,
  "Data collection endpoint": <Activity className="size-3.5" strokeWidth={1.75} />,
  "SSH public key": <KeyRound className="size-3.5" strokeWidth={1.75} />,
  "Storage account": <Database className="size-3.5" strokeWidth={1.75} />,
};

export function ResourceTable({ resources }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("typeLabel");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const types = useMemo(() => {
    const s = new Set(resources.map((r) => r.typeLabel));
    return ["all", ...[...s].sort()];
  }, [resources]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = resources.filter((r) => {
      if (type !== "all" && r.typeLabel !== type) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        Object.entries(r.tags).some(
          ([k, v]) =>
            k.toLowerCase().includes(q) || (v ?? "").toLowerCase().includes(q),
        )
      );
    });
    rows = [...rows].sort((a, b) => {
      const cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [resources, query, type, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-suite-line rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="size-3.5 text-suite-ink-4 absolute left-3 top-1/2 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, type, tag…"
            className="w-full h-9 pl-9 pr-9 text-[12.5px] bg-suite-card-soft border border-suite-line rounded-md placeholder:text-suite-ink-4 focus:outline-none focus:ring-2 focus:ring-suite-navy/10 focus:border-suite-line-2"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center text-suite-ink-4 hover:text-suite-ink-2"
              aria-label="Clear search"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1.5">
          <span className="text-[10.5px] uppercase tracking-wide text-suite-ink-3 font-medium">
            <Layers className="inline size-3 mr-1" strokeWidth={1.75} /> Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-7 px-2 text-[11.5px] bg-suite-card-soft rounded-md border-0 focus:ring-2 focus:ring-suite-navy/10 max-w-[220px]"
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-[11.5px] text-suite-ink-3 suite-num">
          {filtered.length} of {resources.length}
        </div>
      </div>

      <div className="suite-tbl bg-white">
        <table className="w-full text-[12.5px]">
          <thead className="bg-suite-card-soft border-b border-suite-line text-suite-ink-3 text-[11px] uppercase tracking-wide">
            <tr>
              <Th sortable onClick={() => toggleSort("typeLabel")} active={sortKey === "typeLabel"} dir={sortDir}>
                Type
              </Th>
              <Th sortable onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                Name
              </Th>
              <Th sortable onClick={() => toggleSort("location")} active={sortKey === "location"} dir={sortDir}>
                Location
              </Th>
              <Th>Tags</Th>
              <Th>SKU</Th>
              <Th>Portal</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-suite-line-soft">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-suite-card-soft">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 text-suite-ink-2">
                    <span className="size-7 rounded-lg bg-suite-card-soft inline-flex items-center justify-center text-suite-ink-2">
                      {ICONS[r.typeLabel] ?? <Layers className="size-3.5" strokeWidth={1.75} />}
                    </span>
                    {r.typeLabel}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-medium text-suite-ink max-w-[280px]">
                  <div className="truncate" title={r.name}>
                    {r.name}
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-suite-ink-2">{r.location}</td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
                    {Object.entries(r.tags).length === 0 ? (
                      <span className="text-[10.5px] text-suite-ink-4">—</span>
                    ) : (
                      Object.entries(r.tags).map(([k, v]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 text-[10.5px] bg-suite-neut-bg rounded px-1.5 py-0.5"
                          title={`${k}=${v}`}
                        >
                          <span className="text-suite-ink-3">{k}</span>
                          <span className="text-suite-ink font-medium">{v}</span>
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-suite-ink-2 text-[11.5px] suite-num">
                  {r.sku ?? "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <a
                    href={r.portalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-suite-ink-2 hover:text-suite-ink"
                  >
                    Open <ExternalLink className="size-2.5" strokeWidth={2} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  if (!sortable) return <th className="px-3 py-2 text-left font-medium">{children}</th>;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-suite-ink",
          active && "text-suite-ink",
        )}
      >
        {children}
        <ArrowUpDown className={cn("size-3", !active && "opacity-40")} strokeWidth={2} />
        {active && <span className="text-[9px]">{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}
