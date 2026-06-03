"use client";

import { useState, useMemo } from "react";
import { FilePlus2, Upload } from "lucide-react";
import { ProjectPulse, type ProjectPulseAction } from "@/components/ProjectPulse";
import type { ProjectPulseData } from "@/lib/pulse/types";
import { BoqCard, type BoqCardStatus } from "@/components/boqs/BoqCard";
import {
  WorkspaceShell,
  ModuleHero,
  WorkspaceSearch,
  CardGrid,
} from "@/components/workspace/WorkspaceShell";

export interface BoqsGridEntry {
  id: string;
  name: string;
  status: BoqCardStatus;
  location: string | null;
  items: number | null;
  total: string | null;
  updatedRelative: string | null;
  href: string;
}

// Reuse the home page card textures so the BOQs wall reads as a sibling.
const boqBackgrounds = [
  "/card-boqs.png",
  "/card-estimates.png",
  "/card-cost-planning.png",
  "/card-reports.png",
  "/card-parametric.png",
  "/card-budget-control.png",
  "/card-change-orders.png",
  "/card-procurement.png",
];

const actions: ProjectPulseAction[] = [
  {
    icon: <FilePlus2 className="size-4" strokeWidth={1.75} />,
    label: "Create New Project",
    description: "Start a blank Bill of Quantities.",
    href: "/boqs/create",
  },
  {
    icon: <Upload className="size-4" strokeWidth={1.75} />,
    label: "Import Existing BOQ",
    description: "Upload an Excel BoQ — IOX classifies it.",
    href: "/boqs/import",
  },
];

export function BoqsWorkspace({
  projects,
  pulse,
}: {
  projects: BoqsGridEntry[];
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
          title="BOQs"
          accent="X"
          subtitle={
            <>
              {filtered.length} of {projects.length} project
              {projects.length === 1 ? "" : "s"} — open a card to jump into the
              BOQ workspace.
            </>
          }
        />
      }
      search={
        <WorkspaceSearch
          value={search}
          onChange={setSearch}
          placeholder="Search BOQs by name or file"
        />
      }
      note={
        filtered.length > 10
          ? `Showing the first 10 of ${filtered.length} matching projects.`
          : undefined
      }
      sidebar={<ProjectPulse pulse={pulse} actions={actions} />}
    >
      <CardGrid isEmpty={grid.length === 0} emptyState="No BOQs match your search.">
        {grid.map((c, i) => (
          <BoqCard
            key={c.id}
            name={c.name}
            status={c.status}
            location={c.location}
            items={c.items}
            total={c.total}
            updatedRelative={c.updatedRelative}
            href={c.href}
            backgroundImage={boqBackgrounds[i % boqBackgrounds.length]}
          />
        ))}
      </CardGrid>
    </WorkspaceShell>
  );
}
