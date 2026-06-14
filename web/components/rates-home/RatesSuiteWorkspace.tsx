"use client";

/**
 * RatesX module home — rebuilt on the 10X Suite design system.
 * Navy topnav + hero, then a white panel: data-freshness tiles over a grid of
 * the eleven RatesX feature cards (each a navigation entry). Modeled on
 * BoqsSuiteWorkspace.tsx. The original is fundamentally card/navigation based,
 * so cards are kept but rebuilt with suite tokens; the DataFreshnessPanel
 * sidebar metrics fold into <SuiteTiles>.
 */
import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Library,
  Thermometer,
  PieChart,
  TrendingUp,
  GitCompare,
  Boxes,
  Sparkles,
  History,
  AlertOctagon,
  Map as MapIcon,
} from "lucide-react";
import type { RatesHomeMetrics } from "@/modules/rates/lib/db/queries";
import {
  SuiteRails,
  SuiteTopNav,
  SuiteHero,
  SuiteProjectPill,
  SuitePanel,
  SecBar,
  SuiteTiles,
  ChatFab,
  type SuiteTileData,
} from "@/components/suite";

interface CardDef {
  id: string;
  title: string;
  description: string;
  href?: string;
  metric?: string;
  icon: ReactNode;
  backgroundImage?: string;
  accent?: "emerald" | "zinc";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function RatesSuiteWorkspace({ metrics }: { metrics: RatesHomeMetrics }) {
  const [search, setSearch] = useState("");

  const cards: CardDef[] = useMemo(
    () => [
      {
        id: "library",
        title: "Rates Library",
        description: "Browse every priced item, benchmark and material across all 11 sections — filterable, sortable, exportable.",
        href: "/rates/library",
        metric: `${fmt(metrics.rateItems)} items`,
        icon: <Library className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-estimates.png",
      },
      {
        id: "elemental",
        title: "GIA, GFA & BUA Elemental by Project",
        description: "Per-m² cost breakdown by NRM L1 element, project by project — with optional inflation adjustment.",
        href: "/rates/elemental-by-project",
        metric: `${metrics.projects} projects`,
        icon: <Thermometer className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-reports.png",
      },
      {
        id: "benchmarks",
        title: "Benchmark Roll-ups",
        description: "NRM L1 cost-share plus per-project stacks — where the money goes, project by project.",
        icon: <PieChart className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-cost-planning.png",
        accent: "zinc",
      },
      {
        id: "materials",
        title: "Material Trends",
        description: "Price-over-time line for cement, steel, fuel — rebased to an index or shown in raw currency.",
        icon: <TrendingUp className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-budget-control.png",
        accent: "zinc",
      },
      {
        id: "comparator",
        title: "Project Comparator",
        description: "Pick two projects and compare their NRM L1 stacks plus key cost-per-area ratios side by side.",
        icon: <GitCompare className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-parametric.png",
        accent: "zinc",
      },
      {
        id: "catalogue",
        title: "Materials Catalogue",
        description: "Every material spec on file with its latest price, vintage and source — the materials dictionary.",
        icon: <Boxes className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-procurement.png",
        accent: "zinc",
      },
      {
        id: "ai",
        title: "AI Assistant",
        description: "Ask the rates database in plain English — typical façade rate, mid-rise residential, KSA, 2024.",
        icon: <Sparkles className="size-4" strokeWidth={1.75} />,
        href: "/rates/assistant",
        backgroundImage: "/card-instructions.png",
        accent: "zinc",
      },
      {
        id: "lineage",
        title: "Upload Lineage",
        description: "Per-file audit trail — what was uploaded, parsed, loaded or failed, by whom and when.",
        icon: <History className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-change-orders.png",
        accent: "zinc",
      },
      {
        id: "outliers",
        title: "Outlier Inspector",
        description: "Rows the engine flagged as more than 2σ from their typology median — what to triage next.",
        icon: <AlertOctagon className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-tenders.png",
        accent: "zinc",
      },
      {
        id: "coverage",
        title: "Coverage Map",
        description: "How many projects do we have per (asset class, country, year)? Spot the gaps before benchmarking.",
        icon: <MapIcon className="size-4" strokeWidth={1.75} />,
        backgroundImage: "/card-boqs.png",
        accent: "zinc",
      },
    ],
    [metrics],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [cards, search]);

  const grid = filtered.slice(0, 10);

  // DataFreshnessPanel rows, folded into hero-panel stat tiles.
  const tiles: SuiteTileData[] = [
    { k: "Rate items", v: metrics.rateItems.toLocaleString() },
    { k: "Project benchmarks", v: metrics.benchmarks.toLocaleString() },
    { k: "Material prices", v: metrics.materialPrices.toLocaleString() },
    { k: "Design ratios", v: metrics.designRatios.toLocaleString() },
    { k: "Projects", v: metrics.projects.toLocaleString() },
    { k: "Uploads", v: metrics.uploads.toLocaleString() },
  ];

  return (
    <div className="suite min-h-full bg-suite-page pb-10">
      <SuiteRails />

      <SuiteTopNav
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search rates, projects, materials…"
        crumb={<span className="font-semibold text-[#cdd6e6]">RatesX</span>}
        notifications={1}
      />

      <SuiteHero
        title="Rates"
        subtitle={
          <>
            {metrics.sections} sections · {metrics.tabs} tabs ·{" "}
            {fmt(metrics.rateItems)} priced items · {metrics.projects} projects
            {metrics.latestUploadAt && (
              <>
                {" "}· last upload{" "}
                {new Date(metrics.latestUploadAt).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </>
            )}
          </>
        }
        right={
          metrics.latestUploadAt ? (
            <SuiteProjectPill
              label="Data freshness"
              meta={`${metrics.uploads} uploads on record`}
              accent="green"
            />
          ) : undefined
        }
      />

      <SuitePanel first>
        <SecBar
          title="RatesX"
          count={`${grid.length} of ${cards.length}`}
        />

        <SuiteTiles items={tiles} cols={6} className="mb-4" />

        {grid.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border border-suite-line bg-suite-card-soft py-16 text-center text-[13px] text-suite-ink-3">
            No cards match &ldquo;{search}&rdquo;.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((c) => (
              <RateSuiteCard
                key={c.id}
                title={c.title}
                description={c.description}
                href={c.href}
                metric={c.metric}
                icon={c.icon}
              />
            ))}
          </div>
        )}
      </SuitePanel>

      <ChatFab />
    </div>
  );
}

/**
 * One RatesX feature card, rebuilt with suite tokens (white card,
 * border-suite-line, rounded-[14px]). Renders as a <Link> when it has an href,
 * otherwise a static panel — faithful to RateModuleCard's optional-href behaviour.
 */
function RateSuiteCard({
  title,
  description,
  href,
  metric,
  icon,
}: {
  title: string;
  description: string;
  href?: string;
  metric?: string;
  icon: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-suite-navy-2 text-white">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-suite-ink">
            {title}
          </div>
          {metric && (
            <div className="suite-num mt-0.5 text-[11.5px] text-suite-ink-3">
              {metric}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-suite-ink-2">
        {description}
      </p>
    </>
  );

  const cardClass =
    "block h-full rounded-[14px] border border-suite-line bg-white p-4";

  if (href) {
    return (
      <Link
        href={href}
        className={`${cardClass} transition-colors hover:border-suite-ink-4`}
      >
        {body}
      </Link>
    );
  }

  return <div className={`${cardClass} opacity-90`}>{body}</div>;
}
