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
      <div className="bg-suite-good-bg border border-suite-good-bg rounded-2xl px-4 py-5 text-center">
        <div className="size-9 mx-auto rounded-full bg-suite-good-bg text-suite-good inline-flex items-center justify-center">
          <GitPullRequest className="size-4" strokeWidth={1.75} />
        </div>
        <p className="mt-2 text-[12px] text-suite-good font-medium">No open pull requests</p>
        <p className="text-[10.5px] text-suite-good">All work is on main.</p>
      </div>
    );
  }
  return (
    <ol className="bg-white border border-suite-line rounded-2xl divide-y divide-suite-line-soft overflow-hidden">
      {prs.map((pr) => (
        <li key={pr.number} className="px-4 py-3 hover:bg-suite-card-soft">
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
                  ? "bg-suite-neut-bg ring-suite-line text-suite-neut"
                  : "bg-suite-good-bg ring-suite-good-bg text-suite-good",
              )}
            >
              <GitPullRequest className="size-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[12.5px] font-semibold text-suite-ink line-clamp-1">
                  {pr.title}
                </span>
                <span className="text-[11px] text-suite-ink-3 suite-num">#{pr.number}</span>
                {pr.draft && (
                  <span className="text-[10.5px] font-medium text-suite-ink-3 bg-suite-card-soft rounded px-1.5 py-0.5">
                    Draft
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-suite-ink-3 flex-wrap">
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
                <time className="tabular-nums suite-num text-suite-ink-4">{timeAgo(pr.updatedAt)}</time>
              </div>
            </div>
            <ExternalLink className="size-2.5 text-suite-ink-4 shrink-0 mt-1.5" strokeWidth={2} />
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
