export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ExternalLink, Home, Clock, ScrollText } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getDoc, getDocsTree } from "@/lib/platform/docs";
import {
  MarkdownView,
  extractToc,
  readingTimeMinutes,
} from "@/components/platform/MarkdownView";
import { DocsTree } from "@/components/platform/DocsTree";
import { Toc } from "@/components/platform/markdown/Toc";

const REPO_HTTPS = "https://github.com/tajalagawani/BOQs-master/blob/main";

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  await requirePlatformAccess();
  const { slug } = await params;
  const slugStr = (slug ?? []).join("/");
  const [doc, tree] = await Promise.all([getDoc(slugStr), getDocsTree()]);
  if (!doc) notFound();

  const toc = extractToc(doc.content);
  const minutes = readingTimeMinutes(doc.content);

  const initialOpen: string[] = [];
  const parts = slugStr.split("/");
  for (let i = 1; i < parts.length; i++) {
    initialOpen.push(parts.slice(0, i).join("/"));
  }

  const crumbs = slugStr.split("/").map((part, i, arr) => ({
    label: humanise(part),
    href:
      i === arr.length - 1 ? null : `/platform/docs/${arr.slice(0, i + 1).join("/")}`,
  }));

  return (
    <div className="mx-auto max-w-[1480px] px-6 py-6 grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_220px] gap-8">
      {/* Left rail: doc tree */}
      <aside className="self-start lg:sticky lg:top-6 max-h-[calc(100vh-6rem)] overflow-auto pr-2 hidden lg:block">
        <div className="px-2 py-1.5 mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-suite-ink-3 font-semibold">
          <ScrollText className="size-3" strokeWidth={2} /> Docs
        </div>
        <DocsTree nodes={tree} initialOpenSlugs={initialOpen} expandAll />
      </aside>

      {/* Center: doc body */}
      <section className="min-w-0">
        {/* Sticky top block — breadcrumbs + title + meta. Sticks to the
            top of the scrolling <main>, leaves the sidebars untouched
            because they live in their own grid columns. */}
        <div className="sticky top-0 z-20 -mx-3 px-3 pt-8 pb-4 mb-8 bg-suite-card-soft/95 backdrop-blur supports-[backdrop-filter]:bg-suite-card-soft/80 border-b border-suite-line">
          <nav className="flex items-center gap-1 text-[11.5px] text-suite-ink-3 flex-wrap">
            <Link href="/platform/docs" className="flex items-center gap-1 hover:text-suite-ink-2">
              <Home className="size-3" strokeWidth={1.75} /> Docs
            </Link>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="size-3 text-suite-ink-4" strokeWidth={2} />
                {c.href ? (
                  <Link href={c.href} className="hover:text-suite-ink-2">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-suite-ink font-medium">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="mt-1.5 text-[clamp(20px,2.2vw,26px)] font-semibold tracking-tight text-suite-ink leading-tight">
            {doc.title}
          </h1>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap text-[11px] text-suite-ink-3">
            <code className="text-[11px] bg-suite-card-soft border border-suite-line px-1.5 py-0.5 rounded font-mono">
              {doc.relPath}
            </code>
            <span className="inline-flex items-center gap-1 suite-num">
              <Clock className="size-3" strokeWidth={1.75} />
              {minutes} min read
            </span>
            <span>Updated {new Date(doc.mtime).toLocaleDateString()}</span>
            <a
              href={`${REPO_HTTPS}/${doc.relPath}`}
              target="_blank"
              rel="noreferrer noopener"
              className="ml-auto inline-flex items-center gap-1 text-suite-ink-2 hover:text-suite-ink"
            >
              Edit on GitHub <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          </div>
        </div>

        <MarkdownView content={doc.content} />
      </section>

      {/* Right rail: TOC with scroll-spy */}
      <aside className="self-start lg:sticky lg:top-6 max-h-[calc(100vh-6rem)] overflow-auto hidden xl:block">
        <Toc entries={toc} />
      </aside>
    </div>
  );
}

function humanise(s: string): string {
  const stripped = s.replace(/^\d{2,4}[-_]/, "");
  if (stripped === stripped.toUpperCase() && stripped.length <= 8) return stripped;
  return stripped
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}
