"use client"

/**
 * Shared shell for a top-level report section. Renders the numbered
 * title + subtitle and a white card body. Page-break-before on print
 * so each section starts on its own page.
 */
export function SectionShell({
  id,
  number,
  title,
  subtitle,
  children,
}: {
  id: string
  number: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="flex flex-col gap-[16px] scroll-mt-[24px] print:break-before-page"
    >
      <div className="flex flex-col gap-[4px]">
        <span className="font-medium text-[#142845] text-[12px] leading-[16px] uppercase tracking-wider">
          {number}
        </span>
        <h2
          className="font-bold text-[#142845] text-[24px] leading-[32px]"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="font-light text-[#555] text-[13px] leading-[20px]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="bg-white border border-[rgba(226,237,247,0.5)] rounded-[16px] p-[24px] print:border-none print:p-0">
        {children}
      </div>
    </section>
  )
}

/** Empty-state body for sections whose backing data isn't wired yet. */
export function NotImplementedBody({ hint }: { hint: string }) {
  return (
    <div className="flex flex-col gap-[8px] py-[12px]">
      <span className="font-semibold text-[#888] text-[12px] leading-[16px] uppercase tracking-wider">
        Not implemented
      </span>
      <p className="font-light text-[#555] text-[13px] leading-[20px]">
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
