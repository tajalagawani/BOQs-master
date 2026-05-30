"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, MapPin, Building2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ProjectKind = "Masterplan" | "Benchmark";

export interface ProjectListEntry {
  id: string;
  kind: ProjectKind;
  name: string;
  assetClass: string | null;
  developer: string | null;
  country: string | null;
  city: string | null;
  totalCost: number | null;
  gla: number | null;
  status: string | null;
  updatedAt: Date;
  href: string;
}

const formatSAR = (n: number | null) => {
  if (n === null || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `SAR ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(1)}K`;
  return `SAR ${n.toLocaleString()}`;
};
const formatArea = (n: number | null) => (n === null ? "—" : `${n.toLocaleString()} m²`);

export default function ProjectsClient({ projects }: { projects: ProjectListEntry[] }) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<ProjectKind | "All">("All");
  const [assetClass, setAssetClass] = useState<string>("All");

  const assetClassOptions = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => p.assetClass && s.add(p.assetClass));
    return ["All", ...Array.from(s).sort()];
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (kind !== "All" && p.kind !== kind) return false;
      if (assetClass !== "All" && p.assetClass !== assetClass) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.developer ?? "").toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q)
      );
    });
  }, [projects, search, kind, assetClass]);

  const counts = {
    all: projects.length,
    masterplan: projects.filter((p) => p.kind === "Masterplan").length,
    benchmark: projects.filter((p) => p.kind === "Benchmark").length,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Projects</h1>
        <p className="text-xs text-zinc-500 mt-1">
          {filtered.length} of {projects.length} project{projects.length === 1 ? "" : "s"}
        </p>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, developer, or location"
            className="w-full h-10 pl-10 pr-3 bg-white border border-zinc-200 rounded-lg text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
          />
        </div>

        <div className="inline-flex bg-zinc-100 rounded-lg p-0.5">
          {(["All", "Masterplan", "Benchmark"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={cn(
                "h-9 px-3 text-xs font-medium rounded-md transition-colors",
                kind === k ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {k}{" "}
              <span className="text-zinc-400 ml-1">
                {k === "All" ? counts.all : k === "Masterplan" ? counts.masterplan : counts.benchmark}
              </span>
            </button>
          ))}
        </div>

        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className="h-10 px-3 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          {assetClassOptions.map((o) => (
            <option key={o} value={o}>
              {o === "All" ? "All asset classes" : o}
            </option>
          ))}
        </select>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <Link
            key={`${p.kind}-${p.id}`}
            href={p.href}
            className="group bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    p.kind === "Masterplan"
                      ? "bg-zinc-900 text-white"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                  )}
                >
                  {p.kind === "Masterplan" ? (
                    <Building2 className="size-3" strokeWidth={2} />
                  ) : (
                    <BarChart3 className="size-3" strokeWidth={2} />
                  )}
                  {p.kind}
                </span>
                <h3 className="text-sm font-semibold text-zinc-900 mt-2 line-clamp-2 group-hover:text-zinc-700">
                  {p.name}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {p.developer && (
                <div className="text-xs text-zinc-600 truncate">{p.developer}</div>
              )}
              {(p.city || p.country) && (
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="size-3" strokeWidth={1.75} />
                  <span>{[p.city, p.country].filter(Boolean).join(", ")}</span>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100">
              <div>
                <div className="text-[10px] uppercase text-zinc-400 font-medium">GLA</div>
                <div className="text-xs font-semibold text-zinc-800">{formatArea(p.gla)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-zinc-400 font-medium">Total cost</div>
                <div className="text-xs font-semibold text-zinc-800">{formatSAR(p.totalCost)}</div>
              </div>
            </div>

            {p.assetClass && (
              <div className="mt-3 inline-flex bg-zinc-100 text-zinc-700 text-[10px] font-medium px-2 py-0.5 rounded">
                {p.assetClass}
              </div>
            )}
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-sm text-zinc-500">No projects match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
