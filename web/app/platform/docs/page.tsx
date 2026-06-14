export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  FileText,
  ChevronRight,
  ExternalLink,
  ScrollText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getDocsTree, getAllDocs, type DocNode } from "@/lib/platform/docs";
import { DocsTree } from "@/components/platform/DocsTree";

const REPO_HTTPS = "https://github.com/tajalagawani/BOQs-master/tree/main/docs";

export default async function DocsIndexPage() {
  await requirePlatformAccess();
  const tree = await getDocsTree();
  const flat = await getAllDocs();

  const recent = [...flat]
    .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
    .slice(0, 10);

  const sections = tree.filter((n) => n.kind === "dir");

  return (
    <div className="mx-auto max-w-[1480px] px-6 py-6 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8">
      {/* Left rail — tree (no card chrome, matches doc page) */}
      <aside className="self-start lg:sticky lg:top-6 max-h-[calc(100vh-6rem)] overflow-auto pr-2 hidden lg:block">
        <div className="px-2 mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-suite-ink-3 font-semibold">
          <ScrollText className="size-3" strokeWidth={2} /> Docs
        </div>
        <DocsTree nodes={tree} expandAll />
      </aside>

      {/* Right column */}
      <section>
        {/* Sticky page header — mirrors the doc-page treatment */}
        <div className="sticky top-0 z-20 -mx-3 px-3 pt-8 pb-4 mb-8 bg-suite-card-soft/95 backdrop-blur supports-[backdrop-filter]:bg-suite-card-soft/80 border-b border-suite-line">
          <h1 className="text-[clamp(22px,2.2vw,28px)] font-semibold tracking-tight text-suite-ink leading-tight">
            Documentation
          </h1>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11.5px] text-suite-ink-3">
            <span className="suite-num">
              <b className="text-suite-ink-2 font-semibold">{flat.length}</b> files
            </span>
            <span className="suite-num">
              <b className="text-suite-ink-2 font-semibold">{sections.length}</b> sections
            </span>
            <a
              href={REPO_HTTPS}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1 text-suite-ink-2 hover:text-suite-ink"
            >
              View on GitHub <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          </div>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
          {sections.map((s) => {
            const fileCount = countFiles(s);
            const firstFileSlug = firstFile(s)?.slug ?? s.slug;
            return (
              <Link
                key={s.slug}
                href={`/platform/docs/${firstFileSlug}`}
                className="group relative border border-suite-line bg-white rounded-xl p-4 hover:border-suite-line-2 hover:bg-suite-card-soft transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-suite-ink-3 font-semibold">
                      Section
                    </div>
                    <h3 className="mt-0.5 text-[14px] font-semibold text-suite-ink truncate">
                      {s.label}
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-medium text-suite-ink-2 bg-suite-neut-bg rounded-full px-2 py-0.5 shrink-0 suite-num">
                    {fileCount}
                  </span>
                </div>

                <ul className="mt-3 space-y-1 text-[12px] text-suite-ink-2 flex-1">
                  {(s.children ?? [])
                    .filter((c) => c.kind === "file")
                    .slice(0, 4)
                    .map((c) => (
                      <li key={c.slug} className="flex items-center gap-1.5 min-w-0">
                        <FileText
                          className="size-3 text-suite-ink-3 shrink-0"
                          strokeWidth={1.75}
                        />
                        <span className="truncate">{c.label}</span>
                      </li>
                    ))}
                  {fileCount > 4 && (
                    <li className="text-[11px] text-suite-ink-3 pl-4">
                      +{fileCount - 4} more
                    </li>
                  )}
                </ul>

                <div className="mt-3 pt-3 border-t border-suite-line-soft inline-flex items-center gap-1 text-[11px] font-medium text-suite-ink-2 group-hover:text-suite-ink">
                  Open section
                  <ArrowRight
                    className="size-3 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recently updated */}
        <section>
          <header className="flex items-baseline justify-between mb-2.5 px-1">
            <div>
              <h2 className="text-[12.5px] font-semibold text-suite-ink inline-flex items-center gap-1.5">
                <Clock className="size-3 text-suite-ink-3" strokeWidth={2} />
                Recently updated
              </h2>
              <p className="text-[11px] text-suite-ink-3">
                Last {recent.length} markdown files by modification time.
              </p>
            </div>
          </header>
          <ol className="border border-suite-line bg-white rounded-xl divide-y divide-suite-line-soft overflow-hidden">
            {recent.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/platform/docs/${d.slug}`}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-suite-card-soft min-w-0 group"
                >
                  <FileText
                    className="size-3.5 text-suite-ink-3 shrink-0"
                    strokeWidth={1.75}
                  />
                  <span className="truncate text-[12.5px] font-medium text-suite-ink">
                    {d.label}
                  </span>
                  <span className="truncate text-[11px] text-suite-ink-3 hidden sm:inline">
                    /{d.slug}
                  </span>
                  <time className="ml-auto text-[10.5px] text-suite-ink-3 suite-num shrink-0">
                    {d.mtime ? new Date(d.mtime).toLocaleDateString() : ""}
                  </time>
                  <ChevronRight
                    className="size-3.5 text-suite-ink-4 group-hover:text-suite-ink-2 transition-colors shrink-0"
                    strokeWidth={2}
                  />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </div>
  );
}

function countFiles(n: DocNode): number {
  let c = 0;
  const walk = (nodes?: DocNode[]) => {
    for (const x of nodes ?? []) {
      if (x.kind === "file") c++;
      else walk(x.children);
    }
  };
  walk(n.children);
  return c;
}

function firstFile(n: DocNode): DocNode | null {
  for (const c of n.children ?? []) {
    if (c.kind === "file") return c;
    const nested = firstFile(c);
    if (nested) return nested;
  }
  return null;
}
