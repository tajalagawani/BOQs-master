export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExternalLink, Target, CalendarClock } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getAllKpis, getKpiTally } from "@/lib/platform/kpis";
import { KpiBoard } from "@/components/platform/KpiBoard";
import { KpiBar } from "@/components/platform/KpiBar";

export default async function KpisPage() {
  await requirePlatformAccess();
  const [kpis, tally] = await Promise.all([getAllKpis(), getKpiTally()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-2 font-medium inline-flex items-center gap-1.5">
            <Target className="size-3" strokeWidth={2} /> Sign-off framework
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
            KPI Board <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-2 max-w-2xl">
            All 24 Schedule 1 Appendix A sub-components. Live status from{" "}
            <code className="text-[11px] bg-suite-card-soft border border-suite-line px-1 py-0.5 rounded">
              docs/quality/sign-off-matrix.md
            </code>
            . Click any KPI for the full deliverable, evidence, and gap.
          </p>
        </div>
        <Link
          href="/platform/docs/quality/sign-off-matrix"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
        >
          Assessor view <ExternalLink className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      <section className="bg-white border border-suite-line rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-baseline gap-2">
          <span className="suite-num text-[44px] font-semibold text-suite-ink leading-none">
            {tally.green}
          </span>
          <span className="text-[18px] text-suite-ink-2">/ {tally.total}</span>
          <span className="ml-2 text-[12px] text-suite-ink-2">KPIs met</span>
        </div>
        <div className="flex-1 min-w-0">
          <KpiBar
            green={tally.green}
            yellow={tally.yellow}
            orange={tally.orange}
            red={tally.red}
          />
        </div>
        <div className="hidden md:flex flex-col items-end text-right">
          <div className="text-[10.5px] uppercase tracking-wide text-suite-ink-3 font-medium inline-flex items-center gap-1">
            <CalendarClock className="size-3" strokeWidth={2} /> Snapshot
          </div>
          <div className="suite-num text-[12.5px] font-medium text-suite-ink-2">
            {new Date().toISOString().slice(0, 10)}
          </div>
        </div>
      </section>

      <KpiBoard kpis={kpis} />
    </div>
  );
}
