export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Target,
  BookOpen,
  ScrollText,
  Bug,
  GitBranch,
  Globe2,
  ExternalLink,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getKpiTally } from "@/lib/platform/kpis";
import { getDefectStats } from "@/lib/platform/defects";
import { listReleases } from "@/lib/platform/releases";
import { getAllDocs } from "@/lib/platform/docs";
import { StatusTile } from "@/components/platform/StatusTile";
import { KpiBar } from "@/components/platform/KpiBar";

export default async function PlatformOverviewPage() {
  const user = await requirePlatformAccess();

  const [summary, docs, defects, releases] = await Promise.all([
    getKpiTally(),
    getAllDocs(),
    getDefectStats(),
    listReleases(),
  ]);
  const recentDocs = [...docs].sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0)).slice(0, 5);

  const greenPct = summary.greenPct;
  const latestRelease = releases[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      {/* Hero */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-2 font-medium">
            Welcome back, {user.name.split(" ")[0]}
          </div>
          <h1 className="mt-1 text-[clamp(24px,2.4vw,32px)] leading-tight font-semibold tracking-tight text-suite-ink">
            IOX Platform <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-2 max-w-2xl">
            Internal control plane — KPIs, docs, defects, CI/CD, Azure
            monitoring, and audit trails across every IOX module.
          </p>
        </div>
        <a
          href="http://20.203.125.83"
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
        >
          <Globe2 className="size-3.5" strokeWidth={1.75} /> Live: 20.203.125.83
          <ExternalLink className="size-3 text-suite-ink-3" strokeWidth={1.75} />
        </a>
      </header>

      {/* Status tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <StatusTile
          href="/platform/kpis"
          icon={<Target strokeWidth={1.75} />}
          accent="emerald"
          label="KPIs met"
          value={`${summary.green} / ${summary.total}`}
          hint={`${greenPct}% of the Schedule 1 Appendix A framework is 🟢`}
          rightSlot={<KpiBar green={summary.green} yellow={summary.yellow} orange={summary.orange} red={summary.red} />}
        />
        <StatusTile
          href="/platform/docs"
          icon={<BookOpen strokeWidth={1.75} />}
          accent="zinc"
          label="Documentation"
          value={`${docs.length}`}
          hint="Architecture, security, governance, operations + more"
        />
        <StatusTile
          href="/platform/defects"
          icon={<Bug strokeWidth={1.75} />}
          accent={defects.openCritical === 0 ? "emerald" : "rose"}
          label="Critical defects open"
          value={defects.openCritical}
          hint={`${defects.closedTotal} closed since first deploy`}
        />
        <StatusTile
          href="/platform/releases"
          icon={<ScrollText strokeWidth={1.75} />}
          accent="sky"
          label="Latest release"
          value={latestRelease?.version ?? "—"}
          hint={
            latestRelease
              ? `${latestRelease.title.replace(/^Release\s+v[\d.]+\s+—\s+/, "")} · ${
                  latestRelease.date || latestRelease.releasedAt
                }`
              : "No releases yet"
          }
        />
        <StatusTile
          href="https://github.com/tajalagawani/BOQs-master/actions"
          external
          icon={<GitBranch strokeWidth={1.75} />}
          accent="violet"
          label="Last CI run"
          value="Passing"
          hint="Push to main → live in ~3 min"
        />
        <StatusTile
          icon={<Target strokeWidth={1.75} />}
          accent="rose"
          label="Outstanding"
          value={summary.total - summary.green}
          hint="See KPIs tab for action plan"
          href="/platform/kpis"
        />
      </div>

      {/* KPI per-component breakdown */}
      <section className="bg-white border border-suite-line rounded-2xl p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-suite-ink">Sign-off framework — components</h2>
            <p className="text-[11px] text-suite-ink-2">
              Schedule 1 Appendix A. Green count of sub-components per top-level component.
            </p>
          </div>
          <Link
            href="/platform/kpis"
            className="text-[12px] font-medium text-suite-ink-2 hover:text-suite-ink inline-flex items-center gap-1"
          >
            Open KPI board <ExternalLink className="size-3" strokeWidth={1.75} />
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {summary.byComponent.map((c) => {
            const pct = c.total > 0 ? Math.round((c.green / c.total) * 100) : 0;
            return (
              <div
                key={c.ref}
                className="bg-suite-card-soft border border-suite-line rounded-xl p-3"
              >
                <div className="text-[10px] uppercase tracking-wide text-suite-ink-3 font-medium">
                  Component {c.ref}
                </div>
                <div className="mt-0.5 text-[13px] font-semibold text-suite-ink line-clamp-2 min-h-[2.6em]">
                  {c.component}
                </div>
                <div className="mt-2 text-[20px] font-bold suite-num text-suite-ink">
                  {c.green}
                  <span className="text-[13px] font-normal text-suite-ink-2"> / {c.total}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-suite-line-2 overflow-hidden">
                  <div className="h-full bg-suite-good" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-suite-ink-2">{pct}% met</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent docs */}
      <section className="bg-white border border-suite-line rounded-2xl p-5">
        <header className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-suite-ink">Recently updated docs</h2>
            <p className="text-[11px] text-suite-ink-2">Last 5 modifications to the docs/ tree.</p>
          </div>
          <Link
            href="/platform/docs"
            className="text-[12px] font-medium text-suite-ink-2 hover:text-suite-ink inline-flex items-center gap-1"
          >
            Browse all <ExternalLink className="size-3" strokeWidth={1.75} />
          </Link>
        </header>
        <ul className="divide-y divide-suite-line-soft">
          {recentDocs.map((d) => (
            <li key={d.slug} className="py-2 flex items-center justify-between gap-3">
              <Link
                href={`/platform/docs/${d.slug}`}
                className="flex items-center gap-2 min-w-0 text-[13px] text-suite-ink hover:text-suite-ink"
              >
                <BookOpen className="size-3.5 text-suite-ink-3 shrink-0" strokeWidth={1.75} />
                <span className="truncate font-medium">{d.label}</span>
                <span className="text-[11px] text-suite-ink-3 truncate hidden sm:inline">/{d.slug}</span>
              </Link>
              <time className="text-[11px] text-suite-ink-3 shrink-0 suite-num">
                {d.mtime ? new Date(d.mtime).toLocaleDateString() : ""}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
