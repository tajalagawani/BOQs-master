"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import {
  Search,
  ShieldCheck,
  Library,
  Thermometer,
  PieChart,
  TrendingUp,
  GitCompare,
  Boxes,
  Sparkles,
  History,
  AlertOctagon,
  Map as MapIcon,
} from "lucide-react";
import { RateModuleCard } from "./RateModuleCard";
import type { RatesHomeMetrics } from "@/modules/rates/lib/db/queries";

interface CardDef {
  id: string;
  title: string;
  description: string;
  href?: string;
  metric?: string;
  icon: ReactNode;
  backgroundImage?: string;
  accent?: "emerald" | "zinc";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function RatesHomeWorkspace({ metrics }: { metrics: RatesHomeMetrics }) {
  const [search, setSearch] = useState("");

  const cards: CardDef[] = useMemo(
    () => [
      {
        id: "library",
        title: "Rates Library",
        description: "Browse every priced item, benchmark and material across all 11 sections — filterable, sortable, exportable.",
        href: "/rates/library",
        metric: `${fmt(metrics.rateItems)} items`,
        icon: <Library className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-estimates.png",
      },
      {
        id: "elemental",
        title: "GIA, GFA & BUA Elemental by Project",
        description: "Per-m² cost breakdown by NRM L1 element, project by project — with optional inflation adjustment.",
        href: "/rates/elemental-by-project",
        metric: `${metrics.projects} projects`,
        icon: <Thermometer className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-reports.png",
      },
      {
        id: "benchmarks",
        title: "Benchmark Roll-ups",
        description: "NRM L1 cost-share plus per-project stacks — where the money goes, project by project.",
        icon: <PieChart className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-cost-planning.png",
        accent: "zinc",
      },
      {
        id: "materials",
        title: "Material Trends",
        description: "Price-over-time line for cement, steel, fuel — rebased to an index or shown in raw currency.",
        icon: <TrendingUp className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-budget-control.png",
        accent: "zinc",
      },
      {
        id: "comparator",
        title: "Project Comparator",
        description: "Pick two projects and compare their NRM L1 stacks plus key cost-per-area ratios side by side.",
        icon: <GitCompare className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-parametric.png",
        accent: "zinc",
      },
      {
        id: "catalogue",
        title: "Materials Catalogue",
        description: "Every material spec on file with its latest price, vintage and source — the materials dictionary.",
        icon: <Boxes className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-procurement.png",
        accent: "zinc",
      },
      {
        id: "ai",
        title: "AI Assistant",
        description: "Ask the rates database in plain English — typical façade rate, mid-rise residential, KSA, 2024.",
        icon: <Sparkles className="size-4" strokeWidth={1.75} />,
        href: "/rates/assistant",
        backgroundImage: "/card-instructions.png",
        accent: "zinc",
      },
      {
        id: "lineage",
        title: "Upload Lineage",
        description: "Per-file audit trail — what was uploaded, parsed, loaded or failed, by whom and when.",
        icon: <History className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-change-orders.png",
        accent: "zinc",
      },
      {
        id: "outliers",
        title: "Outlier Inspector",
        description: "Rows the engine flagged as more than 2σ from their typology median — what to triage next.",
        icon: <AlertOctagon className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-tenders.png",
        accent: "zinc",
      },
      {
        id: "coverage",
        title: "Coverage Map",
        description: "How many projects do we have per (asset class, country, year)? Spot the gaps before benchmarking.",
        icon: <MapIcon className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-boqs.png",
        accent: "zinc",
      },
    ],
    [metrics],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [cards, search]);

  return (
    <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 lg:gap-6">
      {/* Left column — same shape as the other module home pages. */}
      <div className="min-w-0 min-h-0 flex flex-col items-center">
        <div className="w-fit">
          {/* Hero */}
          <div className="mt-6 lg:mt-10 max-w-2xl shrink-0">
            <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-1">
              Module
            </div>
            <h1 className="text-[clamp(28px,3.6vw,46px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
              Rates<span style={{ color: "#60B78C" }}>X</span>
              <span style={{ color: "#60B78C" }}>.</span>
            </h1>
            <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-lg">
              {metrics.sections} sections · {metrics.tabs} tabs ·{" "}
              {fmt(metrics.rateItems)} priced items ·{" "}
              {metrics.projects} projects
              {metrics.latestUploadAt && (
                <>
                  {" "}· last upload{" "}
                  {new Date(metrics.latestUploadAt).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </>
              )}
            </p>
          </div>

          {/* Search */}
          <div className="mt-4 relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rates, projects, materials…"
              className="w-full h-10 pl-9 pr-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder:text-zinc-400 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.08)] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
            />
          </div>

          {/* 5×2 wall */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 grid-rows-2 auto-rows-[280px]">
            {filtered.slice(0, 10).map((c) => (
              <div key={c.id} className="w-55 h-[280px]">
                <RateModuleCard
                  title={c.title}
                  description={c.description}
                  href={c.href}
                  metric={c.metric}
                  icon={c.icon}
                  backgroundImage={c.backgroundImage}
                  accent={c.accent}
                />
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-zinc-500">
                  No cards match &ldquo;{search}&rdquo;.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0" />

        {/* Footer */}
        <div className="shrink-0 self-stretch flex items-center justify-between text-[10.5px] text-zinc-500 px-1 pt-2">
          <div className="flex items-center gap-2.5">
            <Image
              src="/iox-logo.svg"
              alt="IOX"
              width={1338}
              height={461}
              className="h-4 w-auto"
            />
            <span className="text-zinc-300">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-zinc-500" strokeWidth={1.75} />
              <span>Rates data secured and synced in real time</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>{metrics.uploads} uploads on record</span>
          </div>
        </div>
      </div>

      {/* Right column — reserved for the ProjectPulse sidebar. */}
      <div className="hidden xl:flex min-h-0">
        <div className="flex-1 bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">
            Data freshness
          </div>
          <DataFreshnessPanel metrics={metrics} />
        </div>
      </div>
    </div>
  );
}

function DataFreshnessPanel({ metrics }: { metrics: RatesHomeMetrics }) {
  const rows = [
    { label: "Rate items", value: metrics.rateItems },
    { label: "Project benchmarks", value: metrics.benchmarks },
    { label: "Material prices", value: metrics.materialPrices },
    { label: "Design ratios", value: metrics.designRatios },
    { label: "Projects", value: metrics.projects },
    { label: "Uploads", value: metrics.uploads },
  ];
  return (
    <div className="flex flex-col gap-2.5 text-[12.5px]">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between border-b border-zinc-100 pb-1.5 last:border-0"
        >
          <span className="text-zinc-600">{r.label}</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {r.value.toLocaleString()}
          </span>
        </div>
      ))}
      {metrics.latestUploadAt && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Latest upload —{" "}
          {new Date(metrics.latestUploadAt).toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
