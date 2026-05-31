export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ScrollText,
  GitCommit,
  ExternalLink,
  Calendar,
  Globe2,
  Rocket,
  CheckCircle2,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listReleases } from "@/lib/platform/releases";
import { listRecentRuns } from "@/lib/platform/github";
import { githubConfigured } from "@/lib/platform/platform-env";

export default async function ReleasesPage() {
  await requirePlatformAccess();
  const releases = await listReleases();

  // Pull successful deploy.yml runs since the latest curated release so
  // the page reflects every actual production deploy — not just the
  // hand-written markdown notes.
  const latestReleaseDate = releases[0]?.date ?? releases[0]?.releasedAt ?? "";
  const ghOk = await githubConfigured();
  const recentRuns = ghOk ? await listRecentRuns(40) : [];
  const cutoff = latestReleaseDate ? new Date(latestReleaseDate).getTime() : 0;
  const deploysSince = recentRuns.filter(
    (r) =>
      r.name.toLowerCase().includes("deploy") &&
      r.conclusion === "success" &&
      new Date(r.createdAt).getTime() >= cutoff,
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium inline-flex items-center gap-1.5">
            <ScrollText className="size-3" strokeWidth={2} /> Operations
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-zinc-900">
            Releases <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-zinc-500 max-w-2xl">
            Every IOX deployment. Closes C4-SC2 Release management.
          </p>
        </div>
        <Link
          href="/platform/docs/governance/release-procedure"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-zinc-200 bg-white text-[12.5px] text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
        >
          Release procedure <ExternalLink className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      {/* Live deploys since latest curated release */}
      {deploysSince.length > 0 && (
        <section>
          <header className="flex items-baseline justify-between mb-2.5 px-1">
            <div>
              <h2 className="text-[12.5px] font-semibold text-zinc-900 inline-flex items-center gap-1.5">
                <Rocket className="size-3 text-emerald-600" strokeWidth={2} />
                Live deploys since {releases[0]?.version ?? "last release"}
              </h2>
              <p className="text-[11px] text-zinc-500">
                Successful deploy-workflow runs from CI. Reflects every
                production deploy without waiting for a release note.
              </p>
            </div>
            <span className="text-[11px] text-zinc-500 tabular-nums">
              {deploysSince.length} deploys
            </span>
          </header>
          <ol className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 overflow-hidden">
            {deploysSince.map((r) => (
              <li key={r.id} className="px-4 py-2.5 hover:bg-zinc-50/60 transition-colors">
                <Link
                  href={`/platform/cicd/runs/${r.id}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <span className="size-6 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 inline-flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-3" strokeWidth={2} />
                  </span>
                  <code className="text-[10.5px] font-mono text-zinc-500 bg-zinc-50 rounded px-1.5 py-0.5 shrink-0">
                    {r.commitSha.slice(0, 7)}
                  </code>
                  <span className="text-[12.5px] text-zinc-900 truncate flex-1">
                    {r.commitMessage.split("\n")[0]}
                  </span>
                  {r.authorLogin && (
                    <span className="text-[11px] text-zinc-500 shrink-0 hidden sm:inline">
                      {r.authorLogin}
                    </span>
                  )}
                  <time className="text-[10.5px] text-zinc-400 tabular-nums shrink-0">
                    {timeAgo(r.createdAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Curated release notes */}
      <header className="flex items-baseline justify-between mb-2.5 px-1">
        <div>
          <h2 className="text-[12.5px] font-semibold text-zinc-900">Curated release notes</h2>
          <p className="text-[11px] text-zinc-500">
            Hand-written milestones from{" "}
            <code className="text-[10.5px] bg-zinc-100 px-1 py-0.5 rounded">
              docs/operations/release-notes/
            </code>
            .
          </p>
        </div>
      </header>

      {releases.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl px-6 py-12 text-center">
          <div className="size-10 mx-auto rounded-xl bg-zinc-100 text-zinc-500 inline-flex items-center justify-center">
            <ScrollText className="size-4" strokeWidth={1.75} />
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-zinc-900">No releases recorded yet</h3>
          <p className="mt-1 text-[11.5px] text-zinc-500">
            Add a file under <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">docs/operations/release-notes/</code>{" "}
            named <code className="text-[11px] bg-zinc-100 px-1 py-0.5 rounded">YYYY-MM-DD-slug.md</code>.
          </p>
        </div>
      ) : (
        <ol className="relative border-l border-zinc-200 ml-2 space-y-6">
          {releases.map((r, i) => (
            <li key={r.slug} className="ml-5">
              <div className="absolute -left-[7px] mt-1 size-3.5 rounded-full bg-white border-2 border-zinc-900" />
              <article className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-colors">
                <header className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-[10.5px] font-mono font-semibold tracking-wide text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded">
                    {r.version}
                  </span>
                  {i === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 rounded-full px-2 py-0.5">
                      Latest
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <Calendar className="size-2.5" strokeWidth={2} />
                    {r.releasedAt || r.date}
                  </span>
                </header>
                <h2 className="text-[15px] font-semibold text-zinc-900 leading-snug">
                  {r.title.replace(/^Release\s+v[\d.]+\s+—\s+/, "")}
                </h2>
                {r.summary && (
                  <p className="mt-2 text-[12.5px] text-zinc-600 leading-relaxed line-clamp-3">
                    {r.summary}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                  {r.commitRange && (
                    <span className="inline-flex items-center gap-1">
                      <GitCommit className="size-2.5" strokeWidth={2} />
                      <code className="text-[10.5px] bg-zinc-50 px-1 py-0.5 rounded">
                        {r.commitRange}
                      </code>
                    </span>
                  )}
                  {r.productionUrl && (
                    <a
                      href={r.productionUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900"
                    >
                      <Globe2 className="size-2.5" strokeWidth={2} /> {r.productionUrl}
                    </a>
                  )}
                  <Link
                    href={`/platform/docs/operations/release-notes/${r.slug}`}
                    className="ml-auto inline-flex items-center gap-1 text-zinc-700 hover:text-zinc-900 font-medium"
                  >
                    Read full notes <ExternalLink className="size-2.5" strokeWidth={2} />
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
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
