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
    <div className="p-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-xl font-semibold text-suite-ink">AI Assistant Feedback</h1>
          <p className="mt-1 text-[13px] text-suite-ink-3">
            What testers flagged in the ioInsight AI chat. Down-votes capture the
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
              className="rounded-lg border border-suite-line bg-suite-card-soft px-3 py-2.5"
            >
              <div className="text-lg font-semibold suite-num text-suite-ink">{n}</div>
              <div className="text-[11px] text-suite-ink-3">{label}</div>
            </div>
          ))}
        </div>

        <div className="suite-tbl bg-white">
          <table className="w-full border-collapse text-left align-top">
            <thead>
              <tr className="bg-suite-card-soft text-[11px] uppercase tracking-wider text-suite-ink-3">
                <th className="px-3 py-2.5 font-medium">When</th>
                <th className="px-3 py-2.5 font-medium">User</th>
                <th className="px-3 py-2.5 font-medium">Vote</th>
                <th className="px-3 py-2.5 font-medium">Question &amp; reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-suite-line-soft align-top">
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-suite-ink-3 suite-num">
                    {fmt(r.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-[12px] text-suite-ink-2">
                    {r.userEmail ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium " +
                        (r.vote === "down"
                          ? "bg-suite-dang-bg text-suite-dang"
                          : "bg-suite-good-bg text-suite-good")
                      }
                    >
                      {r.vote === "down" ? "👎 Bad" : "👍 Good"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {r.question ? (
                      <p className="text-[13px] font-medium text-suite-ink">{r.question}</p>
                    ) : null}
                    {r.reason ? (
                      <p className="mt-1 rounded-md bg-suite-dang-bg px-2 py-1 text-[12.5px] text-suite-dang">
                        {r.reason}
                      </p>
                    ) : null}
                    {r.answer ? (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[11px] text-suite-ink-4 hover:text-suite-ink-2">
                          View AI answer
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] text-suite-ink-3">
                          {r.answer}
                        </p>
                      </details>
                    ) : null}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-suite-ink-4">
                    No feedback yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
