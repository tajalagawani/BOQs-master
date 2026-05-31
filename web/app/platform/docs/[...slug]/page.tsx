export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ExternalLink, Home, Clock } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getDoc, getDocsTree } from "@/lib/platform/docs";
import { MarkdownView } from "@/components/platform/MarkdownView";
import { DocsTree } from "@/components/platform/DocsTree";

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

  // Pre-expand the parent dirs of the active doc in the tree
  const initialOpen: string[] = [];
  const parts = slugStr.split("/");
  for (let i = 1; i < parts.length; i++) {
    initialOpen.push(parts.slice(0, i).join("/"));
  }

  const crumbs = slugStr.split("/").map((part, i, arr) => ({
    label: humanise(part),
    href: i === arr.length - 1 ? null : `/platform/docs/${arr.slice(0, i + 1).join("/")}`,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="self-start lg:sticky lg:top-28 max-h-[calc(100vh-8rem)] overflow-auto">
        <div className="bg-white border border-zinc-200 rounded-2xl p-3">
          <div className="px-2 py-1.5 mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500 font-semibold">
            Docs
          </div>
          <DocsTree nodes={tree} initialOpenSlugs={initialOpen} />
        </div>
      </aside>

      <section>
        {/* Breadcrumbs */}
        <nav className="mb-4 flex items-center gap-1 text-[12px] text-zinc-500">
          <Link href="/platform/docs" className="flex items-center gap-1 hover:text-zinc-800">
            <Home className="size-3" strokeWidth={1.75} /> Docs
          </Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="size-3 text-zinc-300" strokeWidth={2} />
              {c.href ? (
                <Link href={c.href} className="hover:text-zinc-800">{c.label}</Link>
              ) : (
                <span className="text-zinc-900 font-medium">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <article className="bg-white border border-zinc-200 rounded-2xl p-8">
          {/* Doc header */}
          <header className="mb-6 pb-5 border-b border-zinc-200 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {doc.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-[11.5px] text-zinc-500">
                <code className="text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded">
                  {doc.relPath}
                </code>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" strokeWidth={1.75} />
                  Updated {new Date(doc.mtime).toLocaleString()}
                </span>
              </div>
            </div>
            <a
              href={`${REPO_HTTPS}/${doc.relPath}`}
              target="_blank"
              rel="noreferrer noopener"
              className="h-9 px-3 text-[12px] font-medium text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1.5 border border-zinc-200 hover:border-zinc-300 rounded-full"
            >
              Edit on GitHub <ExternalLink className="size-3" strokeWidth={1.75} />
            </a>
          </header>

          <MarkdownView content={doc.content} />
        </article>
      </section>
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
