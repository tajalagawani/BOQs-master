/**
 * 10X Suite — ProcureX primitives.
 * Pixel-faithful ports of procurex-step3-10x-style.html, expressed in suite
 * tokens. These compose the tender-intelligence workspace (roster, intake,
 * extraction, deviations). Use the shared `.suite-tbl` for table chrome.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ── Totals: the 3-up .tbox row ─────────────────────────────────────────── */
export interface SuiteTotalBox {
  k: ReactNode;
  v: ReactNode;
  vs?: ReactNode;
  vsTone?: "dn" | "flat";
}
export function SuiteTotals({ items }: { items: SuiteTotalBox[] }) {
  return (
    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((b, i) => (
        <div
          key={i}
          className="rounded-[14px] border border-suite-line bg-suite-card-soft px-4 py-3.5"
        >
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.06em] text-suite-ink-4">
            {b.k}
          </div>
          <div className="suite-num text-[21px] font-semibold text-suite-ink">
            {b.v}
          </div>
          {b.vs && (
            <div
              className={cn(
                "mt-1 text-[11px]",
                b.vsTone === "dn"
                  ? "text-suite-dang"
                  : b.vsTone === "flat"
                    ? "text-suite-ink-4"
                    : "text-suite-ink-3",
              )}
            >
              {b.vs}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Document strip: BOQ / FOT / CL / COC / SOPR status pills ────────────── */
export type DocState = "on" | "rev" | "off";
export interface SuiteDoc {
  code: string;
  label: ReactNode;
  state: DocState;
}
const DOC_DOT: Record<DocState, string> = {
  on: "bg-suite-green",
  rev: "bg-suite-amber",
  off: "bg-suite-line-2",
};
export function SuiteDocStrip({ docs }: { docs: SuiteDoc[] }) {
  return (
    <div className="mb-[18px] flex flex-wrap gap-2.5">
      {docs.map((d, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-suite-line bg-suite-card-soft px-3 py-2 text-[11.5px] font-medium",
            d.state === "off" ? "text-suite-ink-4" : "text-suite-ink-2",
          )}
        >
          <span className={cn("size-[7px] rounded-full", DOC_DOT[d.state])} />
          <span className="suite-num rounded-md bg-suite-navy-2 px-1.5 py-[3px] text-[9.5px] font-semibold text-white">
            {d.code}
          </span>
          {d.label}
        </span>
      ))}
    </div>
  );
}

/* ── Section band header (code + title + file + status) ─────────────────── */
export function SuiteBand({
  code,
  title,
  file,
  status,
}: {
  code: string;
  title: ReactNode;
  file?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <div className="my-3 flex items-center gap-3">
      <span className="suite-num rounded-lg bg-suite-navy-2 px-[9px] py-[5px] text-[11px] font-semibold text-white">
        {code}
      </span>
      <span className="text-[14px] font-semibold text-suite-ink">{title}</span>
      {file && <span className="text-[11.5px] text-suite-ink-3">{file}</span>}
      <span className="flex-1" />
      {status}
    </div>
  );
}

/* ── AI extraction note ─────────────────────────────────────────────────── */
export function SuiteAINote({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-[10px] border border-[#d6e2f7] bg-suite-blue-soft px-3.5 py-2.5 text-[11.5px] text-suite-ink-2">
      <span className="shrink-0 rounded-md bg-suite-blue px-1.5 py-[3px] text-[9.5px] font-bold tracking-[0.04em] text-white">
        AI
      </span>
      <div>{children}</div>
    </div>
  );
}

/* ── Inline confidence meter ────────────────────────────────────────────── */
export function SuiteConfidence({ pct }: { pct: number }) {
  const low = pct < 0.7;
  return (
    <div className="flex items-center gap-2">
      <span className="h-[5px] w-14 overflow-hidden rounded-[3px] bg-suite-line">
        <span
          className={cn("block h-full rounded-[3px]", low ? "bg-suite-amber" : "bg-suite-blue")}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </span>
      <span className={cn("suite-num text-[11px]", low ? "text-suite-warn" : "text-suite-ink-3")}>
        {pct.toFixed(2)}
      </span>
    </div>
  );
}

/* ── Match / missing tags ───────────────────────────────────────────────── */
export function SuiteMatchTag({
  kind,
  children,
}: {
  kind: "fuzzy" | "none";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
        kind === "fuzzy" ? "bg-suite-warn-bg text-suite-warn" : "bg-suite-dang-bg text-suite-dang",
      )}
    >
      {children}
    </span>
  );
}
export function SuiteMiss({ children }: { children: ReactNode }) {
  return <span className="text-[12.5px] italic text-suite-ink-4">{children}</span>;
}

/* ── Deviation row ──────────────────────────────────────────────────────── */
export function SuiteDeviationRow({
  category,
  statement,
  ref,
  severity,
  ptc,
}: {
  category: ReactNode;
  statement: ReactNode;
  ref?: ReactNode;
  severity?: ReactNode;
  ptc?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr_90px_130px] items-center gap-3.5 border-b border-suite-line-soft px-3.5 py-3 last:border-b-0">
      <span className="justify-self-start rounded-full bg-suite-neut-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-suite-neut">
        {category}
      </span>
      <div className="text-[12.5px] text-suite-ink">
        {statement}
        {ref && <span className="suite-num mt-[3px] block text-[10px] text-suite-ink-4">{ref}</span>}
      </div>
      <div>{severity}</div>
      {ptc && <div className="flex items-center gap-[7px] text-[11px] text-suite-ink-3">{ptc}</div>}
    </div>
  );
}

/* ── Roster cell helpers ────────────────────────────────────────────────── */
export function RosterWho({
  code,
  name,
  meta,
}: {
  code: string;
  name: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="suite-num rounded-lg bg-suite-navy-2 px-[9px] py-[5px] text-[11px] font-semibold text-white">
        {code}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-suite-ink">{name}</div>
        {meta && <div className="text-[11px] text-suite-ink-3">{meta}</div>}
      </div>
    </div>
  );
}

export interface MiniStatPart {
  n: ReactNode;
  label: ReactNode;
  tone?: "warn" | "dang";
}
export function MiniStat({ parts }: { parts: MiniStatPart[] }) {
  return (
    <span className="text-[11.5px] text-suite-ink-2">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-suite-ink-4">·</span>}
          <span
            className={cn(
              "suite-num font-semibold",
              p.tone === "warn"
                ? "text-suite-warn"
                : p.tone === "dang"
                  ? "text-suite-dang"
                  : "",
            )}
          >
            {p.n}
          </span>{" "}
          {p.label}
        </span>
      ))}
    </span>
  );
}
