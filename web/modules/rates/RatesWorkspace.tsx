"use client";

// Client wrapper that mounts the faithful Omnium shell (sidebar + table)
// inside the IOX page chrome. Owns the active-section state and the search
// box just like /Users/taj/rates/app/page.tsx — only difference is the
// outer .omnium-rates class that scopes the shadcn-style tokens.

import * as React from "react";
import { Sidebar } from "@/modules/rates/components/sidebar";
import { RatesTable } from "@/modules/rates/components/rates-table";
import { loadJson, saveJson } from "@/modules/rates/lib/persist";
import type { PersistedStore } from "@/modules/rates/lib/types";

const SECTION_KEY = "activeSection";

type Props = {
  seedRows: Record<string, unknown>[];
  seedFilters: Record<string, string[]>;
  persisted: PersistedStore;
};

export function RatesWorkspace({ seedRows, seedFilters, persisted }: Props) {
  const [search, setSearch] = React.useState("");
  const [activeSection, setActiveSection] = React.useState("Buildings");

  React.useEffect(() => {
    const saved = loadJson<string>(SECTION_KEY, "Buildings");
    if (saved) setActiveSection(saved);
  }, []);

  React.useEffect(() => {
    saveJson(SECTION_KEY, activeSection);
  }, [activeSection]);

  return (
    <div className="omnium-rates flex h-full overflow-hidden bg-white text-foreground">
      <Sidebar
        search={search}
        onSearchChange={setSearch}
        activeLabel={activeSection}
        onActiveChange={setActiveSection}
      />
      <main className="flex-1 min-w-0 overflow-hidden flex flex-col p-1.5 bg-white">
        <div className="flex-1 min-h-0 rounded-md border overflow-hidden bg-white">
          <RatesTable
            seedRows={seedRows}
            seedFilters={seedFilters}
            persisted={persisted}
            search={search}
            onSearchChange={setSearch}
            activeSection={activeSection}
          />
        </div>
      </main>
    </div>
  );
}
