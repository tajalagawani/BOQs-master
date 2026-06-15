"use client";

import { useState, useMemo } from "react";
import type { Key } from "react-aria-components/Breadcrumbs";
import { Segment } from "@heroui-pro/react";
import { ProjectCard } from "./ProjectCard";
import { ProjectPulse } from "@/components/ProjectPulse";
import type { ProjectPulseData } from "@/lib/pulse/types";
import {
  WorkspaceShell,
  ModuleHero,
  WorkspaceSearch,
  CardGrid,
} from "@/components/workspace/WorkspaceShell";

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

export default function ProjectsClient({
  projects,
  pulse,
}: {
  projects: ProjectListEntry[];
  pulse?: ProjectPulseData;
}) {
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

  const grid = filtered.slice(0, 10);

  const controls = (
    <div className="flex flex-wrap items-center gap-2.5">
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
  );

  return (
    <WorkspaceShell
      hero={
        <ModuleHero
          title="Projects"
          subtitle={
            <>
              {filtered.length} of {projects.length} project
              {projects.length === 1 ? "" : "s"} — open a card to jump straight
              into ioMaster or the benchmarking workspace.
            </>
          }
        />
      }
      search={
        <WorkspaceSearch
          value={search}
          onChange={setSearch}
          placeholder="Search by name, developer or location"
        />
      }
      controls={controls}
      note={
        filtered.length > 10
          ? `Showing the first 10 of ${filtered.length} matching projects. Refine the filters to narrow further.`
          : undefined
      }
      sidebar={<ProjectPulse pulse={pulse} />}
    >
      <CardGrid
        isEmpty={grid.length === 0}
        emptyState="No projects match your filters."
      >
        {grid.map((p, i) => (
          <ProjectCard
            key={`${p.kind}-${p.id}`}
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
        ))}
      </CardGrid>
    </WorkspaceShell>
  );
}
