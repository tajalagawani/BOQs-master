import "server-only";

import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const ADR_DIR = resolve(process.cwd(), "..", "docs/architecture/decisions");

export type AdrStatus = "Accepted" | "Proposed" | "Superseded" | "Deprecated" | "Unknown";

export interface Adr {
  /** "0001-prisma-drizzle-coexistence" */
  slug: string;
  number: number;
  title: string;
  status: AdrStatus;
  /** First paragraph after the title — a one-glance summary */
  summary: string;
  /** Optional "Date" field if the doc declares one */
  date?: string;
  /** YYYY-MM-DD of last filesystem modification */
  mtime: string;
  /** Markdown headings count — gives a sense of doc depth */
  sectionCount: number;
}

export async function listAdrs(): Promise<Adr[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(ADR_DIR);
  } catch {
    return [];
  }
  const out: Adr[] = [];
  for (const file of entries) {
    if (!file.endsWith(".md")) continue;
    try {
      const path = join(ADR_DIR, file);
      const [s, content] = await Promise.all([stat(path), readFile(path, "utf8")]);
      out.push(parseAdr(file, content, s.mtimeMs));
    } catch {
      /* skip malformed */
    }
  }
  out.sort((a, b) => a.number - b.number);
  return out;
}

function parseAdr(filename: string, content: string, mtimeMs: number): Adr {
  const slug = filename.replace(/\.md$/, "");
  const numMatch = /^(\d{3,4})/.exec(slug);
  const number = numMatch ? Number(numMatch[1]) : 0;

  // Title: "# 0001. Title" or "# Title"
  const titleMatch = /^#\s+(?:\d+[.)]?\s+)?(.+)$/m.exec(content);
  const title = (titleMatch?.[1] ?? slug)
    .trim()
    .replace(/^[\d.\s]+/, "")
    .replace(/\s*\.$/, "");

  // Status: "## Status" or "**Status**:"
  const statusMatch =
    /##\s*Status\s*\n+([^\n]+)/i.exec(content) ??
    /\*\*Status\*\*\s*[:\-]\s*([^\n]+)/i.exec(content);
  const statusLine = (statusMatch?.[1] ?? "").trim();
  let status: AdrStatus = "Unknown";
  if (/accepted/i.test(statusLine)) status = "Accepted";
  else if (/proposed/i.test(statusLine)) status = "Proposed";
  else if (/superseded/i.test(statusLine)) status = "Superseded";
  else if (/deprecated|rejected/i.test(statusLine)) status = "Deprecated";

  // Date if explicit
  const dateMatch = /\*\*Date\*\*\s*[:\-]\s*([0-9-]+)/i.exec(content);
  const date = dateMatch?.[1];

  // Summary: first paragraph after the title that isn't a heading or attribute
  const lines = content.split(/\r?\n/);
  let summary = "";
  let pastTitle = false;
  let buffer: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (trimmed.startsWith("# ")) pastTitle = true;
      continue;
    }
    if (trimmed.length === 0) {
      if (buffer.length > 0) break;
      continue;
    }
    if (
      trimmed.startsWith("#") ||
      trimmed.startsWith("**Status") ||
      trimmed.startsWith("**Date") ||
      trimmed.startsWith("**Deciders") ||
      trimmed.startsWith("|")
    ) {
      if (buffer.length > 0) break;
      continue;
    }
    buffer.push(trimmed);
  }
  summary = buffer.join(" ").slice(0, 260);
  if (summary.length === 260) summary += "…";

  const sectionCount = (content.match(/^##\s+/gm) ?? []).length;

  return {
    slug,
    number,
    title,
    status,
    summary,
    date,
    mtime: new Date(mtimeMs).toISOString(),
    sectionCount,
  };
}

export function adrStatusTone(s: AdrStatus) {
  switch (s) {
    case "Accepted":
      return "bg-emerald-50 ring-emerald-200 text-emerald-700";
    case "Proposed":
      return "bg-sky-50 ring-sky-200 text-sky-700";
    case "Superseded":
      return "bg-zinc-100 ring-zinc-200 text-zinc-600";
    case "Deprecated":
      return "bg-rose-50 ring-rose-200 text-rose-700";
    default:
      return "bg-amber-50 ring-amber-200 text-amber-700";
  }
}
