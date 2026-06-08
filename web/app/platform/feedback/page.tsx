import { requireSuperadmin } from "@/modules/core/authz";
import { listRatesFeedback } from "@/modules/rates/lib/feedback";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Feedback · IOX Platform" };

export default async function FeedbackAdminPage() {
  await requireSuperadmin();
  const rows = await listRatesFeedback();

  const counts = {
    down: rows.filter((r) => r.vote === "down").length,
    up: rows.filter((r) => r.vote === "up").length,
    withReason: rows.filter((r) => r.vote === "down" && r.reason).length,
  };

  const fmt = (d: Date | null) =>
    d
      ? new Date(d).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <main className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-zinc-900">AI Assistant Feedback</h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            What testers flagged in the RatesX AI chat. Down-votes capture the
            reason the answer was wrong — use these to improve the tools and data.
          </p>
        </header>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {(
            [
              ["Down-votes", counts.down],
              ["With a reason", counts.withReason],
              ["Up-votes", counts.up],
            ] as const
          ).map(([label, n]) => (
            <div
              key={label}
              className="rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2.5"
            >
              <div className="text-lg font-semibold tabular-nums text-zinc-900">{n}</div>
              <div className="text-[11px] text-zinc-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <table className="w-full border-collapse text-left align-top">
            <thead>
              <tr className="bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2.5 font-medium">When</th>
                <th className="px-3 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Vote</th>
                <th className="px-3 py-2.5 font-medium">Question &amp; reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 align-top">
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-zinc-500">
                    {fmt(r.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-zinc-600">
                    {r.userEmail ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium " +
                        (r.vote === "down"
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700")
                      }
                    >
                      {r.vote === "down" ? "👎 Bad" : "👍 Good"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {r.question ? (
                      <p className="text-[13px] font-medium text-zinc-800">{r.question}</p>
                    ) : null}
                    {r.reason ? (
                      <p className="mt-1 rounded-md bg-red-50/60 px-2 py-1 text-[12.5px] text-red-800">
                        {r.reason}
                      </p>
                    ) : null}
                    {r.answer ? (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[11px] text-zinc-400 hover:text-zinc-600">
                          View AI answer
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-zinc-500">
                          {r.answer}
                        </p>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-zinc-400">
                    No feedback yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
