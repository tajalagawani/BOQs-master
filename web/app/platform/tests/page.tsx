export const dynamic = "force-dynamic";

import {
  CheckCircle2,
  XCircle,
  CircleDashed,
  Clock,
  PlayCircle,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getLatestTestRun, getTestRunHistory } from "@/lib/platform/junit";
import { TestSuiteList } from "@/components/platform/TestSuiteList";
import { MetricChart } from "@/components/platform/MetricChart";

export default async function TestsPage() {
  await requirePlatformAccess();
  const [run, history] = await Promise.all([getLatestTestRun(), getTestRunHistory(30)]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
          <CheckCircle2 className="size-3" strokeWidth={2} /> Quality
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
          Tests <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
          Latest JUnit run from{" "}
          <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">
            {run?.sourcePath ?? "web/tests/.last-junit.xml"}
          </code>
          . Closes C2-SC3 + C3-SC3 (data access + system-to-system testing).
        </p>
      </header>

      {!run ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat
              label="Pass rate"
              value={`${run.totals.passRate}%`}
              tone={
                run.totals.passRate === 100
                  ? "emerald"
                  : run.totals.passRate >= 90
                    ? "amber"
                    : "rose"
              }
              icon={<CheckCircle2 className="size-3.5" strokeWidth={1.75} />}
              hint={`${run.totals.passed} of ${run.totals.tests} passed`}
            />
            <Stat
              label="Failures"
              value={run.totals.failed}
              tone={run.totals.failed === 0 ? "emerald" : "rose"}
              icon={<XCircle className="size-3.5" strokeWidth={1.75} />}
              hint={run.totals.failed === 0 ? "All green" : "See suites below"}
            />
            <Stat
              label="Skipped"
              value={run.totals.skipped}
              tone="zinc"
              icon={<CircleDashed className="size-3.5" strokeWidth={1.75} />}
            />
            <Stat
              label="Duration"
              value={`${run.totals.durationSec.toFixed(1)}s`}
              tone="zinc"
              icon={<Clock className="size-3.5" strokeWidth={1.75} />}
              hint={`Generated ${new Date(run.generatedAt).toLocaleString()}`}
            />
          </div>

          {history.length > 1 && (
            <section className="bg-white border border-zinc-200 rounded-2xl p-4">
              <header className="mb-3">
                <h2 className="text-[12.5px] font-semibold text-zinc-900">Pass-rate trend</h2>
                <p className="text-[11px] text-zinc-500">
                  Last {history.length} runs from{" "}
                  <code className="text-[10.5px] bg-zinc-100 px-1 py-0.5 rounded">
                    web/tests/.junit-history/
                  </code>
                </p>
              </header>
              <MetricChart
                data={history.map((h) => ({ ts: h.ts, value: h.passRate }))}
                unit="%"
                yMax={100}
                color="#10b981"
                precision={0}
              />
            </section>
          )}

          <section>
            <header className="flex items-baseline justify-between mb-2.5 px-1">
              <h2 className="text-[12.5px] font-semibold text-zinc-900">
                Suites <span className="text-zinc-500 font-normal">· {run.suites.length}</span>
              </h2>
              <span className="text-[11px] text-zinc-500">Failed suites auto-expanded</span>
            </header>
            <TestSuiteList suites={run.suites} />
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
      <div className="size-10 mx-auto rounded-xl bg-zinc-100 text-zinc-500 inline-flex items-center justify-center">
        <PlayCircle className="size-4" strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">No JUnit report yet</h3>
      <p className="mt-1 text-[11.5px] text-zinc-500 max-w-md mx-auto">
        Run the test suite with a JUnit reporter to populate this page:
      </p>
      <pre className="mt-4 mx-auto inline-block text-left bg-zinc-950 text-zinc-100 text-[11px] px-3 py-2.5 rounded-md font-mono">
        npx vitest run --reporter=junit --outputFile=tests/.last-junit.xml
      </pre>
      <p className="mt-3 text-[10.5px] text-zinc-400">
        Snapshot to <code className="bg-zinc-100 rounded px-1 py-0.5">tests/.junit-history/</code> with a sortable timestamp prefix to build the trend chart.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: string | number;
  tone: "emerald" | "amber" | "rose" | "zinc";
  icon: React.ReactNode;
  hint?: string;
}) {
  const cls =
    tone === "emerald"
      ? { tile: "bg-emerald-50 ring-emerald-100 text-emerald-700", text: "text-emerald-700" }
      : tone === "amber"
        ? { tile: "bg-amber-50 ring-amber-100 text-amber-700", text: "text-amber-700" }
        : tone === "rose"
          ? { tile: "bg-rose-50 ring-rose-100 text-rose-700", text: "text-rose-700" }
          : { tile: "bg-zinc-900 ring-zinc-200 text-white", text: "text-zinc-900" };
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <div className={`size-8 rounded-lg inline-flex items-center justify-center ring-1 ${cls.tile}`}>
        {icon}
      </div>
      <div className="mt-3 text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${cls.text}`}>{value}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-1 truncate">{hint}</div>}
    </div>
  );
}
