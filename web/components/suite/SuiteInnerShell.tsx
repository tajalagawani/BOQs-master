"use client";

/**
 * 10X Suite — inner-page shell.
 * The standard frame for every NON-home page: navy topnav, an optional compact
 * header bar (title + actions — NOT the big navy hero), then the page content
 * filling the full viewport width/height with a 4px gutter. The page itself
 * never scrolls; content scrolls inside the fill region.
 *
 *   - fill={false} (default) → content region scrolls internally (forms, charts).
 *   - fill={true}            → fixed, no scroll (host a data table that scrolls
 *                              itself, e.g. the rates library / BOQ workspace).
 *
 * Home / landing pages do NOT use this — they keep SuiteHero + SuitePanel.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SuiteRails } from "./primitives";
import { SuiteTopNav } from "./SuiteTopNav";
import { ChatFab } from "./ChatFab";

export function SuiteInnerShell({
  crumb,
  search,
  onSearch,
  searchPlaceholder,
  notifications = 1,
  header,
  fill = false,
  children,
}: {
  crumb?: ReactNode;
  /** Controlled topnav search. Pass a no-op state if the page has no search. */
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
  notifications?: number;
  /** Compact in-content header (title + actions). Omit for none. */
  header?: ReactNode;
  /** true → fixed/no-scroll (table hosts its own scroll); false → scroll content. */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="suite flex h-full flex-col bg-suite-page">
      <SuiteRails />

      <SuiteTopNav
        search={search}
        onSearch={onSearch}
        searchPlaceholder={searchPlaceholder}
        crumb={crumb}
        notifications={notifications}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1 p-1">
        {header && (
          <div className="flex shrink-0 items-center gap-3 rounded-[10px] border border-suite-line bg-white px-3 py-2">
            {header}
          </div>
        )}
        <div
          className={cn("min-h-0 flex-1", fill ? "overflow-hidden" : "overflow-y-auto")}
        >
          {children}
        </div>
      </div>

      <ChatFab />
    </div>
  );
}

/** Convenience: a standard compact header — title (+ optional subtitle) left,
 *  actions right. The subtitle keeps any descriptive copy the old hero carried
 *  so relaying out to the full-bleed shell never drops page copy. */
export function SuiteInnerHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-suite-ink">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-[11.5px] text-suite-ink-3">{subtitle}</div>
        )}
      </div>
      <span className="flex-1" />
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </>
  );
}
