import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  GitBranch,
  GitCommit,
  Clock,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiRun } from "@/lib/platform/github";

interface Props {
  runs: CiRun[];
}

export function CiRunList({ runs }: Props) {
  if (runs.length === 0) {
    return (
      <div className="bg-white border border-dashed border-suite-line rounded-2xl px-6 py-12 text-center">
        <CircleDashed
          className="size-5 mx-auto text-suite-ink-4"
          strokeWidth={1.75}
        />
        <h3 className="mt-3 text-[13px] font-semibold text-suite-ink">
          No workflow runs returned
        </h3>
        <p className="mt-1 text-[11.5px] text-suite-ink-3">
          The repository has no CI history yet, or the token lacks{" "}
          <code className="text-[10.5px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">actions:read</code>.
        </p>
      </div>
    );
  }
  return (
    <ol className="bg-white border border-suite-line rounded-2xl divide-y divide-suite-line-soft overflow-hidden">
      {runs.map((r) => (
        <li key={r.id} className="px-4 py-3 hover:bg-suite-card-soft transition-colors">
          <a
            href={r.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-start gap-3"
          >
            <StatusIcon run={r} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-suite-ink truncate">
                  {r.name}
                </span>
                <span className="text-[10.5px] font-medium text-suite-ink-3 bg-suite-card-soft rounded px-1.5 py-0.5 capitalize">
                  {r.event}
                </span>
                {r.attempt > 1 && (
                  <span className="text-[10.5px] font-medium text-suite-warn bg-suite-warn-bg ring-1 ring-suite-warn-bg rounded px-1.5 py-0.5">
                    Re-run #{r.attempt}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-suite-ink-2 line-clamp-1">
                {r.commitMessage.split("\n")[0]}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-suite-ink-3 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-2.5" strokeWidth={2} />
                  {r.branch}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] suite-num">
                  <GitCommit className="size-2.5" strokeWidth={2} />
                  {r.commitSha.slice(0, 7)}
                </span>
                {r.durationSec != null && (
                  <span className="inline-flex items-center gap-1 tabular-nums suite-num">
                    <Clock className="size-2.5" strokeWidth={2} />
                    {formatDuration(r.durationSec)}
                  </span>
                )}
                {r.authorLogin && (
                  <span className="inline-flex items-center gap-1.5 ml-auto">
                    {r.authorAvatar ? (
                      <Image
                        src={r.authorAvatar}
                        alt={r.authorLogin}
                        width={14}
                        height={14}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : null}
                    {r.authorLogin}
                  </span>
                )}
                <time className="tabular-nums text-suite-ink-4 suite-num" dateTime={r.createdAt}>
                  {timeAgo(r.createdAt)}
                </time>
              </div>
            </div>
            <ExternalLink
              className="size-3.5 text-suite-ink-4 shrink-0 mt-1"
              strokeWidth={1.75}
            />
          </a>
        </li>
      ))}
    </ol>
  );
}

function StatusIcon({ run }: { run: CiRun }) {
  const base = "size-7 rounded-full inline-flex items-center justify-center ring-1 shrink-0 mt-0.5";
  if (run.status !== "completed") {
    return (
      <span className={cn(base, "bg-suite-warn-bg ring-suite-warn-bg text-suite-warn")}>
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "success") {
    return (
      <span className={cn(base, "bg-suite-good-bg ring-suite-good-bg text-suite-good")}>
        <CheckCircle2 className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "failure" || run.conclusion === "timed_out") {
    return (
      <span className={cn(base, "bg-suite-dang-bg ring-suite-dang-bg text-suite-dang")}>
        <XCircle className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "cancelled" || run.conclusion === "skipped") {
    return (
      <span className={cn(base, "bg-suite-neut-bg ring-suite-line text-suite-neut")}>
        <CircleDashed className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-suite-neut-bg ring-suite-line text-suite-neut")}>
      <AlertCircle className="size-3.5" strokeWidth={2} />
    </span>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
