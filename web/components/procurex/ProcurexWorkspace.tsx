"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
import { ProjectPulse, type ProjectPulseAction } from "@/components/ProjectPulse";
import { ProcurexCard } from "./ProcurexCard";
import type { ProjectStatus } from "@/modules/procurex/projects";

export interface ProcurexGridEntry {
  id: string;
  name: string;
  status: ProjectStatus;
  location: string | null;
  bidderCount: number;
  deadline: string | null;
  href: string;
}

const cardBackgrounds = [
  "/card-tenders.png",
  "/card-procurement.png",
  "/card-reports.png",
  "/card-instructions.png",
  "/card-budget-control.png",
  "/card-change-orders.png",
  "/card-boqs.png",
  "/card-estimates.png",
];

const actions: ProjectPulseAction[] = [
  {
    icon: <Plus className="size-4" strokeWidth={1.75} />,
    label: "Create New Tender",
    description: "Start a fresh ProcureX project.",
    href: "/procurex/projects/new",
  },
];

export function ProcurexWorkspace({
  projects,
}: {
  projects: ProcurexGridEntry[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q),
    );
  }, [projects, search]);

  const grid = filtered.slice(0, 10);

  return (
    <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 lg:gap-6">
      {/* Left column — strict no-scroll, matches the home shell. */}
      <div className="min-w-0 min-h-0 flex flex-col items-center">
        <div className="w-fit">
          {/* Hero — same scale + rhythm as <Greeting /> on the home page. */}
          <div className="mt-6 lg:mt-10 max-w-2xl shrink-0">
            <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-1">
              Module
            </div>
            <h1 className="text-[clamp(28px,3.6vw,46px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
              Procure<span style={{ color: "#60B78C" }}>X</span>
              <span style={{ color: "#60B78C" }}>.</span>
            </h1>
            <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-lg">
              {filtered.length} of {projects.length} tender
              {projects.length === 1 ? "" : "s"} — open a card to continue
              setup, review bids, or check the analysis.
            </p>
          </div>

          {/* Search — sits under the hero. */}
          <div className="mt-4 relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenders by name or location"
              className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder:text-zinc-400 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.08)] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
            />
          </div>

          {/* 5×2 wall, 220×280 cells. */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 grid-rows-2 auto-rows-[280px]">
            {grid.map((c, i) => (
              <div key={c.id} className="w-55 h-[280px]">
                <ProcurexCard
                  name={c.name}
                  status={c.status}
                  location={c.location}
                  bidderCount={c.bidderCount}
                  deadline={c.deadline}
                  href={c.href}
                  backgroundImage={cardBackgrounds[i % cardBackgrounds.length]}
                />
              </div>
            ))}

            {grid.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm text-zinc-500">
                  No tenders match your filters.
                </p>
              </div>
            )}
          </div>

          {filtered.length > 10 && (
            <p className="mt-3 text-[11px] text-zinc-500">
              Showing the first 10 of {filtered.length} matching tenders.
            </p>
          )}
        </div>

        <div className="flex-1 min-h-0" />

        {/* Footer — same as home. */}
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
              <span>Project data secured and synced in real time</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>All systems normal</span>
          </div>
        </div>
      </div>

      {/* Right column — ProjectPulse with Create New Tender action. */}
      <div className="hidden xl:flex min-h-0">
        <ProjectPulse actions={actions} />
      </div>
    </div>
  );
}
