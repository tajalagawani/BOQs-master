"use client";

/**
 * ioInsight → Library — the searchable rates catalogue, rehoused in the 10X Suite
 * shell. Navy topnav + hero, then a white suite panel that hosts the existing
 * full-height Omnium table workspace (sidebar + data table) UNCHANGED.
 *
 * The workspace (modules/rates/RatesWorkspace) is a complex data-table/grid
 * editor that owns its own search + section state and scrolls internally, so it
 * is kept exactly as-is — only its surrounding container is reskinned to suite
 * tokens. The SuiteTopNav search is wired to a local no-op state because the
 * workspace carries its own search box inside the sidebar.
 */
import { useState } from "react";
import { SuiteRails, SuiteTopNav, ChatFab } from "@/components/suite";
import { RatesWorkspace } from "@/modules/rates/RatesWorkspace";
import type { PersistedStore } from "@/modules/rates/lib/types";

type Props = {
  seedRows: Record<string, unknown>[];
  seedFilters: Record<string, string[]>;
  persisted: PersistedStore;
};

export function RatesLibrarySuiteWorkspace({
  seedRows,
  seedFilters,
  persisted,
}: Props) {
  // Topnav search — the workspace owns its own search box, so this is a local
  // no-op state purely to satisfy the controlled SuiteTopNav input.
  const [navSearch, setNavSearch] = useState("");

  return (
    // Table workspace: no big hero — the table fills the viewport under the
    // topnav at a fixed height and scrolls internally (the page itself never
    // scrolls). Full-bleed with a 4px gutter.
    <div className="suite flex h-full flex-col bg-suite-page">
      <SuiteRails />

      <SuiteTopNav
        search={navSearch}
        onSearch={setNavSearch}
        searchPlaceholder="Search rates, projects, materials…"
        crumb={<span className="font-semibold text-[#cdd6e6]">ioInsight</span>}
        notifications={1}
      />

      <div className="min-h-0 flex-1 p-1">
        <div className="h-full overflow-hidden rounded-[12px]">
          <RatesWorkspace
            seedRows={seedRows}
            seedFilters={seedFilters}
            persisted={persisted}
          />
        </div>
      </div>

      <ChatFab />
    </div>
  );
}
