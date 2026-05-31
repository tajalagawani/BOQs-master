"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

interface Props {
  entries: TocEntry[];
}

/**
 * Right-rail Table of Contents with scroll-spy. Highlights whichever
 * heading is closest to the top of the viewport.
 */
export function Toc({ entries }: Props) {
  const [activeId, setActiveId] = useState<string>(entries[0]?.id ?? "");

  useEffect(() => {
    if (entries.length === 0) return;
    const ids = entries.map((e) => e.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    function onScroll() {
      const offsets = elements.map((el) => ({
        id: el.id,
        top: el.getBoundingClientRect().top,
      }));
      // Pick the last heading whose top is above 120px from viewport top
      const above = offsets.filter((o) => o.top <= 120);
      const active = above.length > 0 ? above[above.length - 1] : offsets[0];
      setActiveId(active.id);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav className="text-[12px]">
      <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400 font-semibold">
        On this page
      </div>
      <ul className="space-y-0.5 relative">
        {entries.map((e) => {
          const isActive = e.id === activeId;
          return (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className={cn(
                  "block px-2 py-1 rounded text-[12px] leading-snug truncate transition-colors",
                  e.depth === 3 && "pl-5 text-[11.5px]",
                  isActive
                    ? "text-zinc-900 font-medium bg-zinc-100"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50",
                )}
              >
                {e.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
