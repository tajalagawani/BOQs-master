import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const REPO_ROOT = resolve(process.cwd(), "..");
const DOCS_ROOT = resolve(REPO_ROOT, "docs");

export interface DocNode {
  /** "architecture", "architecture/decisions/0001-prisma-drizzle-coexistence", etc */
  slug: string;
  /** Display name — file/dir basename, with .md stripped + title-cased */
  label: string;
  /** Where it sits in the tree (parent slug, or "" for root) */
  parent: string;
  /** "file" = renderable .md, "dir" = expandable container */
  kind: "file" | "dir";
  /** Children for dirs (computed lazily on tree assembly) */
  children?: DocNode[];
  /** Last-modified, for the docs index page */
  mtime?: number;
}

/** Walk docs/ and return a flat list of nodes. */
async function walk(dir: string, parent: string): Promise<DocNode[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: DocNode[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const abs = join(dir, e.name);
    const rel = relative(DOCS_ROOT, abs).split(sep).join("/");
    if (e.isDirectory()) {
      out.push({ slug: rel, label: humanise(e.name), parent, kind: "dir" });
      out.push(...(await walk(abs, rel)));
    } else if (e.name.endsWith(".md") || e.name.endsWith(".mdx")) {
      const slug = rel.replace(/\.mdx?$/, "");
      const s = await stat(abs);
      out.push({
        slug,
        label: humanise(e.name.replace(/\.mdx?$/, "")),
        parent,
        kind: "file",
        mtime: s.mtimeMs,
      });
    }
  }
  return out;
}

function humanise(s: string): string {
  // "0001-prisma-drizzle-coexistence" → "Prisma Drizzle Coexistence"
  // "release-procedure" → "Release Procedure"
  // "RACI" → "RACI"
  const stripped = s.replace(/^\d{2,4}[-_]/, "");
  if (stripped === stripped.toUpperCase() && stripped.length <= 8) return stripped;
  return stripped
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

/** Build the nested tree from the flat walk. */
export async function getDocsTree(): Promise<DocNode[]> {
  const flat = await walk(DOCS_ROOT, "");
  // Sort: dirs before files within each parent, then by label
  flat.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
  // Hang each node off its parent
  const byParent = new Map<string, DocNode[]>();
  for (const n of flat) {
    if (!byParent.has(n.parent)) byParent.set(n.parent, []);
    byParent.get(n.parent)!.push(n);
  }
  const attach = (parent: string): DocNode[] =>
    (byParent.get(parent) || []).map((n) =>
      n.kind === "dir" ? { ...n, children: attach(n.slug) } : n,
    );
  return attach("");
}

/** Flat list — used by the docs index page. */
export async function getAllDocs(): Promise<DocNode[]> {
  const flat = await walk(DOCS_ROOT, "");
  return flat.filter((n) => n.kind === "file");
}

/** Read a single doc by slug. Returns null if missing. */
export async function getDoc(slug: string): Promise<{
  slug: string;
  title: string;
  content: string;
  mtime: number;
  relPath: string;
} | null> {
  const safeSlug = slug.replace(/^\/+|\/+$/g, "");
  if (safeSlug.includes("..")) return null; // path traversal guard

  for (const ext of [".md", ".mdx"]) {
    const abs = join(DOCS_ROOT, safeSlug + ext);
    try {
      const s = await stat(abs);
      if (!s.isFile()) continue;
      const content = await readFile(abs, "utf-8");
      const title =
        content.match(/^#\s+(.+)$/m)?.[1].trim() ||
        humanise(safeSlug.split("/").pop() || safeSlug);
      return {
        slug: safeSlug,
        title,
        content,
        mtime: s.mtimeMs,
        relPath: "docs/" + safeSlug + ext,
      };
    } catch {
      /* try next ext */
    }
  }
  return null;
}

/** Read a non-docs MD file at the repo root (BACKLOG.md, PLAN.md, etc). */
export async function getRepoRootDoc(filename: string): Promise<string | null> {
  if (filename.includes("/") || filename.includes("..")) return null;
  try {
    return await readFile(resolve(REPO_ROOT, filename), "utf-8");
  } catch {
    return null;
  }
}

export { DOCS_ROOT, REPO_ROOT };
