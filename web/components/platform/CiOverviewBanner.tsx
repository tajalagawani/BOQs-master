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
      <div className="bg-suite-blue-soft border border-suite-blue-soft rounded-2xl px-4 py-3 flex items-center gap-3">
        <span className="size-9 rounded-xl bg-suite-blue-soft ring-1 ring-suite-blue/20 text-suite-blue inline-flex items-center justify-center shrink-0">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-suite-ink">
            {active.length === 1 ? "Build in progress" : `${active.length} builds in progress`}
          </div>
          <div className="text-[11.5px] text-suite-blue truncate">
            {a.name} · {a.branch} · {a.commitMessage.split("\n")[0]}
          </div>
        </div>
        <Link
          href={`/platform/cicd/runs/${a.id}`}
          className="text-[12px] font-medium text-suite-blue hover:text-suite-ink inline-flex items-center gap-0.5"
        >
          View run <ChevronRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  if (!last) {
    return (
      <div className="bg-suite-card-soft border border-suite-line rounded-2xl px-4 py-3 text-[12px] text-suite-ink-3">
        No runs yet
      </div>
    );
  }

  const failed = last.conclusion !== "success";
  const tone = failed
    ? "bg-suite-dang-bg border-suite-dang-bg text-suite-dang"
    : "bg-suite-good-bg border-suite-good-bg text-suite-good";
  const iconCls = failed
    ? "bg-suite-dang-bg ring-suite-dang/20 text-suite-dang"
    : "bg-suite-good-bg ring-suite-good/20 text-suite-good";

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
              <code className="text-[10.5px] bg-white/60 rounded px-1 suite-num">
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
