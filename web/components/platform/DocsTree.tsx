"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DocNode } from "@/lib/platform/docs";

interface Props {
  nodes: DocNode[];
  /** Roots to start with expanded — usually inferred from the active doc slug */
  initialOpenSlugs?: string[];
  /** Force every directory open on first render. Overrides initialOpenSlugs. */
  expandAll?: boolean;
}

function collectDirSlugs(nodes: DocNode[]): string[] {
  const slugs: string[] = [];
  const walk = (list: DocNode[]) => {
    for (const n of list) {
      if (n.kind === "dir") {
        slugs.push(n.slug);
        if (n.children?.length) walk(n.children);
      }
    }
  };
  walk(nodes);
  return slugs;
}

export function DocsTree({ nodes, initialOpenSlugs = [], expandAll }: Props) {
  const [open, setOpen] = useState<Set<string>>(() =>
    expandAll ? new Set(collectDirSlugs(nodes)) : new Set(initialOpenSlugs),
  );
  const pathname = usePathname() || "";
  const activeSlug = pathname.replace(/^\/platform\/docs\/?/, "");

  return (
    <nav className="text-[13px] leading-relaxed">
      <NodeList
        nodes={nodes}
        open={open}
        onToggle={(slug) => {
          setOpen((prev) => {
            const next = new Set(prev);
            next.has(slug) ? next.delete(slug) : next.add(slug);
            return next;
          });
        }}
        depth={0}
        activeSlug={activeSlug}
      />
    </nav>
  );
}

function NodeList({
  nodes,
  open,
  onToggle,
  depth,
  activeSlug,
}: {
  nodes: DocNode[];
  open: Set<string>;
  onToggle: (slug: string) => void;
  depth: number;
  activeSlug: string;
}) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => {
        const isOpen = open.has(n.slug) || activeSlug.startsWith(n.slug + "/") || activeSlug === n.slug;
        const isActive = activeSlug === n.slug;
        if (n.kind === "dir") {
          return (
            <li key={n.slug}>
              <button
                type="button"
                onClick={() => onToggle(n.slug)}
                className={cn(
                  "w-full flex items-center gap-1.5 rounded-md py-1 px-2 text-suite-ink-2 hover:bg-suite-card-soft transition-colors",
                  "text-left",
                )}
                style={{ paddingLeft: 8 + depth * 14 }}
                aria-expanded={isOpen}
              >
                <ChevronRight
                  className={cn(
                    "size-3 text-suite-ink-3 transition-transform shrink-0",
                    isOpen && "rotate-90",
                  )}
                  strokeWidth={2}
                />
                {isOpen ? (
                  <FolderOpen className="size-3.5 text-suite-ink-3 shrink-0" strokeWidth={1.75} />
                ) : (
                  <Folder className="size-3.5 text-suite-ink-3 shrink-0" strokeWidth={1.75} />
                )}
                <span className="text-[13px] font-medium text-suite-ink truncate">{n.label}</span>
              </button>
              {isOpen && n.children?.length ? (
                <NodeList
                  nodes={n.children}
                  open={open}
                  onToggle={onToggle}
                  depth={depth + 1}
                  activeSlug={activeSlug}
                />
              ) : null}
            </li>
          );
        }
        // file
        return (
          <li key={n.slug}>
            <Link
              href={`/platform/docs/${n.slug}`}
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1 px-2 transition-colors",
                isActive
                  ? "bg-suite-navy text-white"
                  : "text-suite-ink-2 hover:bg-suite-card-soft",
              )}
              style={{ paddingLeft: 8 + depth * 14 + 18 }}
            >
              <FileText
                className={cn("size-3.5 shrink-0", isActive ? "text-white/90" : "text-suite-ink-3")}
                strokeWidth={1.75}
              />
              <span className="text-[13px] truncate">{n.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
