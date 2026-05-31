export const dynamic = "force-dynamic";

import {
  Gauge,
  Activity,
  Clock,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getLatestK6Run, getK6History } from "@/lib/platform/k6";
import { MetricChart } from "@/components/platform/MetricChart";
import { cn } from "@/lib/cn";

export default async function PerformancePage() {
  await requirePlatformAccess();
  const [run, history] = await Promise.all([getLatestK6Run(), getK6History(30)]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-5">
      <header>
        <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
          <Gauge className="size-3" strokeWidth={2} /> Performance
        </div>
        <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
          Performance <span style={{ color: "#60B78C" }}>.</span>
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
          Latest k6 load-test from{" "}
          <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">
            {run?.sourcePath ?? "web/tests/.last-load-test.json"}
          </code>
          . Closes C5-SC2 Performance validation.
        </p>
      </header>

      {!run ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Stat
              label="Requests"
              value={run.reqTotal.toLocaleString()}
              tone="zinc"
              icon={<Activity className="size-3.5" strokeWidth={1.75} />}
              hint={`${run.reqRate.toFixed(1)} req/s`}
            />
            <Stat
              label="Iterations"
              value={run.iterations.toLocaleString()}
              tone="zinc"
              icon={<PlayCircle className="size-3.5" strokeWidth={1.75} />}
              hint={`Max VUs: ${run.vusMax}`}
            />
            <Stat
              label="Avg latency"
              value={`${run.avgMs}ms`}
              tone="zinc"
              icon={<Clock className="size-3.5" strokeWidth={1.75} />}
              hint={`p50: ${run.p50Ms}ms`}
            />
            <Stat
              label="p95"
              value={`${run.p95Ms}ms`}
              tone={run.p95Ms < 1000 ? "emerald" : run.p95Ms < 2000 ? "amber" : "rose"}
              icon={<Clock className="size-3.5" strokeWidth={1.75} />}
              hint="Target: <1 s"
            />
            <Stat
              label="p99"
              value={`${run.p99Ms}ms`}
              tone={run.p99Ms < 2000 ? "emerald" : "amber"}
              icon={<Clock className="size-3.5" strokeWidth={1.75} />}
            />
            <Stat
              label="Errors"
              value={`${run.failedPct}%`}
              tone={run.failedPct < 1 ? "emerald" : "rose"}
              icon={<AlertTriangle className="size-3.5" strokeWidth={1.75} />}
              hint="Target: <1%"
            />
          </div>

          {run.thresholds.length > 0 && (
            <section className="bg-white border border-zinc-200 rounded-2xl p-4">
              <header className="mb-3">
                <h2 className="text-[12.5px] font-semibold text-zinc-900">Thresholds</h2>
                <p className="text-[11px] text-zinc-500">
                  Declared in <code className="text-[10.5px] bg-zinc-100 px-1 py-0.5 rounded">load-test.js</code>
                </p>
              </header>
              <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden">
                {run.thresholds.map((t) => (
                  <li
                    key={t.name}
                    className="flex items-center gap-3 px-3 py-2 text-[12px]"
                  >
                    {t.passed ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
                    ) : (
                      <XCircle className="size-3.5 text-rose-600 shrink-0" strokeWidth={2} />
                    )}
                    <code className="font-mono text-[11.5px] text-zinc-800 flex-1 truncate">
                      {t.name}
                    </code>
                    <span
                      className={cn(
                        "text-[10.5px] font-medium uppercase tracking-wide",
                        t.passed ? "text-emerald-700" : "text-rose-700",
                      )}
                    >
                      {t.passed ? "passed" : "breached"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {history.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ChartCard title="p95 latency trend" subtitle="last 30 runs">
                <MetricChart
                  data={history.map((h) => ({ ts: h.ts, value: h.p95Ms }))}
                  unit="ms"
                  color="#6366f1"
                  precision={0}
                />
              </ChartCard>
              <ChartCard title="Error rate trend" subtitle="last 30 runs">
                <MetricChart
                  data={history.map((h) => ({ ts: h.ts, value: h.errorPct }))}
                  unit="%"
                  yMax={Math.max(5, ...history.map((h) => h.errorPct))}
                  color="#f43f5e"
                  precision={2}
                />
              </ChartCard>
            </div>
          )}

          {run.routes.length > 0 && (
            <section>
              <header className="flex items-baseline justify-between mb-2.5 px-1">
                <h2 className="text-[12.5px] font-semibold text-zinc-900">Per-route breakdown</h2>
                <span className="text-[11px] text-zinc-500">
                  {run.routes.length} routes · sorted by p95 desc
                </span>
              </header>
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 text-[11px] uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Route</th>
                      <th className="px-3 py-2 text-right font-medium">Reqs</th>
                      <th className="px-3 py-2 text-right font-medium">Avg</th>
                      <th className="px-3 py-2 text-right font-medium">p95</th>
                      <th className="px-3 py-2 text-right font-medium">p99</th>
                      <th className="px-3 py-2 text-right font-medium">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {run.routes.map((r) => (
                      <tr key={r.route} className="hover:bg-zinc-50/60">
                        <td className="px-3 py-2 font-mono text-[11.5px] text-zinc-900">
                          {r.route}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {r.count.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {r.avgMs}ms
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums font-medium",
                            r.p95Ms < 1000 ? "text-emerald-700" : r.p95Ms < 2000 ? "text-amber-700" : "text-rose-700",
                          )}
                        >
                          {r.p95Ms}ms
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {r.p99Ms}ms
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right tabular-nums",
                            r.errorRate > 0 ? "text-rose-700 font-medium" : "text-zinc-500",
                          )}
                        >
                          {r.errorRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
      <div className="size-10 mx-auto rounded-xl bg-zinc-100 text-zinc-500 inline-flex items-center justify-center">
        <Gauge className="size-4" strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">No load-test run yet</h3>
      <p className="mt-1 text-[11.5px] text-zinc-500 max-w-md mx-auto">
        Run the k6 smoke against local or the live VM:
      </p>
      <pre className="mt-4 mx-auto inline-block text-left bg-zinc-950 text-zinc-100 text-[11px] px-3 py-2.5 rounded-md font-mono">
        BASE_URL=http://20.203.125.83 k6 run web/scripts/load-test.js
      </pre>
      <p className="mt-3 text-[10.5px] text-zinc-400">
        Output is written to <code className="bg-zinc-100 rounded px-1 py-0.5">tests/.last-load-test.json</code> by the custom <code className="bg-zinc-100 rounded px-1 py-0.5">handleSummary</code>.
      </p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4">
      <header className="mb-3">
        <h3 className="text-[12.5px] font-semibold text-zinc-900">{title}</h3>
        <p className="text-[10.5px] text-zinc-500">{subtitle}</p>
      </header>
      {children}
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
