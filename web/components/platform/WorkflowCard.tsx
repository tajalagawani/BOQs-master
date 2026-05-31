import { CheckCircle2, XCircle, Loader2, FileCode2, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiWorkflowScorecard } from "@/lib/platform/github";

interface Props {
  workflow: CiWorkflowScorecard;
}

export function WorkflowCard({ workflow: wf }: Props) {
  const rateTone =
    wf.successRate >= 90
      ? "text-emerald-700"
      : wf.successRate >= 70
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <a
      href={wf.htmlUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] transition-all block"
    >
      <header className="flex items-start gap-2.5">
        <span className="size-8 rounded-lg bg-zinc-100 text-zinc-600 inline-flex items-center justify-center shrink-0">
          <FileCode2 className="size-3.5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[12.5px] font-semibold text-zinc-900 truncate">{wf.name}</h3>
          <p className="text-[10.5px] text-zinc-500 truncate">{wf.path}</p>
        </div>
        {wf.state !== "active" && (
          <span className="text-[10.5px] font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5 shrink-0 capitalize">
            {wf.state.replace(/_/g, " ")}
          </span>
        )}
      </header>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-zinc-400 font-medium">Success</div>
          <div className={cn("text-[15px] font-semibold tabular-nums", rateTone)}>
            {wf.recent.length === 0 ? "—" : `${wf.successRate}%`}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-zinc-400 font-medium">Avg</div>
          <div className="text-[15px] font-semibold tabular-nums text-zinc-900 inline-flex items-center gap-1">
            <Clock className="size-2.5 text-zinc-400" strokeWidth={2} />
            {wf.avgDurationSec > 0 ? formatDuration(wf.avgDurationSec) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[9.5px] uppercase tracking-wide text-zinc-400 font-medium">Runs</div>
          <div className="text-[15px] font-semibold tabular-nums text-zinc-900">{wf.recent.length}</div>
        </div>
      </div>

      {/* Sparkline of last-20 conclusions */}
      <div className="mt-3 flex items-center gap-0.5 h-5">
        {wf.recent
          .slice(0, 20)
          .reverse()
          .map((r) => {
            const tone =
              r.status !== "completed"
                ? "bg-sky-400"
                : r.conclusion === "success"
                  ? "bg-emerald-500"
                  : r.conclusion === "failure" || r.conclusion === "timed_out"
                    ? "bg-rose-500"
                    : "bg-zinc-300";
            return (
              <span
                key={r.id}
                className={cn("flex-1 rounded-sm", tone)}
                style={{ height: "100%" }}
                title={`${r.conclusion ?? r.status} · ${timeAgo(r.createdAt)}`}
              />
            );
          })}
        {Array.from({ length: Math.max(0, 20 - wf.recent.length) }).map((_, i) => (
          <span key={`empty-${i}`} className="flex-1 rounded-sm bg-zinc-100" />
        ))}
      </div>

      {wf.lastRun && (
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-2 text-[11px]">
          {wf.lastRun.status !== "completed" ? (
            <Loader2 className="size-3 text-sky-600 animate-spin" strokeWidth={2} />
          ) : wf.lastRun.conclusion === "success" ? (
            <CheckCircle2 className="size-3 text-emerald-600" strokeWidth={2} />
          ) : (
            <XCircle className="size-3 text-rose-600" strokeWidth={2} />
          )}
          <span className="truncate text-zinc-700">
            {wf.lastRun.commitMessage.split("\n")[0]}
          </span>
          <span className="ml-auto text-zinc-400 tabular-nums shrink-0">
            {timeAgo(wf.lastRun.createdAt)}
          </span>
        </div>
      )}
    </a>
  );
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m${s}s`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
