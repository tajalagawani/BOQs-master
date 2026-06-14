/**
 * 10X Suite — presentational atoms shared across the design system.
 * Faithful to procurex-step3-10x-style.html (.waffle, .chip, .code, .btn, .rail).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { SuiteTone } from "./types";

/* ── Side rails ─────────────────────────────────────────────────────────── */

export function SuiteRails() {
  return (
    <>
      <div className="suite-rail left-0" aria-hidden />
      <div className="suite-rail right-0" aria-hidden />
    </>
  );
}

/* ── Waffle mark ────────────────────────────────────────────────────────────
   The 2×2 dot launcher glyph. `tone="light"` = white tile / navy dots (navy
   surfaces); `tone="dark"` = navy tile / white dots (white surfaces). */

export function Waffle({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const tile =
    tone === "light"
      ? "bg-white"
      : "bg-suite-navy";
  const dot = tone === "light" ? "bg-suite-navy" : "bg-white";
  return (
    <span
      className={cn("grid place-items-center rounded-[9px]", tile, className)}
      aria-hidden
    >
      <span className="grid grid-cols-2 gap-[3px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={cn("size-[4px] rounded-[1.5px]", dot)} />
        ))}
      </span>
    </span>
  );
}

/* ── Chip ───────────────────────────────────────────────────────────────── */

const CHIP_TONE: Record<SuiteTone, string> = {
  good: "text-suite-good bg-suite-good-bg",
  warn: "text-suite-warn bg-suite-warn-bg",
  dang: "text-suite-dang bg-suite-dang-bg",
  neut: "text-suite-neut bg-suite-neut-bg",
};
const CHIP_DOT: Record<SuiteTone, string> = {
  good: "bg-suite-green",
  warn: "bg-suite-amber",
  dang: "bg-suite-red",
  neut: "bg-suite-ink-4",
};

export function SuiteChip({
  tone = "neut",
  children,
  dot = true,
  className,
}: {
  tone?: SuiteTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] font-semibold",
        CHIP_TONE[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-[7px] rounded-full", CHIP_DOT[tone])} />}
      {children}
    </span>
  );
}

/* ── Code badge ─────────────────────────────────────────────────────────── */

export function CodeBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "suite-num inline-flex items-center rounded-lg bg-suite-navy-2 px-[9px] py-[5px] text-[11px] font-semibold text-white",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Button ─────────────────────────────────────────────────────────────────
   Pill button. `variant="dark"` = navy fill; `size="sm"` = compact. Renders an
   <a> when `href` is set, otherwise a <button>. */

interface SuiteButtonProps {
  children: ReactNode;
  href?: string;
  variant?: "default" | "dark";
  size?: "md" | "sm";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
}

export function SuiteButton({
  children,
  href,
  variant = "default",
  size = "md",
  className,
  type = "button",
  onClick,
}: SuiteButtonProps) {
  const classes = cn(
    "inline-flex items-center gap-[7px] rounded-full font-semibold whitespace-nowrap transition-colors",
    size === "sm"
      ? "h-[30px] px-3 text-[11.5px]"
      : "h-9 px-[15px] text-[12.5px]",
    variant === "dark"
      ? "bg-suite-btn border border-suite-btn text-white hover:bg-suite-navy-3"
      : "bg-white border border-suite-line-2 text-suite-ink-2 hover:border-suite-ink-4",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
