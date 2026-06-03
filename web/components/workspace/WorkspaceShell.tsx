"use client";

/**
 * Shared layout primitives for every module home / landing page.
 *
 * One source of truth for the page frame so all modules render an identical UI
 * and an identical **fill-to-viewport, never-scroll** layout:
 *
 *   main (flex-1 min-h-0 overflow-hidden)   ← provided by each page
 *     WorkspaceShell                         ← this file
 *       ├ left column (flex-col, full height)
 *       │   ├ hero        (shrink-0)
 *       │   ├ search      (shrink-0)
 *       │   ├ controls    (shrink-0, optional)
 *       │   ├ content     (flex-1 min-h-0)   ← CardGrid or a table region
 *       │   ├ note        (shrink-0, optional)
 *       │   └ footer      (shrink-0)
 *       └ right column   (hidden xl:flex, the 400px sidebar slot)
 *
 * The card grid uses `auto-rows-fr` so rows shrink to fit when vertical space is
 * tight (no scroll), while each cell is capped at `max-h-[280px]` so cards never
 * balloon when space is plentiful. Cards are `h-full` and clip their own body.
 */

import Image from "next/image";
import { Children, type ReactNode } from "react";
import { Search, ShieldCheck } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Frame                                                                       */
/* -------------------------------------------------------------------------- */

interface WorkspaceShellProps {
  /** Title block — `<ModuleHero>` on module pages, `<Greeting>` on home. */
  hero: ReactNode;
  /** Controlled search input — typically `<WorkspaceSearch>`. */
  search?: ReactNode;
  /** Optional row of filters / view toggles under the search. */
  controls?: ReactNode;
  /** Main content region (fills remaining height) — usually `<CardGrid>`. */
  children: ReactNode;
  /** Optional small note rendered under the content (e.g. "showing 10 of 24"). */
  note?: ReactNode;
  /** Right-hand 400px column (ProjectPulse or a custom panel). */
  sidebar?: ReactNode;
  /** Footer override — defaults to `<WorkspaceFooter>`. */
  footer?: ReactNode;
}

export function WorkspaceShell({
  hero,
  search,
  controls,
  children,
  note,
  sidebar,
  footer,
}: WorkspaceShellProps) {
  return (
    <div className="h-full w-full px-6 lg:px-8 py-3 lg:py-4 grid grid-cols-1 xl:grid-cols-[1fr_400px] grid-rows-[minmax(0,1fr)] gap-4 lg:gap-6">
      {/* Left column — fills the viewport, never scrolls. */}
      <div className="min-w-0 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 w-full max-w-[1180px] mx-auto flex flex-col">
          <div className="mt-4 lg:mt-8 shrink-0">{hero}</div>
          {search && <div className="mt-4 shrink-0">{search}</div>}
          {controls && <div className="mt-3 shrink-0">{controls}</div>}
          <div className="mt-4 flex-1 min-h-0">{children}</div>
          {note && (
            <div className="shrink-0 pt-2 text-[11px] text-zinc-500">{note}</div>
          )}
        </div>
        {footer ?? <WorkspaceFooter />}
      </div>

      {/* Right column — sidebar slot, hidden below xl like the originals. */}
      {sidebar && <div className="hidden xl:flex min-h-0">{sidebar}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                        */
/* -------------------------------------------------------------------------- */

interface ModuleHeroProps {
  /** Small uppercase label above the title. */
  eyebrow?: string;
  /** Base title text, e.g. "Procure". */
  title: string;
  /** Optional accent suffix rendered in IOX green, e.g. "X". */
  accent?: string;
  /** Supporting line under the title. */
  subtitle: ReactNode;
}

const ACCENT = "#60B78C";

export function ModuleHero({ eyebrow = "Module", title, accent, subtitle }: ModuleHeroProps) {
  return (
    <div className="max-w-2xl">
      <div className="text-[11px] uppercase tracking-[0.12em] text-zinc-500 font-medium mb-1">
        {eyebrow}
      </div>
      <h1 className="text-[clamp(24px,3.2vw,44px)] leading-[1.05] font-semibold tracking-tight text-zinc-900">
        {title}
        {accent && <span style={{ color: ACCENT }}>{accent}</span>}
        <span style={{ color: ACCENT }}>.</span>
      </h1>
      <p className="mt-2 text-[12.5px] text-zinc-500 leading-relaxed max-w-lg">
        {subtitle}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

interface WorkspaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function WorkspaceSearch({ value, onChange, placeholder }: WorkspaceSearchProps) {
  return (
    <div className="relative max-w-md">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400"
        strokeWidth={1.75}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 bg-white border border-zinc-200 rounded-2xl text-sm placeholder:text-zinc-400 shadow-[0_2px_8px_-4px_rgba(24,24,27,0.08)] focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card grid                                                                   */
/* -------------------------------------------------------------------------- */

interface CardGridProps {
  /** Card nodes — each is wrapped in a height-capped, shrink-to-fit cell. */
  children: ReactNode;
  /** When true, renders `emptyState` centred instead of the grid. */
  isEmpty?: boolean;
  emptyState?: ReactNode;
}

/**
 * Responsive module-card wall. Fills its container height; rows shrink to fit
 * so the page never scrolls, and cards cap at 280px so they don't stretch.
 */
export function CardGrid({ children, isEmpty, emptyState }: CardGridProps) {
  if (isEmpty) {
    // Accepts a plain string (styled here) or a full node (e.g. an EmptyState
    // component with its own button) — so it must be a <div>, not a <p>.
    return (
      <div className="h-full grid place-items-center text-center text-sm text-zinc-500">
        {emptyState}
      </div>
    );
  }
  return (
    <div className="h-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 auto-rows-fr">
      {Children.map(children, (child) => (
        <div className="min-h-0 max-h-[280px]">{child}</div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                      */
/* -------------------------------------------------------------------------- */

interface WorkspaceFooterProps {
  /** Left-hand "secured" line. */
  securedLabel?: string;
  /** Right-hand status line. */
  status?: ReactNode;
}

export function WorkspaceFooter({
  securedLabel = "Project data secured and synced in real time",
  status = "All systems normal",
}: WorkspaceFooterProps) {
  return (
    <div className="shrink-0 w-full flex items-center justify-between text-[10.5px] text-zinc-500 px-1 pt-2">
      <div className="flex items-center gap-2.5">
        <Image src="/iox-logo.svg" alt="IOX" width={1338} height={461} className="h-4 w-auto" />
        <span className="text-zinc-300">|</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-zinc-500" strokeWidth={1.75} />
          <span>{securedLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        <span>{status}</span>
      </div>
    </div>
  );
}
