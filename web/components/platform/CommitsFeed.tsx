import Image from "next/image";
import { ExternalLink, GitCommit, Rocket } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiCommit } from "@/lib/platform/github";

interface Props {
  commits: CiCommit[];
  /** SHA currently deployed — used to mark each commit as deployed/pending. */
  deployedSha?: string | null;
}

export function CommitsFeed({ commits, deployedSha }: Props) {
  if (commits.length === 0) {
    return (
      <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-4 py-6 text-center text-[12px] text-zinc-500">
        No recent commits on <code>main</code>
      </div>
    );
  }
  // Mark commits up to and including deployedSha as "deployed", the rest as "pending"
  let foundDeployed = !deployedSha;
  return (
    <ol className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
      {commits.map((c) => {
        const isDeployed = foundDeployed;
        if (c.sha === deployedSha) foundDeployed = true;
        return (
          <li key={c.sha} className="px-4 py-2.5 hover:bg-zinc-50/60">
            <a
              href={c.htmlUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 min-w-0"
            >
              <span
                className={cn(
                  "size-6 rounded-full inline-flex items-center justify-center text-[10px] font-medium ring-1 shrink-0",
                  isDeployed
                    ? "bg-emerald-50 ring-emerald-200 text-emerald-700"
                    : "bg-amber-50 ring-amber-200 text-amber-700",
                )}
                title={isDeployed ? "Deployed" : "Pending deploy"}
              >
                {isDeployed ? (
                  <Rocket className="size-2.5" strokeWidth={2} />
                ) : (
                  <GitCommit className="size-2.5" strokeWidth={2} />
                )}
              </span>
              <code className="text-[10.5px] font-mono text-zinc-500 bg-zinc-50 rounded px-1.5 py-0.5 shrink-0">
                {c.sha.slice(0, 7)}
              </code>
              <span className="text-[12.5px] text-zinc-900 truncate flex-1">{c.message}</span>
              {c.authorAvatar && (
                <Image
                  src={c.authorAvatar}
                  alt={c.authorLogin ?? c.authorName ?? ""}
                  width={14}
                  height={14}
                  className="rounded-full shrink-0"
                  unoptimized
                />
              )}
              <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
                {c.authorLogin ?? c.authorName ?? "—"}
              </span>
              <time className="text-[10.5px] text-zinc-400 tabular-nums shrink-0">
                {timeAgo(c.authoredAt)}
              </time>
              <ExternalLink className="size-2.5 text-zinc-300 shrink-0" strokeWidth={2} />
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
