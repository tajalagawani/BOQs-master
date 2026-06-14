"use client";

/**
 * Full-page workspace for Elemental-by-Project.
 * Full-bleed inner-page shell (no big navy hero). Left rail = project cohort
 * (search + multi-select). Main = compact control bar + chart canvas. Right =
 * project detail drawer.
 *
 * The full benchmark set is filtered entirely client-side, so every filter
 * option shows a live count and the empty ones are disabled — the benchmark
 * data is heavily concentrated (mostly UAE / AED / untyped), and silent empty
 * selections were the main source of confusion. Currency is a hard axis: only
 * one currency is plotted at a time.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Info, Search } from "lucide-react";
import { ElementalComposition } from "@/modules/rates/charts/ElementalComposition";
import { ElementalDistribution } from "@/modules/rates/charts/ElementalDistribution";
import { ProjectDetailDrawer } from "@/components/rates-home/ProjectDetailDrawer";
import type { Basis, ElementalView } from "@/modules/rates/charts/elemental-data";
import type { ElementalProject } from "@/modules/rates/lib/db/queries";
import {
  INFLATION_BY_YEAR,
  INFLATION_REFERENCE_YEARS,
} from "@/modules/rates/lib/inflation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/rates/components/ui/select";
import { SuiteInnerShell, SuiteInnerHeader } from "@/components/suite";

export interface ElementalParams {
  basis: Basis;
  currency: string;
  assetClass: string; // "All" | label
  assetType: string; // "All" | label
  country: string; // "All" | label
  refYear: number;
  inflate: boolean;
  view: ElementalView;
  normalize: boolean;
}

interface Props {
  projects: ElementalProject[]; // the FULL benchmark set, unfiltered
  params: ElementalParams;
}

const BASE = "/rates/elemental-by-project";
type Dim = "currency" | "assetClass" | "assetType" | "country";
const norm = (v: string | null | undefined) => v ?? "";

export function ElementalWorkspace({ projects, params }: Props) {
  const router = useRouter();
  const { basis, currency, assetClass, assetType, country, refYear, inflate, view, normalize } =
    params;

  const buildHref = (patch: Partial<ElementalParams>): string => {
    const m = { ...params, ...patch };
    const qs = new URLSearchParams();
    qs.set("basis", m.basis);
    qs.set("currency", m.currency);
    qs.set("assetClass", m.assetClass);
    qs.set("assetType", m.assetType);
    qs.set("country", m.country);
    qs.set("refYear", String(m.refYear));
    qs.set("inflate", m.inflate ? "on" : "off");
    qs.set("view", m.view);
    qs.set("normalize", m.normalize ? "on" : "off");
    return `${BASE}?${qs.toString()}`;
  };
  const go = (patch: Partial<ElementalParams>) => router.push(buildHref(patch));

  /* ── faceted filtering (all client-side) ─────────────────── */
  const passDim = (p: ElementalProject, dim: Dim, val: string) => {
    if (dim !== "currency" && val === "All") return true;
    const field = dim === "assetClass" ? p.assetClass
      : dim === "assetType" ? p.assetType
      : dim === "country" ? p.country
      : p.currency;
    return norm(field) === val;
  };

  // Count projects matching every active filter EXCEPT `dim`, with dim = value.
  const facetCount = (dim: Dim, value: string) =>
    projects.filter(
      (p) =>
        (dim === "currency" || passDim(p, "currency", currency)) &&
        (dim === "assetClass" || passDim(p, "assetClass", assetClass)) &&
        (dim === "assetType" || passDim(p, "assetType", assetType)) &&
        (dim === "country" || passDim(p, "country", country)) &&
        passDim(p, dim, value),
    ).length;

  // Options for a dim: values with data (+ the active one), counts, sorted.
  const buildOptions = (dim: Dim, active: string, withAll: boolean) => {
    const vals = new Set<string>();
    for (const p of projects) {
      const f = dim === "assetClass" ? p.assetClass
        : dim === "assetType" ? p.assetType
        : dim === "country" ? p.country
        : p.currency;
      if (norm(f)) vals.add(norm(f));
    }
    const opts = [...vals]
      .map((v) => ({ value: v, count: facetCount(dim, v) }))
      .filter((o) => o.count > 0 || o.value === active)
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .map((o) => ({ value: o.value, label: `${o.value} (${o.count})`, disabled: o.count === 0 }));
    if (withAll) {
      opts.unshift({ value: "All", label: `All (${facetCount(dim, "All")})`, disabled: false });
    }
    return opts;
  };

  const currencyOpts = useMemo(
    () => buildOptions("currency", currency, false),
    [projects, currency, assetClass, assetType, country],
  );
  const classOpts = useMemo(
    () => buildOptions("assetClass", assetClass, true),
    [projects, currency, assetClass, assetType, country],
  );
  const typeOpts = useMemo(
    () => buildOptions("assetType", assetType, true),
    [projects, currency, assetClass, assetType, country],
  );
  const countryOpts = useMemo(
    () => buildOptions("country", country, true),
    [projects, currency, assetClass, assetType, country],
  );

  // The plotted cohort + currency-excluded count (within the geo/asset filter).
  const { cohort, excluded } = useMemo(() => {
    const geo = projects.filter(
      (p) =>
        passDim(p, "assetClass", assetClass) &&
        passDim(p, "assetType", assetType) &&
        passDim(p, "country", country),
    );
    const cohort = geo.filter((p) => norm(p.currency) === currency);
    return { cohort, excluded: geo.length - cohort.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, currency, assetClass, assetType, country]);

  /* ── project selection (reset when cohort membership changes) */
  const cohortSig = useMemo(() => cohort.map((p) => p.projectId).join(","), [cohort]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(cohort.map((p) => p.projectId)),
  );
  useEffect(() => {
    setSelected(new Set(cohortSig ? cohortSig.split(",") : []));
  }, [cohortSig]);

  const [query, setQuery] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cohort;
    return cohort.filter(
      (p) =>
        p.project.toLowerCase().includes(q) ||
        (p.assetClass ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q),
    );
  }, [cohort, query]);

  const visible = useMemo(
    () => cohort.filter((p) => selected.has(p.projectId)),
    [cohort, selected],
  );
  const drawerProject = useMemo(
    () => cohort.find((p) => p.projectId === drawerId) ?? null,
    [cohort, drawerId],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = cohort.length > 0 && selected.size === cohort.length;

  const inflationRate = INFLATION_BY_YEAR[refYear];
  const title = `${assetClass === "All" ? "All assets" : assetClass}${
    assetType !== "All" ? ` · ${assetType}` : ""
  } — Elemental by Project`;
  const subtitle = `${visible.length} of ${cohort.length} ${currency} ${
    cohort.length === 1 ? "project" : "projects"
  }${inflate ? ` · adjusted to ${refYear}` : " · raw historical"}${
    excluded > 0 ? ` · ${excluded} in other/no currency` : ""
  }`;

  return (
    <SuiteInnerShell
      crumb={<span className="font-semibold text-[#cdd6e6]">RatesX</span>}
      search={query}
      onSearch={setQuery}
      searchPlaceholder="Search projects…"
      header={
        <SuiteInnerHeader
          title={title}
          actions={
            <span className="truncate text-[11.5px] text-suite-ink-3">{subtitle}</span>
          }
        />
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] min-h-0 h-full bg-white border border-suite-line rounded-[12px] p-3">
      {/* ── Left rail: project cohort ───────────────────────── */}
      <aside className="hidden lg:flex flex-col min-h-0 border-r border-suite-line pr-4 py-1 gap-2.5">
        <Link
          href="/rates"
          className="inline-flex items-center gap-1.5 text-xs text-suite-ink-3 hover:text-suite-ink shrink-0"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} />
          Back to RatesX
        </Link>

        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-suite-ink-4 font-semibold shrink-0 mt-2">
          <span>
            Projects ({selected.size}/{cohort.length})
          </span>
          <button
            type="button"
            onClick={() =>
              setSelected(allSelected ? new Set() : new Set(cohort.map((p) => p.projectId)))
            }
            className="text-[10px] uppercase tracking-wider font-semibold text-suite-ink-4 hover:text-suite-ink"
          >
            {allSelected ? "Clear" : "All"}
          </button>
        </div>

        <div className="relative shrink-0">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-suite-ink-4"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            className="w-full h-8 pl-7 pr-2 bg-white border border-suite-line rounded-lg text-[11.5px] placeholder:text-suite-ink-4 focus:outline-none focus:ring-2 focus:ring-suite-navy/10 focus:border-suite-line-2"
          />
        </div>

        <ul className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col text-[11.5px]">
          {filteredList.map((p) => {
            const isSel = selected.has(p.projectId);
            return (
              <li key={p.projectId} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => toggle(p.projectId)}
                  className={
                    "flex-1 flex items-center gap-2 px-2 py-1 rounded-md transition-colors text-left min-w-0 " +
                    (isSel
                      ? "text-suite-ink hover:bg-suite-card-soft"
                      : "text-suite-ink-4 hover:text-suite-ink-2 hover:bg-suite-card-soft")
                  }
                >
                  {isSel ? (
                    <Eye className="size-3 shrink-0 text-suite-good" strokeWidth={2} />
                  ) : (
                    <EyeOff className="size-3 shrink-0" strokeWidth={2} />
                  )}
                  <span className="flex-1 min-w-0 truncate">{p.project}</span>
                  {p.baseYear ? (
                    <span className="text-[10px] text-suite-ink-4 tabular-nums shrink-0">
                      {p.baseYear}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {filteredList.length === 0 && (
            <li className="text-xs text-suite-ink-4 italic py-2 text-center">
              {cohort.length === 0
                ? `No ${currency} projects for these filters.`
                : `No projects match “${query}”.`}
            </li>
          )}
        </ul>
      </aside>

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="min-w-0 min-h-0 overflow-hidden">
        <div className="h-full lg:pl-6 flex flex-col gap-3">
          {/* Title/subtitle render in the SuiteInnerShell header above. */}
          <div className="shrink-0">
            <Link
              href="/rates"
              className="lg:hidden inline-flex items-center gap-1.5 text-xs text-suite-ink-3 hover:text-suite-ink mb-2"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.75} />
              Back to RatesX
            </Link>
          </div>

          {/* Control bar */}
          <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Segmented
              options={[
                { label: "Composition", value: "composition" },
                { label: "Distribution", value: "distribution" },
              ]}
              current={view}
              hrefFor={(v) => buildHref({ view: v as ElementalView })}
            />
            <Divider />
            <Segmented
              options={(["BUA", "GIA", "GFA"] as const).map((b) => ({ label: b, value: b }))}
              current={basis}
              hrefFor={(b) => buildHref({ basis: b as Basis })}
            />
            {view === "composition" ? (
              <Segmented
                options={[
                  { label: "Absolute", value: "off" },
                  { label: "100%", value: "on" },
                ]}
                current={normalize ? "on" : "off"}
                hrefFor={(v) => buildHref({ normalize: v === "on" })}
              />
            ) : null}
            <Divider />

            <CompactSelect
              label="Currency"
              value={currency}
              onChange={(v) => go({ currency: v })}
              options={currencyOpts}
            />
            <CompactSelect
              label="Asset class"
              value={assetClass}
              onChange={(v) => go({ assetClass: v, assetType: "All" })}
              options={classOpts}
            />
            <CompactSelect
              label="Type"
              value={assetType}
              onChange={(v) => go({ assetType: v })}
              options={typeOpts}
            />
            <CompactSelect
              label="Country"
              value={country}
              onChange={(v) => go({ country: v })}
              options={countryOpts}
            />
            <Divider />
            <Link
              href={buildHref({ inflate: !inflate })}
              className={
                "h-7 px-2.5 inline-flex items-center rounded-full border text-[11px] transition-colors " +
                (inflate
                  ? "bg-suite-good text-white border-suite-good"
                  : "bg-white text-suite-ink-2 border-suite-line hover:border-suite-line-2")
              }
            >
              {inflate
                ? `Adjusted ${refYear}${inflationRate != null ? ` (+${(inflationRate * 100).toFixed(1)}%)` : ""}`
                : "Raw"}
            </Link>
          </div>

          {/* Reference-year strip */}
          {inflate ? (
            <div className="shrink-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px]">
              <span className="text-suite-ink-3">Reference year:</span>
              {INFLATION_REFERENCE_YEARS.filter((y) => y >= 2018).map((y) => (
                <Link
                  key={y}
                  href={buildHref({ refYear: y })}
                  className={
                    "h-6 px-2 inline-flex items-center rounded-full border transition-colors " +
                    (refYear === y
                      ? "bg-suite-navy text-white border-suite-navy"
                      : "bg-white text-suite-ink-2 border-suite-line hover:border-suite-line-2")
                  }
                >
                  {y}
                </Link>
              ))}
            </div>
          ) : null}

          {/* How to read */}
          {cohort.length > 0 && selected.size > 0 ? (
            <ReadingHint view={view} currency={currency} basis={basis} normalize={normalize} />
          ) : null}

          {/* Canvas — Composition capped & centered; Distribution fills height */}
          <div
            className={
              "flex-1 min-h-0 flex flex-col " +
              (view === "distribution" ? "" : "justify-center")
            }
          >
            <div
              className={
                "w-full " +
                (view === "distribution" ? "h-full min-h-0" : "h-full max-h-[680px]")
              }
            >
              {cohort.length === 0 ? (
                <Empty>
                  No {currency} projects match these filters — try “All” class/type/country, or another
                  currency.
                </Empty>
              ) : selected.size === 0 ? (
                <Empty>Select a project from the left to plot.</Empty>
              ) : view === "composition" ? (
                <ElementalComposition
                  projects={visible}
                  basis={basis}
                  refYear={refYear}
                  inflationOn={inflate}
                  normalized={normalize}
                  currency={currency}
                  onSelectProject={setDrawerId}
                />
              ) : (
                <ElementalDistribution
                  projects={visible}
                  basis={basis}
                  refYear={refYear}
                  inflationOn={inflate}
                  currency={currency}
                  onSelectProject={setDrawerId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      <ProjectDetailDrawer
        project={drawerProject}
        basis={basis}
        refYear={refYear}
        inflationOn={inflate}
        onClose={() => setDrawerId(null)}
      />
    </SuiteInnerShell>
  );
}

/* ── small control primitives ─────────────────────────────── */

function Segmented({
  options,
  current,
  hrefFor,
}: {
  options: Array<{ label: string; value: string }>;
  current: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-suite-line bg-white p-0.5">
      {options.map((o) => (
        <Link
          key={o.value}
          href={hrefFor(o.value)}
          className={
            "h-6 px-2.5 inline-flex items-center rounded-full text-[11px] font-medium transition-colors " +
            (current === o.value ? "bg-suite-navy text-white" : "text-suite-ink-2 hover:text-suite-ink")
          }
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className="h-7 px-2.5 text-[11px] rounded-full border-suite-line bg-white gap-1 min-w-0 w-auto"
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled} className="text-[12px]">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Divider() {
  return <span className="h-5 w-px bg-suite-line" aria-hidden="true" />;
}

function ReadingHint({
  view,
  currency,
  basis,
  normalize,
}: {
  view: ElementalView;
  currency: string;
  basis: Basis;
  normalize: boolean;
}) {
  return (
    <div className="shrink-0 flex items-start gap-2 text-[11px] leading-relaxed text-suite-ink-3 bg-suite-card-soft border border-suite-line rounded-lg px-3 py-1.5">
      <Info className="size-3.5 mt-px shrink-0 text-suite-ink-4" strokeWidth={1.75} />
      {view === "composition" ? (
        <p>
          <span className="font-medium text-suite-ink-2">How to read · </span>
          each bar is a project; stacked segments are NRM elements in{" "}
          <span className="font-medium text-suite-ink-2">
            {normalize ? "% of project total" : `${currency}/m² (${basis})`}
          </span>
          {normalize ? " — taller share = bigger part of the build" : " — taller = costlier per m²"}.{" "}
          <span className="text-suite-ink-4">
            Click a legend chip to isolate an element (⌥-click to hide) · click a bar for its full
            breakdown · drag the bottom slider to zoom · toggle{" "}
            {normalize ? "Absolute for money" : "100% to compare mix"}.
          </span>
        </p>
      ) : (
        <p>
          <span className="font-medium text-suite-ink-2">How to read · </span>
          each row is an NRM element on a{" "}
          <span className="font-medium text-suite-ink-2">logarithmic {currency}/m² axis</span> — further
          right = costlier per m².{" "}
          <span className="text-suite-ink-4">
            Every dot is a project · the shaded band is the middle 50% (IQR) · the ringed dot is the
            median · the right column is the median value · click a dot to open that project.
          </span>
        </p>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full grid place-items-center text-center text-sm text-suite-ink-3 bg-suite-card-soft border border-suite-line rounded-2xl px-6">
      <span className="max-w-sm">{children}</span>
    </div>
  );
}
