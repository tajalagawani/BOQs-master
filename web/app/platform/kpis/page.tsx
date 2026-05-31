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
          <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
            <Target className="size-3" strokeWidth={2} /> Sign-off framework
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
            KPI Board <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
            All 24 Schedule 1 Appendix A sub-components. Live status from{" "}
            <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">
              docs/quality/sign-off-matrix.md
            </code>
            . Click any KPI for the full deliverable, evidence, and gap.
          </p>
        </div>
        <Link
          href="/platform/docs/quality/sign-off-matrix"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-zinc-200 bg-white text-[12.5px] text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
        >
          Assessor view <ExternalLink className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      <section className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-baseline gap-2">
          <span className="text-[44px] font-semibold tabular-nums text-zinc-900 leading-none">
            {tally.green}
          </span>
          <span className="text-[18px] text-zinc-500">/ {tally.total}</span>
          <span className="ml-2 text-[12px] text-zinc-500">KPIs met</span>
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
          <div className="text-[10.5px] uppercase tracking-wide text-zinc-400 font-medium inline-flex items-center gap-1">
            <CalendarClock className="size-3" strokeWidth={2} /> Snapshot
          </div>
          <div className="text-[12.5px] font-medium text-zinc-700 tabular-nums">
            {new Date().toISOString().slice(0, 10)}
          </div>
        </div>
      </section>

      <KpiBoard kpis={kpis} />
    </div>
  );
}
