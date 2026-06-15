import Link from "next/link"
import { Plus } from "lucide-react"

/**
 * Top app-shell shared across the public-facing screens (home,
 * project list, etc.). Visual language matches the Tender Evaluation
 * Report — Pagent Blue primary, Poppins for headings, Inter for body.
 */
export function OmniShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="suite bg-suite-page min-h-screen">
      <header className="bg-white border-b border-suite-line sticky top-0 z-30 print:hidden">
        <div className="max-w-[1400px] mx-auto px-[24px] h-[64px] flex items-center justify-between gap-[16px]">
          <Link
            href="/"
            className="flex items-center gap-[8px] text-[#142845] hover:opacity-90"
          >
            <span
              className="bg-[#142845] flex items-center justify-center rounded-[8px] size-[32px] text-white text-[14px] font-semibold"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              P
            </span>
            <span
              className="text-[18px] leading-[24px] font-semibold tracking-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              ioProcure
            </span>
          </Link>

          <Link
            href="/procurex/projects/new"
            className="inline-flex items-center gap-[6px] bg-[#142845] hover:bg-[#0e1d34] text-white text-[13px] leading-[20px] font-medium px-[16px] h-[36px] rounded-[10px] shrink-0"
          >
            <Plus className="size-[14px]" />
            Create New Tender
          </Link>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto px-[24px] py-[40px]">
        {children}
      </main>
    </div>
  )
}
