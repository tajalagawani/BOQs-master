/**
 * 10X Suite — ioProcure responsive data table.
 * Thin wrapper over a semantic <table> styled by the global `.suite-tbl` class
 * (+ `tr.low`/`tr.total`/`td.up`/`td.dn`/`th.r`/`td.r` variants in globals.css).
 * Always horizontally scrollable on narrow containers via `overflow-x-auto`
 * plus an optional `minWidth` so wide comparison tables stay legible.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DataTable({
  minWidth,
  className,
  children,
}: {
  /** Min table width (px) — the table scrolls horizontally below this. */
  minWidth?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("suite-tbl overflow-x-auto", className)}>
      <table style={minWidth ? { minWidth } : undefined}>{children}</table>
    </div>
  );
}

/** Mono BOQ/item reference cell content (e.g. "2P3 / A"). */
export function Ref({ children }: { children: ReactNode }) {
  return <span className="suite-num text-[11px] text-suite-ink-2">{children}</span>;
}
