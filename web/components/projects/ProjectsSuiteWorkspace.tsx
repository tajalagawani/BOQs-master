"use client";

/**
 * Projects module home — rebuilt on the 10X Suite design system.
 * Navy topnav + hero, then a white roster panel: portfolio pulse tiles over a
 * searchable table of every project (Masterplans + Benchmarks). Faithful to the
 * ioTranslate suite workspace; preserves the original kind / asset-class filters,
 * the 10-row cap, the "showing N of M" note and every per-row datum + href.
 */
import { useMemo, useState } from "react";
import { Layers, MapPin } from "lucide-react";
import type { Key } from "react-aria-components/Breadcrumbs";
import { Segment } from "@heroui-pro/react";
import {
  SuiteRails,
  SuiteTopNav,
  SuiteHero,
  SuiteProjectPill,
  SuitePanel,
  SecBar,
  SuiteTiles,
  SuiteCard,
  SuiteCardGrid,
  ChatFab,
  type SuiteTileData,
  type SuiteCardMeta,
} from "@/components/suite";
import type { ProjectPulseData } from "@/lib/pulse/types";

// Same card textures as the ioMaster cards view, so projects read as siblings.
const cardBackgrounds = [
  "/card-cost-planning.png",
  "/card-estimates.png",
  "/card-budget-control.png",
  "/card-reports.png",
  "/card-parametric.png",
];

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

// Same formatting the original ProjectCard used — keep verbatim so numbers read
// identically in the roster.
const formatSAR = (n: number | null) => {
  if (n === null || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `SAR ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(1)}K`;
  return `SAR ${n.toLocaleString()}`;
};
const formatArea = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString()} m²`;

export function ProjectsSuiteWorkspace({
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
        searchPlaceholder="Search by name, developer or location"
        crumb={<span className="font-semibold text-[#cdd6e6]">Projects</span>}
        notifications={1}
      />

      <SuiteHero
        title="Projects"
        subtitle={
          <>
            {filtered.length} of {projects.length} project
            {projects.length === 1 ? "" : "s"} — open a row to jump straight into
            ioMaster or the benchmarking workspace.
          </>
        }
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
            <div className="flex flex-wrap items-center gap-2.5">
              <Segment
                selectedKey={kind}
                onSelectionChange={(key: Key) =>
                  setKind(key as ProjectKind | "All")
                }
              >
                {(
                  [
                    { id: "All", label: "All", count: counts.all },
                    {
                      id: "Masterplan",
                      label: "Masterplan",
                      count: counts.masterplan,
                    },
                    {
                      id: "Benchmark",
                      label: "Benchmark",
                      count: counts.benchmark,
                    },
                  ] as const
                ).map((t) => (
                  <Segment.Item key={t.id} id={t.id}>
                    <Segment.Separator />
                    {t.label}
                    <span className="text-suite-ink-4 ml-1">{t.count}</span>
                  </Segment.Item>
                ))}
              </Segment>

              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
                className="h-9 rounded-full border border-suite-line-2 bg-white px-3 text-[12.5px] text-suite-ink-2 focus:outline-none focus:ring-2 focus:ring-suite-navy/10"
              >
                {assetClassOptions.map((o) => (
                  <option key={o} value={o}>
                    {o === "All" ? "All asset classes" : o}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {tiles.length > 0 && (
          <SuiteTiles items={tiles} cols={4} className="mb-4" />
        )}

        {filtered.length > 10 && (
          <p className="mb-3 text-[12px] text-suite-ink-3">
            Showing the first 10 of {filtered.length} matching projects. Refine
            the filters to narrow further.
          </p>
        )}

        {grid.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-suite-line bg-suite-card-soft py-16 text-center text-[13px] text-suite-ink-3">
            No projects match your filters.
          </div>
        ) : (
          <SuiteCardGrid>
            {grid.map((p, i) => {
              const location = [p.city, p.country].filter(Boolean).join(", ");
              const sub = [p.developer, location].filter(Boolean).join(" · ");
              const meta = [
                p.assetClass ? { icon: Layers, text: p.assetClass } : null,
                sub ? { icon: MapPin, text: sub } : null,
              ].filter(Boolean) as SuiteCardMeta[];
              return (
                <SuiteCard
                  key={`${p.kind}-${p.id}`}
                  href={p.href}
                  title={p.name}
                  status={{
                    label: p.kind,
                    tone: p.kind === "Masterplan" ? "emerald" : "sky",
                  }}
                  meta={meta}
                  footer={[
                    { label: "GLA", value: formatArea(p.gla) },
                    { label: "Total cost", value: formatSAR(p.totalCost) },
                  ]}
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

export default ProjectsSuiteWorkspace;
