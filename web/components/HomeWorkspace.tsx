"use client";

import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import { Greeting } from "@/components/Greeting";
import { ModuleCard } from "@/components/ModuleCard";
import { ProjectPulse } from "@/components/ProjectPulse";
import type { ProjectPulseData } from "@/lib/pulse/types";
import {
  WorkspaceShell,
  WorkspaceSearch,
  CardGrid,
} from "@/components/workspace/WorkspaceShell";

export interface HomeModule {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  backgroundImage?: string;
}

export function HomeWorkspace({
  name,
  modules,
  pulse,
}: {
  name: string;
  modules: HomeModule[];
  pulse?: ProjectPulseData;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [modules, search]);

  // Cap at 10 so the wall keeps its shape; the grid fills the viewport.
  const grid = filtered.slice(0, 10);

  return (
    <WorkspaceShell
      hero={<Greeting name={name} />}
      search={
        <WorkspaceSearch value={search} onChange={setSearch} placeholder="Search modules" />
      }
      sidebar={<ProjectPulse pulse={pulse} />}
    >
      <CardGrid
        isEmpty={grid.length === 0}
        emptyState={<>No modules match &ldquo;{search}&rdquo;.</>}
      >
        {grid.map((m) => (
          <ModuleCard
            key={m.title}
            icon={m.icon}
            title={m.title}
            description={m.description}
            href={m.href}
            backgroundImage={m.backgroundImage}
          />
        ))}
      </CardGrid>
    </WorkspaceShell>
  );
}
