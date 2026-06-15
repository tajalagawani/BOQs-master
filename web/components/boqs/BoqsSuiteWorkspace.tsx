"use client";

/**
 * ioTranslate module home — rebuilt on the 10X Suite design system.
 * Navy topnav + hero, then a white roster panel: pricing-progress tiles over a
 * searchable table of every BOQ project. Faithful to procurex-step3-10x-style.html.
 */
import { useMemo, useState } from "react";
import { Plus, Upload, MapPin, FileSpreadsheet } from "lucide-react";
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
import type { BoqCardStatus } from "@/components/boqs/BoqCard";
import type { ProjectPulseData } from "@/lib/pulse/types";

// Same card textures the original BOQs wall used.
const boqBackgrounds = [
  "/card-boqs.png",
  "/card-estimates.png",
  "/card-cost-planning.png",
  "/card-reports.png",
  "/card-parametric.png",
  "/card-budget-control.png",
];

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

/** BOQ project status → suite card tone (mirrors the original BoqCard). */
const STATUS_TONE: Record<BoqCardStatus, SuiteCardTone> = {
  Active: "emerald",
  Imported: "emerald",
  Processing: "sky",
  Draft: "amber",
  Archived: "zinc",
  Failed: "rose",
};

export function BoqsSuiteWorkspace({
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
        searchPlaceholder="Search BOQs by name or file…"
        crumb={<span className="font-semibold text-[#cdd6e6]">ioTranslate</span>}
        notifications={1}
      />

      <SuiteHero
        title="Bills of Quantities"
        subtitle="Create, code and version every Bill of Quantities — IOX classifies imported BOQs to NRM, tracks pricing and keeps a full audit trail."
        right={
          pulse?.hero ? (
            <SuiteProjectPill
              label={pulse.hero.title}
              meta={pulse.hero.subtitle}
              accent="green"
            />
          ) : undefined
        }
      />

      <SuitePanel first>
        <SecBar
          title="Projects"
          count={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
          actions={
            <>
              <SuiteButton href="/boqs/create">
                <Plus className="size-4" strokeWidth={2.25} />
                New project
              </SuiteButton>
              <SuiteButton href="/boqs/import" variant="dark">
                <Upload className="size-4" strokeWidth={2} />
                Import BOQ
              </SuiteButton>
            </>
          }
        />

        {tiles.length > 0 && <SuiteTiles items={tiles} cols={4} className="mb-4" />}

        {filtered.length > 10 && (
          <p className="mb-3 text-[12px] text-suite-ink-3">
            Showing the first 10 of {filtered.length} matching BOQs.
          </p>
        )}

        {grid.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-suite-line bg-suite-card-soft py-16 text-center text-[13px] text-suite-ink-3">
            {projects.length === 0
              ? "No BOQs yet — create or import one to get started."
              : `No BOQs match “${search}”.`}
          </div>
        ) : (
          <SuiteCardGrid>
            {grid.map((p, i) => {
              const meta = [
                p.location ? { icon: MapPin, text: p.location } : null,
                p.items !== null
                  ? { icon: FileSpreadsheet, text: `${p.items.toLocaleString()} items` }
                  : null,
                p.updatedRelative ? { text: p.updatedRelative } : null,
              ].filter(Boolean) as SuiteCardMeta[];
              return (
                <SuiteCard
                  key={p.id}
                  href={p.href}
                  title={p.name}
                  status={{ label: p.status, tone: STATUS_TONE[p.status] }}
                  meta={meta}
                  footer={p.total ? [{ label: "Total", value: p.total }] : []}
                  backgroundImage={boqBackgrounds[i % boqBackgrounds.length]}
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
