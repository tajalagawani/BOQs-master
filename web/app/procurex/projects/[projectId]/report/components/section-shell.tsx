"use client"

import { SectionTitle } from "@/components/suite"

/**
 * Shared shell for a top-level report section. Restyled to the 10X suite
 * library: the numbered title renders through `<SectionTitle>` (mono number
 * + blue underline), with an optional right slot, and the body sits directly
 * beneath inside the report panel (no nested white card — the panel is the
 * surface). Page-break-before on print so each section starts on its own page.
 */
export function SectionShell({
  id,
  number,
  title,
  subtitle,
  right,
  children,
}: {
  id: string
  number: string
  title: string
  subtitle?: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-[24px] print:break-before-page">
      <SectionTitle no={number} title={title} right={right} />
      {subtitle && (
        <p className="mb-3.5 max-w-[78ch] text-[12px] leading-[18px] text-suite-ink-3">
          {subtitle}
        </p>
      )}
      <div>{children}</div>
    </section>
  )
}

/** Empty-state body for sections whose backing data isn't wired yet. */
export function NotImplementedBody({ hint }: { hint: string }) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-suite-ink-4">
        Not implemented
      </span>
      <p className="max-w-[78ch] text-[13px] leading-[1.6] text-suite-ink-2">
        {hint}
      </p>
    </div>
  )
}

/** AED currency formatter from a cents-as-string bigint. */
export function formatAed(cents: string | null): string {
  if (!cents) return "—"
  try {
    const n = Number(BigInt(cents)) / 100
    return `AED ${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  } catch {
    return "—"
  }
}

export function formatVariance(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}
