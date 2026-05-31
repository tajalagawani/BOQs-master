export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ScrollText,
  GitCommit,
  ExternalLink,
  Calendar,
  Globe2,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listReleases } from "@/lib/platform/releases";

export default async function ReleasesPage() {
  await requirePlatformAccess();
  const releases = await listReleases();

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
