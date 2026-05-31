"use client";

import { useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDashed,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiJob, CiStep } from "@/lib/platform/github";

interface Props {
  jobs: CiJob[];
}

export function JobAccordion({ jobs }: Props) {
  // Default-open: any in-progress job, plus the first failed job
  const initial = new Set<number>();
  for (const j of jobs) {
    if (j.status !== "completed") initial.add(j.id);
    if (j.conclusion === "failure") initial.add(j.id);
  }
  const [open, setOpen] = useState<Set<number>>(initial);

  function toggle(id: number) {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  }

  return (
    <ol className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
      {jobs.map((job) => {
        const isOpen = open.has(job.id);
        return (
          <li key={job.id}>
            <button
              type="button"
              onClick={() => toggle(job.id)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50/60 transition-colors text-left"
            >
              <StatusIcon status={job.status} conclusion={job.conclusion} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-zinc-900 truncate">{job.name}</div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                  {job.durationSec != null && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock className="size-2.5" strokeWidth={2} />
                      {formatDuration(job.durationSec)}
                    </span>
                  )}
                  <span>{job.steps.length} steps</span>
                  {job.runnerName && (
                    <span className="text-zinc-400 truncate">runner: {job.runnerName}</span>
                  )}
                  <a
                    href={job.htmlUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-auto inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900"
                  >
                    Logs <ExternalLink className="size-2.5" strokeWidth={2} />
                  </a>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "size-3.5 text-zinc-400 transition-transform shrink-0",
                  isOpen && "rotate-90",
                )}
                strokeWidth={2}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-3 bg-zinc-50/40 border-t border-zinc-100">
                <ol className="pt-2 space-y-0.5">
                  {job.steps.map((s) => (
                    <StepRow key={s.number} step={s} />
                  ))}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepRow({ step }: { step: CiStep }) {
  const failed = step.conclusion === "failure" || step.conclusion === "timed_out";
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 py-1.5 px-2 rounded text-[12px]",
        failed && "bg-rose-50/50",
      )}
    >
      <StatusIcon
        status={step.status}
        conclusion={step.conclusion}
        compact
      />
      <span className="text-zinc-400 font-mono text-[10.5px] tabular-nums w-6 text-right shrink-0">
        {step.number}
      </span>
      <span className={cn("flex-1 truncate", failed ? "text-rose-900 font-medium" : "text-zinc-800")}>
        {step.name}
      </span>
      {step.durationSec != null && (
        <span className="text-[10.5px] text-zinc-500 tabular-nums shrink-0">
          {formatDuration(step.durationSec)}
        </span>
      )}
    </li>
  );
}

function StatusIcon({
  status,
  conclusion,
  compact,
}: {
  status: string;
  conclusion: string | null;
  compact?: boolean;
}) {
  const sz = compact ? "size-4" : "size-7";
  const ringless = compact;
  const base = compact
    ? "inline-flex items-center justify-center shrink-0"
    : "rounded-full ring-1 inline-flex items-center justify-center shrink-0";
  if (status !== "completed") {
    return (
      <span
        className={cn(sz, base, !ringless && "bg-sky-50 ring-sky-200 text-sky-700")}
      >
        <Loader2
          className={cn(compact ? "size-3" : "size-3.5", "animate-spin", compact && "text-sky-600")}
          strokeWidth={2}
        />
      </span>
    );
  }
  if (conclusion === "success") {
    return (
      <span
        className={cn(sz, base, !ringless && "bg-emerald-50 ring-emerald-200 text-emerald-700")}
      >
        <CheckCircle2
          className={cn(compact ? "size-3" : "size-3.5", compact && "text-emerald-600")}
          strokeWidth={2}
        />
      </span>
    );
  }
  if (conclusion === "failure" || conclusion === "timed_out") {
    return (
      <span
        className={cn(sz, base, !ringless && "bg-rose-50 ring-rose-200 text-rose-700")}
      >
        <XCircle
          className={cn(compact ? "size-3" : "size-3.5", compact && "text-rose-600")}
          strokeWidth={2}
        />
      </span>
    );
  }
  return (
    <span
      className={cn(sz, base, !ringless && "bg-zinc-100 ring-zinc-200 text-zinc-500")}
    >
      <CircleDashed
        className={cn(compact ? "size-3" : "size-3.5", compact && "text-zinc-400")}
        strokeWidth={2}
      />
    </span>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
}
