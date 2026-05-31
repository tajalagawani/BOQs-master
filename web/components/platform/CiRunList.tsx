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
      <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
        <CircleDashed
          className="size-5 mx-auto text-zinc-400"
          strokeWidth={1.75}
        />
        <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">
          No workflow runs returned
        </h3>
        <p className="mt-1 text-[11.5px] text-zinc-500">
          The repository has no CI history yet, or the token lacks{" "}
          <code className="text-[10.5px] bg-zinc-100 px-1 py-0.5 rounded">actions:read</code>.
        </p>
      </div>
    );
  }
  return (
    <ol className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
      {runs.map((r) => (
        <li key={r.id} className="px-4 py-3 hover:bg-zinc-50/60 transition-colors">
          <a
            href={r.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-start gap-3"
          >
            <StatusIcon run={r} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-zinc-900 truncate">
                  {r.name}
                </span>
                <span className="text-[10.5px] font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5 capitalize">
                  {r.event}
                </span>
                {r.attempt > 1 && (
                  <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded px-1.5 py-0.5">
                    Re-run #{r.attempt}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-zinc-700 line-clamp-1">
                {r.commitMessage.split("\n")[0]}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <GitBranch className="size-2.5" strokeWidth={2} />
                  {r.branch}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px]">
                  <GitCommit className="size-2.5" strokeWidth={2} />
                  {r.commitSha.slice(0, 7)}
                </span>
                {r.durationSec != null && (
                  <span className="inline-flex items-center gap-1 tabular-nums">
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
                <time className="tabular-nums text-zinc-400" dateTime={r.createdAt}>
                  {timeAgo(r.createdAt)}
                </time>
              </div>
            </div>
            <ExternalLink
              className="size-3.5 text-zinc-300 shrink-0 mt-1"
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
      <span className={cn(base, "bg-amber-50 ring-amber-200 text-amber-700")}>
        <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "success") {
    return (
      <span className={cn(base, "bg-emerald-50 ring-emerald-200 text-emerald-700")}>
        <CheckCircle2 className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "failure" || run.conclusion === "timed_out") {
    return (
      <span className={cn(base, "bg-rose-50 ring-rose-200 text-rose-700")}>
        <XCircle className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  if (run.conclusion === "cancelled" || run.conclusion === "skipped") {
    return (
      <span className={cn(base, "bg-zinc-100 ring-zinc-200 text-zinc-500")}>
        <CircleDashed className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-zinc-100 ring-zinc-200 text-zinc-500")}>
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
