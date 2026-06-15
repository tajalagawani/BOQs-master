"use client";

/**
 * 10X Suite — home / applications launcher.
 * Composition of the design-system primitives, faithful to
 * 10x-suite-launcher.html: navy radial hero (topnav + welcome + Product Suite
 * tabs) with a white "Applications" panel floating up over it.
 *
 * Search filters the application wall; the Product Suite tabs are a decorative
 * category lens (highlight only) per the current design intent.
 */
import { useMemo, useState } from "react";
import { SuiteRails, Waffle } from "./primitives";
import { SuiteTopNav } from "./SuiteTopNav";
import { SuiteTabs } from "./SuiteTabs";
import { AppLauncherCard } from "./AppLauncherCard";
import { ChatFab } from "./ChatFab";
import type { SuiteApp, SuiteTabItem } from "./types";

export function SuiteHome({
  name,
  apps,
  tabs,
}: {
  name: string;
  apps: SuiteApp[];
  tabs: SuiteTabItem[];
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState(tabs[0]?.key ?? "");

  const firstName = name.split(" ")[0] || name;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) =>
      [a.title, a.tag, ...(a.features ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [apps, search]);

  return (
    <div className="suite min-h-full bg-suite-page pb-10">
      <SuiteRails />

      <SuiteTopNav
        search={search}
        onSearch={setSearch}
        notifications={1}
        crumb={<span className="font-semibold text-[#cdd6e6]">10X</span>}
      />

      {/* ── Navy hero ───────────────────────────────────────────────────── */}
      <div className="suite-hero pb-24 pt-8">
        <h1 className="mb-8 text-center text-[30px] font-semibold tracking-[-0.01em] text-white">
          Welcome back, {firstName}
        </h1>

        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mb-3 pl-1 text-[13px] font-semibold text-[#aeb8cc]">
            Product Suite
          </div>
          <SuiteTabs tabs={tabs} value={tab} onChange={setTab} />
        </div>
      </div>

      {/* ── Applications panel (floats over the hero) ───────────────────── */}
      <div className="mx-auto max-w-[1180px] px-6">
        <div className="suite-shadow relative -mt-[60px] rounded-[22px] bg-suite-panel p-[26px] pb-[34px]">
          <div className="mb-5 flex items-center gap-3 px-1">
            <Waffle tone="dark" className="size-[26px]" />
            <h2 className="text-[21px] font-semibold tracking-[-0.01em] text-suite-ink">
              Applications
            </h2>
            <span className="text-[12px] text-suite-ink-3">
              {apps.length} application{apps.length === 1 ? "" : "s"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="grid place-items-center py-16 text-center text-[13px] text-suite-ink-3">
              No applications match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {filtered.map((app) => (
                <AppLauncherCard key={app.key} app={app} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-[1180px] px-6 text-center text-[11px] text-suite-ink-4">
        IOX · 10X product suite — pick up where you left off across every module.
      </div>

      <ChatFab />
    </div>
  );
}
