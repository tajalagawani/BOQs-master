import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd(), "..");
const RELEASES_DIR = resolve(REPO_ROOT, "docs/operations/release-notes");

export interface ReleaseSummary {
  slug: string;
  /** "v0.1.0" extracted from the `# Release vX.Y.Z` title when present */
  version: string;
  title: string;
  releasedAt: string;
  /** YYYY-MM-DD parsed from the filename prefix or frontmatter */
  date: string;
  productionUrl?: string;
  commitRange?: string;
  /** Short description — first non-heading paragraph */
  summary: string;
  mtime: number;
}

export async function listReleases(): Promise<ReleaseSummary[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(RELEASES_DIR);
  } catch {
    return [];
  }

  const out: ReleaseSummary[] = [];
  for (const filename of entries) {
    if (!filename.endsWith(".md")) continue;
    const abs = join(RELEASES_DIR, filename);
    const s = await stat(abs);
    const content = await readFile(abs, "utf-8");

    const title =
      content.match(/^#\s+(.+)$/m)?.[1].trim() ??
      filename.replace(/\.md$/, "");
    const versionMatch = title.match(/v\d+\.\d+\.\d+/);
    const version = versionMatch?.[0] ?? "—";

    const dateFromName = filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    const releasedAt =
      content.match(/\*\*Released:\*\*\s*([^\n]+)/)?.[1].trim() ?? dateFromName;
    const productionUrl =
      content.match(/\*\*Production URL:\*\*\s*([^\s\n]+)/)?.[1].trim();
    const commitRange = content
      .match(/\*\*Commit range:\*\*\s*`([^`]+)`/)?.[1]
      .trim();

    // Take the first non-heading non-blockquote paragraph as the summary
    const summary =
      content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .find(
          (p) =>
            p.length > 0 &&
            !p.startsWith("#") &&
            !p.startsWith(">") &&
            !p.startsWith("**Released") &&
            !p.startsWith("**Commit") &&
            !p.startsWith("**Production"),
        ) ?? "";

    out.push({
      slug: filename.replace(/\.md$/, ""),
      version,
      title,
      releasedAt,
      date: dateFromName,
      productionUrl,
      commitRange,
      summary: summary.replace(/\s+/g, " ").slice(0, 240),
      mtime: s.mtimeMs,
    });
  }

  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

export async function getRelease(slug: string): Promise<{
  slug: string;
  title: string;
  content: string;
  releasedAt: string;
  mtime: number;
} | null> {
  if (slug.includes("/") || slug.includes("..")) return null;
  const abs = join(RELEASES_DIR, slug + ".md");
  try {
    const s = await stat(abs);
    if (!s.isFile()) return null;
    const content = await readFile(abs, "utf-8");
    const title =
      content.match(/^#\s+(.+)$/m)?.[1].trim() ?? slug;
    const releasedAt =
      content.match(/\*\*Released:\*\*\s*([^\n]+)/)?.[1].trim() ?? "";
    return { slug, title, content, releasedAt, mtime: s.mtimeMs };
  } catch {
    return null;
  }
}
