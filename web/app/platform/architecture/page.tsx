export const dynamic = "force-dynamic";

import Link from "next/link";
import { Network, ExternalLink, FileText, ChevronRight } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { listAdrs, adrStatusTone } from "@/lib/platform/adrs";

export default async function ArchitecturePage() {
  await requirePlatformAccess();
  const adrs = await listAdrs();

  const counts = adrs.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
            <Network className="size-3" strokeWidth={2} /> Architecture
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
            Decision records <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-3 max-w-2xl">
            Every Architecture Decision Record under{" "}
            <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded">
              docs/architecture/decisions/
            </code>
            . Closes C2-SC1 Target architecture definition.
          </p>
        </div>
        <Link
          href="/platform/docs/architecture/architecture-pack"
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border border-suite-line bg-white text-[12.5px] text-suite-ink-2 hover:border-suite-line-2 hover:text-suite-ink"
        >
          Architecture pack <ExternalLink className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      {adrs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {(["Accepted", "Proposed", "Superseded", "Deprecated", "Unknown"] as const)
            .filter((s) => counts[s])
            .map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 h-6 font-medium ring-1 ${adrStatusTone(s)}`}
              >
                {s}
                <span className="text-[10.5px] opacity-80 tabular-nums suite-num">{counts[s]}</span>
              </span>
            ))}
          <span className="ml-auto text-suite-ink-3">
            {adrs.length} ADR{adrs.length === 1 ? "" : "s"}
          </span>
        </div>
      )}

      {adrs.length === 0 ? (
        <div className="bg-white border border-dashed border-suite-line rounded-2xl px-6 py-12 text-center">
          <div className="size-10 mx-auto rounded-xl bg-suite-card-soft text-suite-ink-3 inline-flex items-center justify-center">
            <FileText className="size-4" strokeWidth={1.75} />
          </div>
          <h3 className="mt-3 text-[13px] font-semibold text-suite-ink">
            No ADRs published yet
          </h3>
          <p className="mt-1 text-[11.5px] text-suite-ink-3">
            Drop markdown files into{" "}
            <code className="bg-suite-card-soft rounded px-1 py-0.5 text-[10.5px]">
              docs/architecture/decisions/
            </code>{" "}
            following the <code>NNNN-kebab-slug.md</code> convention.
          </p>
        </div>
      ) : (
        <ol className="bg-white border border-suite-line rounded-2xl divide-y divide-suite-line-soft overflow-hidden">
          {adrs.map((adr) => (
            <li key={adr.slug}>
              <Link
                href={`/platform/docs/architecture/decisions/${adr.slug}`}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-suite-card-soft transition-colors"
              >
                <span className="size-7 rounded-lg bg-suite-navy text-white text-[10.5px] font-mono font-semibold inline-flex items-center justify-center shrink-0 mt-0.5 suite-num">
                  {String(adr.number).padStart(3, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13.5px] font-semibold text-suite-ink">{adr.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2 h-5 text-[10px] font-medium ring-1 ${adrStatusTone(adr.status)}`}
                    >
                      {adr.status}
                    </span>
                  </div>
                  {adr.summary && (
                    <p className="mt-1 text-[12px] text-suite-ink-2 leading-relaxed line-clamp-2">
                      {adr.summary}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10.5px] text-suite-ink-4">
                    <code className="bg-suite-card-soft rounded px-1.5 py-0.5">{adr.slug}.md</code>
                    {adr.date && <span>· dated {adr.date}</span>}
                    <span>· {adr.sectionCount} sections</span>
                    <time className="ml-auto tabular-nums suite-num">
                      modified {new Date(adr.mtime).toLocaleDateString()}
                    </time>
                  </div>
                </div>
                <ChevronRight className="size-3.5 text-suite-ink-4 mt-2 shrink-0" strokeWidth={2} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
