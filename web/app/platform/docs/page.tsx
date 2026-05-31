export const dynamic = "force-dynamic";

import Link from "next/link";
import { BookOpen, FileText, ChevronRight, ExternalLink } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getDocsTree, getAllDocs } from "@/lib/platform/docs";
import { DocsTree } from "@/components/platform/DocsTree";

const REPO_HTTPS = "https://github.com/tajalagawani/BOQs-master/tree/main/docs";

export default async function DocsIndexPage() {
  await requirePlatformAccess();
  const tree = await getDocsTree();
  const flat = await getAllDocs();

  const recent = [...flat]
    .sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0))
    .slice(0, 8);

  const sections = tree.filter((n) => n.kind === "dir");

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Left rail */}
      <aside className="self-start lg:sticky lg:top-28">
        <div className="bg-white border border-zinc-200 rounded-2xl p-3">
          <div className="px-2 py-1.5 mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500 font-semibold">
            <BookOpen className="size-3" strokeWidth={1.75} /> All docs
          </div>
          <DocsTree nodes={tree} />
        </div>
      </aside>

      {/* Right column */}
      <section className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-zinc-900">Docs</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {flat.length} markdown files across {sections.length} sections —
            architecture, security, governance, operations, integrations, quality, tests, performance.
          </p>
        </header>

        {/* Section cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sections.map((s) => (
            <Link
              key={s.slug}
              href={`/platform/docs/${s.children?.find((c) => c.kind === "file")?.slug ?? s.slug}`}
              className="group bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">
                  {s.label}
                </h3>
                <ChevronRight className="size-4 text-zinc-300 group-hover:text-zinc-700 transition-colors" strokeWidth={1.75} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                {countFiles(s)} {countFiles(s) === 1 ? "file" : "files"}
              </p>
              <ul className="mt-3 space-y-0.5 text-[12px] text-zinc-600">
                {(s.children ?? []).slice(0, 4).map((c) => (
                  <li key={c.slug} className="flex items-center gap-1.5">
                    <FileText className="size-3 text-zinc-400" strokeWidth={1.75} />
                    <span className="truncate">{c.label}</span>
                  </li>
                ))}
                {(s.children?.length ?? 0) > 4 && (
                  <li className="text-[11px] text-zinc-400 pl-4">+{(s.children?.length ?? 0) - 4} more</li>
                )}
              </ul>
            </Link>
          ))}
        </div>

        {/* Recent */}
        <section className="bg-white border border-zinc-200 rounded-2xl p-5">
          <header className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Recently updated</h2>
              <p className="text-[11px] text-zinc-500">
                Last 8 markdown files by modification time.
              </p>
            </div>
            <a
              href={REPO_HTTPS}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[11px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1"
            >
              View on GitHub <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          </header>
          <ul className="divide-y divide-zinc-100">
            {recent.map((d) => (
              <li key={d.slug} className="py-2 flex items-center justify-between gap-3">
                <Link
                  href={`/platform/docs/${d.slug}`}
                  className="flex items-center gap-2 min-w-0 text-[13px] text-zinc-800 hover:text-zinc-900"
                >
                  <FileText className="size-3.5 text-zinc-400 shrink-0" strokeWidth={1.75} />
                  <span className="truncate font-medium">{d.label}</span>
                  <span className="text-[11px] text-zinc-400 truncate">/{d.slug}</span>
                </Link>
                <time className="text-[11px] text-zinc-400 shrink-0 tabular-nums">
                  {d.mtime ? new Date(d.mtime).toLocaleDateString() : ""}
                </time>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </div>
  );
}

function countFiles(n: { children?: { kind: "file" | "dir"; children?: { kind: "file" | "dir" }[] }[] }): number {
  let c = 0;
  const walk = (nodes?: { kind: "file" | "dir"; children?: { kind: "file" | "dir" }[] }[]) => {
    for (const n of nodes ?? []) {
      if (n.kind === "file") c++;
      else walk(n.children as { kind: "file" | "dir"; children?: { kind: "file" | "dir" }[] }[]);
    }
  };
  walk(n.children);
  return c;
}
