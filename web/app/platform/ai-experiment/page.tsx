import { requireSuperadmin } from "@/modules/core/authz";
import { getExperimentDashboard } from "@/modules/rates/lib/ai-analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Experiment · IOX Platform" };

const fmt = (n: number) => n.toLocaleString("en-GB");
// Claude Opus rough $/token (input/output) — for a ballpark experiment cost.
const COST_IN = 15 / 1_000_000;
const COST_OUT = 75 / 1_000_000;

export default async function AiExperimentPage() {
  await requireSuperadmin();
  const d = await getExperimentDashboard();

  const estCost = d.totals.tokensIn * COST_IN + d.totals.tokensOut * COST_OUT;
  const maxDay = Math.max(1, ...d.timeseries.map((t) => t.messages));

  const kpis: Array<{ label: string; value: string; sub?: string }> = [
    { label: "Messages", value: fmt(d.totals.messages) },
    { label: "Active users", value: fmt(d.totals.users) },
    {
      label: "Tokens",
      value: fmt(d.totals.tokensIn + d.totals.tokensOut),
      sub: `${fmt(d.totals.tokensIn)} in · ${fmt(d.totals.tokensOut)} out`,
    },
    { label: "Est. cost", value: `$${estCost.toFixed(2)}` },
    { label: "Avg latency", value: `${(d.totals.avgLatency / 1000).toFixed(1)}s` },
    {
      label: "Feedback coverage",
      value: `${d.feedback.coverage}%`,
      sub: `${d.feedback.up}👍 · ${d.feedback.down}👎 · ${Math.max(0, d.totals.messages - d.feedback.rated)} none`,
    },
  ];

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">AI Experiment</h1>
            <p className="mt-1 text-[13px] text-zinc-500">
              Every RatesX AI message is logged — volume, tokens, per-user activity,
              tool hit-rate, and feedback (including messages with none).
            </p>
          </div>
          <a
            href="/api/platform/ai-experiment/export"
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </a>
        </header>

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-zinc-200 bg-zinc-50/50 px-3.5 py-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {k.label}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{k.value}</div>
              {k.sub ? <div className="mt-0.5 text-[11px] text-zinc-400">{k.sub}</div> : null}
            </div>
          ))}
        </div>

        {/* Activity over time */}
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-zinc-800">Messages / day (last 30 days)</h2>
          {d.timeseries.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 px-3 py-6 text-center text-[13px] text-zinc-400">
              No activity yet.
            </p>
          ) : (
            <div className="flex h-32 items-end gap-1 rounded-xl border border-zinc-200 p-3">
              {d.timeseries.map((t) => (
                <div key={t.day} className="group relative flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-zinc-800/85 transition-colors group-hover:bg-zinc-900"
                    style={{ height: `${Math.max(4, (t.messages / maxDay) * 100)}%` }}
                    title={`${t.day}: ${t.messages} msgs · ${fmt(t.tokens)} tokens`}
                  />
                  <span className="mt-1 hidden text-[9px] text-zinc-400 lg:block">{t.day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Per-user */}
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-zinc-800">By user</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 text-right font-medium">Messages</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg latency</th>
                  <th className="px-3 py-2.5 text-right font-medium">👍 / 👎</th>
                  <th className="px-3 py-2.5 text-right font-medium">No feedback</th>
                  <th className="px-3 py-2.5 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {d.perUser.map((u) => (
                  <tr key={u.email} className="border-t border-zinc-100">
                    <td className="px-3 py-2.5 text-zinc-700">{u.email}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(u.messages)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                      {fmt(u.tokensIn + u.tokensOut)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                      {(u.avgLatency / 1000).toFixed(1)}s
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className="text-emerald-600">{u.up}</span>
                      <span className="text-zinc-300"> / </span>
                      <span className="text-red-600">{u.down}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-600">{u.noFeedback}</td>
                    <td className="px-3 py-2.5 text-[12px] text-zinc-500">{u.lastActive}</td>
                  </tr>
                ))}
                {d.perUser.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">No users yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tool usage */}
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-zinc-800">
            Tool usage <span className="font-normal text-zinc-400">— high no-data % = data gaps to fill</span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">Tool</th>
                  <th className="px-3 py-2.5 text-right font-medium">Calls</th>
                  <th className="px-3 py-2.5 text-right font-medium">No-data</th>
                  <th className="px-3 py-2.5 text-right font-medium">No-data %</th>
                </tr>
              </thead>
              <tbody>
                {d.tools.map((t) => (
                  <tr key={t.name} className="border-t border-zinc-100">
                    <td className="px-3 py-2.5 font-mono text-[12px] text-zinc-700">{t.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmt(t.calls)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">{fmt(t.noData)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={t.calls && t.noData / t.calls > 0.4 ? "text-red-600" : "text-zinc-500"}>
                        {t.calls ? Math.round((t.noData / t.calls) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
                {d.tools.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-400">No tool calls yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-zinc-800">Recent messages</h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full border-collapse text-left align-top text-[13px]">
              <thead>
                <tr className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">When</th>
                  <th className="px-3 py-2.5 font-medium">User</th>
                  <th className="px-3 py-2.5 font-medium">Question</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tokens</th>
                  <th className="px-3 py-2.5 text-right font-medium">Latency</th>
                  <th className="px-3 py-2.5 font-medium">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {d.recent.map((m) => (
                  <tr key={m.id} className="border-t border-zinc-100 align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-zinc-500">{m.createdAt}</td>
                    <td className="px-3 py-2.5 text-[12px] text-zinc-600">{m.email ?? "—"}</td>
                    <td className="px-3 py-2.5 text-zinc-800">
                      <span className="line-clamp-2">{m.question}</span>
                      {m.error ? <span className="ml-1 text-[11px] text-red-600">(error)</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                      {fmt(m.tokensIn + m.tokensOut)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">
                      {(m.latencyMs / 1000).toFixed(1)}s
                    </td>
                    <td className="px-3 py-2.5">
                      {m.vote === "up" ? (
                        <span className="text-emerald-600">👍</span>
                      ) : m.vote === "down" ? (
                        <span className="text-red-600" title={m.reason ?? ""}>
                          👎 {m.reason ? <span className="text-[11px] text-red-700">{m.reason}</span> : null}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {d.recent.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">No messages yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
