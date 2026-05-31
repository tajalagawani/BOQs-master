import Link from "next/link";
import { CheckCircle2, XCircle, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiRun } from "@/lib/platform/github";

interface Props {
  runs: CiRun[];
  deployFreshness?: {
    deployedSha: string | null;
    commitsBehind: number | null;
  } | null;
}

/**
 * Top-of-page banner reflecting the most-recent run state.
 * Pulses while any run is in_progress.
 */
export function CiOverviewBanner({ runs, deployFreshness }: Props) {
  const active = runs.filter((r) => r.status !== "completed");
  const last = runs[0];

  if (active.length > 0) {
    const a = active[0];
    return (
      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="size-9 rounded-xl bg-sky-100 ring-1 ring-sky-200 text-sky-700 inline-flex items-center justify-center shrink-0">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-sky-900">
            {active.length === 1 ? "Build in progress" : `${active.length} builds in progress`}
          </div>
          <div className="text-[11.5px] text-sky-700 truncate">
            {a.name} · {a.branch} · {a.commitMessage.split("\n")[0]}
          </div>
        </div>
        <Link
          href={`/platform/cicd/runs/${a.id}`}
          className="text-[12px] font-medium text-sky-800 hover:text-sky-900 inline-flex items-center gap-0.5"
        >
          View run <ChevronRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  if (!last) {
    return (
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-3 text-[12px] text-zinc-500">
        No runs yet
      </div>
    );
  }

  const failed = last.conclusion !== "success";
  const tone = failed
    ? "bg-rose-50 border-rose-200 text-rose-900"
    : "bg-emerald-50 border-emerald-200 text-emerald-900";
  const iconCls = failed
    ? "bg-rose-100 ring-rose-200 text-rose-700"
    : "bg-emerald-100 ring-emerald-200 text-emerald-700";

  return (
    <div className={cn("border rounded-2xl px-4 py-3 flex items-center gap-3", tone)}>
      <span
        className={cn("size-9 rounded-xl ring-1 inline-flex items-center justify-center shrink-0", iconCls)}
      >
        {failed ? (
          <XCircle className="size-4" strokeWidth={2} />
        ) : (
          <CheckCircle2 className="size-4" strokeWidth={2} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold">
          {failed ? "Last build failed" : "Last build succeeded"}
        </div>
        <div className="text-[11.5px] opacity-80 truncate">
          {last.name} · {last.commitMessage.split("\n")[0]}{" "}
          {deployFreshness?.commitsBehind != null && (
            <span className="opacity-70">
              · Deployed{" "}
              <code className="text-[10.5px] bg-white/60 rounded px-1">
                {(deployFreshness.deployedSha ?? "").slice(0, 7) || "—"}
              </code>{" "}
              {deployFreshness.commitsBehind > 0
                ? `is ${deployFreshness.commitsBehind} behind main`
                : "is on HEAD"}
            </span>
          )}
        </div>
      </div>
      <Link
        href={`/platform/cicd/runs/${last.id}`}
        className="text-[12px] font-medium inline-flex items-center gap-0.5 opacity-90 hover:opacity-100"
      >
        View run <ChevronRight className="size-3.5" strokeWidth={2} />
      </Link>
    </div>
  );
}
