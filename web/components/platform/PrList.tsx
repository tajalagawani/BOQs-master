import Image from "next/image";
import { GitPullRequest, ExternalLink, GitBranch, FileEdit } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiPullRequest } from "@/lib/platform/github";

interface Props {
  prs: CiPullRequest[];
}

export function PrList({ prs }: Props) {
  if (prs.length === 0) {
    return (
      <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl px-4 py-5 text-center">
        <div className="size-9 mx-auto rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center justify-center">
          <GitPullRequest className="size-4" strokeWidth={1.75} />
        </div>
        <p className="mt-2 text-[12px] text-emerald-900 font-medium">No open pull requests</p>
        <p className="text-[10.5px] text-emerald-700">All work is on main.</p>
      </div>
    );
  }
  return (
    <ol className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
      {prs.map((pr) => (
        <li key={pr.number} className="px-4 py-3 hover:bg-zinc-50/60">
          <a
            href={pr.htmlUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-start gap-3 min-w-0"
          >
            <span
              className={cn(
                "size-7 rounded-full ring-1 inline-flex items-center justify-center shrink-0 mt-0.5",
                pr.draft
                  ? "bg-zinc-100 ring-zinc-200 text-zinc-500"
                  : "bg-emerald-50 ring-emerald-200 text-emerald-700",
              )}
            >
              <GitPullRequest className="size-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-zinc-900 line-clamp-1">
                  {pr.title}
                </span>
                <span className="text-[11px] text-zinc-500">#{pr.number}</span>
                {pr.draft && (
                  <span className="text-[10.5px] font-medium text-zinc-500 bg-zinc-100 rounded px-1.5 py-0.5">
                    Draft
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono">
                  <GitBranch className="size-2.5" strokeWidth={2} />
                  {pr.headBranch} → {pr.baseBranch}
                </span>
                {pr.changedFiles > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <FileEdit className="size-2.5" strokeWidth={2} />
                    {pr.changedFiles} files
                  </span>
                )}
                {pr.authorLogin && (
                  <span className="inline-flex items-center gap-1.5 ml-auto">
                    {pr.authorAvatar && (
                      <Image
                        src={pr.authorAvatar}
                        alt={pr.authorLogin}
                        width={14}
                        height={14}
                        className="rounded-full"
                        unoptimized
                      />
                    )}
                    {pr.authorLogin}
                  </span>
                )}
                <time className="tabular-nums text-zinc-400">{timeAgo(pr.updatedAt)}</time>
              </div>
            </div>
            <ExternalLink className="size-2.5 text-zinc-300 shrink-0 mt-1.5" strokeWidth={2} />
          </a>
        </li>
      ))}
    </ol>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
