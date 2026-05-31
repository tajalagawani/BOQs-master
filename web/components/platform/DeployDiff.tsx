import Image from "next/image";
import { CheckCircle2, ArrowDown, ExternalLink, GitCommit } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CiDeployFreshness } from "@/lib/platform/github";

interface Props {
  freshness: CiDeployFreshness | null;
}

export function DeployDiff({ freshness }: Props) {
  if (!freshness) return null;
  const { deployedSha, headSha, commitsBehind, pendingCommits } = freshness;
  const upToDate = commitsBehind === 0 || pendingCommits.length === 0;

  return (
    <section className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <header className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-zinc-100">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-zinc-900">Deploy diff</h2>
          <p className="text-[11px] text-zinc-500">
            Production VM vs <code className="text-[10.5px] bg-zinc-100 px-1 py-0.5 rounded">main</code>.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10.5px] font-medium rounded-full px-2 h-5.5 ring-1",
            upToDate
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : commitsBehind && commitsBehind > 5
                ? "bg-rose-50 text-rose-700 ring-rose-200"
                : "bg-amber-50 text-amber-700 ring-amber-200",
          )}
        >
          {upToDate ? (
            <>
              <CheckCircle2 className="size-2.5" strokeWidth={2} /> Up to date
            </>
          ) : (
            <>{commitsBehind ?? "?"} behind</>
          )}
        </span>
      </header>

      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <ShaCard label="Deployed" sha={deployedSha} />
        <ShaCard label="HEAD on main" sha={headSha} />
      </div>

      {!upToDate && pendingCommits.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium mb-2">
            <ArrowDown className="size-2.5" strokeWidth={2} /> Pending commits
          </div>
          <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden">
            {pendingCommits.map((c) => (
              <li key={c.sha} className="px-3 py-2 hover:bg-zinc-50/60">
                <a
                  href={c.htmlUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 min-w-0"
                >
                  <code className="text-[10.5px] font-mono text-zinc-500 bg-zinc-50 rounded px-1.5 py-0.5 shrink-0">
                    {c.sha.slice(0, 7)}
                  </code>
                  <span className="text-[12px] text-zinc-800 truncate flex-1">{c.message}</span>
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
                  <ExternalLink className="size-2.5 text-zinc-300" strokeWidth={2} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ShaCard({ label, sha }: { label: string; sha: string | null }) {
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-md px-3 py-2.5">
      <div className="text-[10.5px] uppercase tracking-wide text-zinc-500 font-medium">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[13px] font-mono font-semibold text-zinc-900">
        <GitCommit className="size-3 text-zinc-400" strokeWidth={2} />
        {sha ? sha.slice(0, 7) : "—"}
      </div>
    </div>
  );
}
