"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ProjectPulse, type ProjectPulseAction } from "@/components/ProjectPulse";
import type { ProjectPulseData } from "@/lib/pulse/types";
import { ProcurexCard } from "./ProcurexCard";
import type { ProjectStatus } from "@/modules/procurex/projects";
import {
  WorkspaceShell,
  ModuleHero,
  WorkspaceSearch,
  CardGrid,
} from "@/components/workspace/WorkspaceShell";

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
  pulse,
}: {
  projects: ProcurexGridEntry[];
  pulse?: ProjectPulseData;
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
    <WorkspaceShell
      hero={
        <ModuleHero
          title="Procure"
          accent="X"
          subtitle={
            <>
              {filtered.length} of {projects.length} tender
              {projects.length === 1 ? "" : "s"} — open a card to continue setup,
              review bids, or check the analysis.
            </>
          }
        />
      }
      search={
        <WorkspaceSearch
          value={search}
          onChange={setSearch}
          placeholder="Search tenders by name or location"
        />
      }
      note={
        filtered.length > 10
          ? `Showing the first 10 of ${filtered.length} matching tenders.`
          : undefined
      }
      sidebar={<ProjectPulse pulse={pulse} actions={actions} />}
    >
      <CardGrid isEmpty={grid.length === 0} emptyState="No tenders match your filters.">
        {grid.map((c, i) => (
          <ProcurexCard
            key={c.id}
            name={c.name}
            status={c.status}
            location={c.location}
            bidderCount={c.bidderCount}
            deadline={c.deadline}
            href={c.href}
            backgroundImage={cardBackgrounds[i % cardBackgrounds.length]}
          />
        ))}
      </CardGrid>
    </WorkspaceShell>
  );
}
