"use client";

import { useState, useMemo } from "react";
import type { Key } from "react-aria-components/Breadcrumbs";
import { Search } from "lucide-react";
import { Segment } from "@heroui-pro/react";
import { ProjectCard } from "./ProjectCard";

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

// Reuse the home page card backgrounds, alternating by kind so the wall
// reads with the same texture as the module grid.
const masterplanBackgrounds = [
  "/card-cost-planning.png",
  "/card-parametric.png",
  "/card-estimates.png",
  "/card-budget-control.png",
];
const benchmarkBackgrounds = [
  "/card-reports.png",
  "/card-instructions.png",
  "/card-change-orders.png",
  "/card-procurement.png",
];

function pickBackground(kind: ProjectKind, idx: number): string {
  const pool = kind === "Masterplan" ? masterplanBackgrounds : benchmarkBackgrounds;
  return pool[idx % pool.length];
}

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
    <div className="w-fit">
      {/* Hero — same scale + rhythm as <Greeting /> on the home page. */}
      <div className="mt-6 lg:mt-10 max-w-2xl shrink-0">
        <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-1">
          Module
        </div>
        <h1 className="text-[clamp(28px,3.6vw,46px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
          Projects<span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-lg">
          {filtered.length} of {projects.length} project
          {projects.length === 1 ? "" : "s"} — open a card to jump straight
          into CostX or the benchmarking workspace.
        </p>
      </div>

      {/* Search — sits under the hero, on its own row. */}
      <div className="mt-4 relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, developer or location"
          className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder:text-zinc-400 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.08)] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
        />
      </div>

      {/* Filter row — Segment + asset-class select. */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">

        <Segment
          selectedKey={kind}
          onSelectionChange={(key: Key) => setKind(key as ProjectKind | "All")}
        >
          {(
            [
              { id: "All", label: "All", count: counts.all },
              { id: "Masterplan", label: "Masterplan", count: counts.masterplan },
              { id: "Benchmark", label: "Benchmark", count: counts.benchmark },
            ] as const
          ).map((t) => (
            <Segment.Item key={t.id} id={t.id}>
              <Segment.Separator />
              {t.label}
              <span className="text-zinc-400 ml-1">{t.count}</span>
            </Segment.Item>
          ))}
        </Segment>

        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          className="h-9 px-2.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
        >
          {assetClassOptions.map((o) => (
            <option key={o} value={o}>
              {o === "All" ? "All asset classes" : o}
            </option>
          ))}
        </select>
      </div>

      {/* Card grid — mirrors the home page (5 cols × 2 rows on xl,
          280px tall, ~220px wide cells). */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 grid-rows-2 auto-rows-[280px]">
        {filtered.slice(0, 10).map((p, i) => (
          <div key={`${p.kind}-${p.id}`} className="w-55 h-[280px]">
            <ProjectCard
              kind={p.kind}
              name={p.name}
              assetClass={p.assetClass}
              developer={p.developer}
              city={p.city}
              country={p.country}
              totalCost={p.totalCost}
              gla={p.gla}
              href={p.href}
              backgroundImage={pickBackground(p.kind, i)}
            />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-sm text-zinc-500">
              No projects match your filters.
            </p>
          </div>
        )}
      </div>

      {/* Overflow notice — mirrors the home page's fixed-shape grid by
          only rendering the first 10 cards; remainder is hinted below. */}
      {filtered.length > 10 && (
        <p className="mt-3 text-[11px] text-zinc-500">
          Showing the first 10 of {filtered.length} matching projects. Refine
          the filters to narrow further.
        </p>
      )}
    </div>
  );
}
