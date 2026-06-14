/**
 * 10X Suite — white content panel, section bar, stat tiles and table wrapper.
 * Ports of `.panel`, `.secbar`, `.tile`/`.tiles` and `.tbl` from
 * procurex-step3-10x-style.html.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Waffle } from "./primitives";

/* ── Panel ──────────────────────────────────────────────────────────────────
   `first` floats the panel up over the navy hero (negative top margin). */
export function SuitePanel({
  children,
  first = false,
  fullWidth = false,
  className,
}: {
  children: ReactNode;
  first?: boolean;
  /** Table-heavy pages: span the full viewport with a tight 4px gutter instead
   *  of the centered 1220px panel, so wide data tables get the horizontal room. */
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <div className={fullWidth ? "w-full px-1" : "mx-auto max-w-[1220px] px-6"}>
      <div
        className={cn(
          "suite-shadow bg-suite-panel",
          fullWidth ? "rounded-[14px] p-1" : "rounded-[22px] p-6 pb-7",
          first ? "relative -mt-[58px]" : "mt-[22px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Section bar ────────────────────────────────────────────────────────── */
export function SecBar({
  title,
  count,
  actions,
}: {
  title: ReactNode;
  count?: ReactNode;
  /** Right-aligned action slot (buttons). */
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3 px-0.5">
      <Waffle tone="dark" className="size-6" />
      <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-suite-ink">
        {title}
      </h2>
      {count && <span className="text-[12px] text-suite-ink-3">{count}</span>}
      <span className="flex-1" />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Stat tiles ─────────────────────────────────────────────────────────── */
export interface SuiteTileData {
  /** Uppercase key label. */
  k: ReactNode;
  /** Mono value. */
  v: ReactNode;
  /** Optional muted sub-line. */
  sub?: ReactNode;
  /** Optional accent dot before the label. */
  dot?: string;
}

export function SuiteTiles({
  items,
  cols = 4,
  className,
}: {
  items: SuiteTileData[];
  cols?: 3 | 4 | 6;
  className?: string;
}) {
  const colClass =
    cols === 6
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
      : cols === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={cn("grid gap-2.5", colClass, className)}>
      {items.map((t, i) => (
        <div
          key={i}
          className="rounded-[10px] border border-suite-line bg-suite-card-soft px-3.5 py-3"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.05em] text-suite-ink-4">
            {t.dot && <span className={cn("size-1.5 rounded-full", t.dot)} />}
            {t.k}
          </div>
          <div className="suite-num text-[17px] font-semibold text-suite-ink">
            {t.v}
          </div>
          {t.sub && (
            <div className="mt-0.5 text-[10px] text-suite-ink-3">{t.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Table wrapper ──────────────────────────────────────────────────────────
   Pass a semantic <table>; styling comes from `.suite-tbl` in globals.css. */
export function SuiteTable({ children }: { children: ReactNode }) {
  return <div className="suite-tbl">{children}</div>;
}
