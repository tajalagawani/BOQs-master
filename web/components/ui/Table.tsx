/**
 * Low-level table primitives — ported from roshn/src/components/ui/Table.tsx.
 * Used by DataTable (the editable section tables) and elsewhere.
 *
 * Roshn brand colours have been replaced with IOX zinc tones — semantics
 * (sticky support, group headers, sortable, zebra) preserved exactly.
 */
"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface TableProps {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
  caption?: string;
  zebra?: boolean;
  style?: React.CSSProperties;
}

export function Table({
  children,
  className = "",
  wrapperClassName = "",
  caption,
  zebra = false,
  style,
}: TableProps) {
  return (
    <div
      className={cn("overflow-auto relative", wrapperClassName)}
      role="region"
      aria-label={caption || "Data table"}
      tabIndex={0}
    >
      <table
        className={cn(
          "min-w-full text-sm border-collapse",
          zebra && "[&_tbody_tr:nth-child(even)]:bg-zinc-50/50",
          className,
        )}
        style={style}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

interface TableHeadProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

export function TableHead({ children, sticky, className = "" }: TableHeadProps) {
  return (
    <thead className={cn(sticky && "sticky top-0 z-20", className)}>
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tbody className={className}>{children}</tbody>;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TableRow({
  children,
  className = "",
  onClick,
  selected,
}: TableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-zinc-50",
        selected && "bg-zinc-100 hover:bg-zinc-100",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      aria-selected={selected ? "true" : undefined}
    >
      {children}
    </tr>
  );
}

interface TableHeaderCellProps {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center" | "right";
  scope?: "col" | "row" | "colgroup" | "rowgroup";
  sticky?: "left" | "right";
  stickyOffset?: string;
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
}

export function TableHeaderCell({
  children,
  className = "",
  colSpan,
  rowSpan,
  align = "left",
  scope = "col",
  sticky,
  stickyOffset = "0",
  sortable,
  sorted,
  onSort,
}: TableHeaderCellProps) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  } as const;
  const stickyClass = sticky
    ? `sticky ${sticky === "left" ? "left-0" : "right-0"} z-10 bg-inherit`
    : "";
  const stickyStyle = sticky ? { [sticky]: stickyOffset } : {};

  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      scope={scope}
      className={cn(
        "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500",
        alignClass[align],
        stickyClass,
        sortable && "cursor-pointer select-none hover:bg-zinc-100",
        className,
      )}
      style={stickyStyle}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortable && (
          <span className="text-zinc-400">
            {sorted === "asc" && "↑"}
            {sorted === "desc" && "↓"}
            {!sorted && "↕"}
          </span>
        )}
      </span>
    </th>
  );
}

interface TableCellProps {
  children?: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  numeric?: boolean;
  sticky?: "left" | "right";
  stickyOffset?: string;
  colSpan?: number;
  rowSpan?: number;
}

export function TableCell({
  children,
  className = "",
  align = "left",
  numeric,
  sticky,
  stickyOffset = "0",
  colSpan,
  rowSpan,
}: TableCellProps) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  } as const;
  const stickyClass = sticky
    ? `sticky ${sticky === "left" ? "left-0" : "right-0"} z-10 bg-white`
    : "";
  const stickyStyle = sticky ? { [sticky]: stickyOffset } : {};

  return (
    <td
      className={cn(
        "px-3 py-2 text-[12.5px] text-zinc-700",
        alignClass[align],
        numeric && "tabular-nums font-mono text-[12px]",
        stickyClass,
        className,
      )}
      style={stickyStyle}
      colSpan={colSpan}
      rowSpan={rowSpan}
    >
      {children}
    </td>
  );
}

interface TableGroupHeaderProps {
  children: ReactNode;
  colSpan: number;
  className?: string;
  noBorder?: boolean;
  scope?: "colgroup" | "rowgroup";
}

export function TableGroupHeader({
  children,
  colSpan,
  className = "",
  noBorder,
  scope = "colgroup",
}: TableGroupHeaderProps) {
  return (
    <th
      colSpan={colSpan}
      scope={scope}
      className={cn(
        "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 bg-zinc-50",
        !noBorder && "border-r border-zinc-300",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableFooter({
  children,
  className = "",
  sticky,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <tfoot
      className={cn(
        "bg-zinc-50 font-medium",
        sticky && "sticky bottom-0 z-20",
        className,
      )}
    >
      {children}
    </tfoot>
  );
}

export function TableEmpty({
  colSpan,
  message = "No data available",
  icon,
}: {
  colSpan: number;
  message?: string;
  icon?: ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-12 text-center text-zinc-500"
      >
        <div className="flex flex-col items-center gap-2">
          {icon && <div className="text-zinc-400">{icon}</div>}
          <span>{message}</span>
        </div>
      </td>
    </tr>
  );
}
