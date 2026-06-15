"use client";

/**
 * ioProcure module home — rebuilt on the 10X Suite design system.
 * Navy topnav + hero, then a white roster panel: a searchable wall of every
 * tender project, rendered with the same SuiteCard pattern as ioTranslate/ioMaster.
 */
import { useMemo, useState } from "react";
import { Plus, MapPin, Users, Clock } from "lucide-react";
import type { ProjectPulseData } from "@/lib/pulse/types";
import type { ProjectStatus } from "@/modules/procurex/projects";
import {
  SuiteRails,
  SuiteTopNav,
  SuiteHero,
  SuiteProjectPill,
  SuitePanel,
  SecBar,
  SuiteTiles,
  SuiteButton,
  SuiteCard,
  SuiteCardGrid,
  ChatFab,
  type SuiteTileData,
  type SuiteCardTone,
  type SuiteCardMeta,
} from "@/components/suite";

export interface ProcurexGridEntry {
  id: string;
  name: string;
  status: ProjectStatus;
  location: string | null;
  bidderCount: number;
  deadline: string | null;
  href: string;
}

// Same card textures the original ioProcure wall used.
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

/** Tender status → suite card tone + label (mirrors the original ProcurexCard). */
const STATUS_TONE: Record<ProjectStatus, { label: string; tone: SuiteCardTone }> = {
  draft: { label: "Draft", tone: "amber" },
  configured: { label: "Configured", tone: "sky" },
  analysing: { label: "Analysing", tone: "sky" },
  review: { label: "In review", tone: "amber" },
  reported: { label: "Reported", tone: "emerald" },
  archived: { label: "Archived", tone: "zinc" },
};

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

  const tiles: SuiteTileData[] = (pulse?.metrics ?? []).map((m) => ({
    k: m.label,
    v: m.value,
    sub: m.sub,
  }));

  return (
    <div className="suite min-h-full bg-suite-page pb-10">
      <SuiteRails />

      <SuiteTopNav
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search tenders by name or location"
        crumb={<span className="font-semibold text-[#cdd6e6]">ioProcure</span>}
        notifications={1}
      />

      <SuiteHero
        title="Procure"
        subtitle={
          <>
            {filtered.length} of {projects.length} tender
            {projects.length === 1 ? "" : "s"} — open a card to continue setup,
            review bids, or check the analysis.
          </>
        }
        right={
          pulse?.hero ? (
            <SuiteProjectPill
              label={pulse.hero.title}
              meta={pulse.hero.subtitle}
              accent="amber"
            />
          ) : undefined
        }
      />

      <SuitePanel first>
        <SecBar
          title="Tenders"
          count={`${projects.length} tender${projects.length === 1 ? "" : "s"}`}
          actions={
            <SuiteButton href="/procurex/projects/new">
              <Plus className="size-4" strokeWidth={2.25} />
              Create New Tender
            </SuiteButton>
          }
        />

        {tiles.length > 0 && <SuiteTiles items={tiles} cols={4} className="mb-4" />}

        {filtered.length > 10 && (
          <p className="mb-3 text-[12px] text-suite-ink-3">
            Showing the first 10 of {filtered.length} matching tenders.
          </p>
        )}

        {grid.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-suite-line bg-suite-card-soft py-16 text-center text-[13px] text-suite-ink-3">
            No tenders match your filters.
          </div>
        ) : (
          <SuiteCardGrid>
            {grid.map((c, i) => {
              const tone = STATUS_TONE[c.status];
              const meta = [
                c.location ? { icon: MapPin, text: c.location } : null,
                {
                  icon: Users,
                  text: `${c.bidderCount} ${c.bidderCount === 1 ? "bidder" : "bidders"}`,
                },
                c.deadline ? { icon: Clock, text: `Deadline ${c.deadline}` } : null,
              ].filter(Boolean) as SuiteCardMeta[];
              return (
                <SuiteCard
                  key={c.id}
                  href={c.href}
                  title={c.name}
                  status={{ label: tone.label, tone: tone.tone }}
                  meta={meta}
                  openLabel={c.status === "draft" ? "Continue setup" : "Open tender"}
                  backgroundImage={cardBackgrounds[i % cardBackgrounds.length]}
                />
              );
            })}
          </SuiteCardGrid>
        )}
      </SuitePanel>

      <ChatFab />
    </div>
  );
}
