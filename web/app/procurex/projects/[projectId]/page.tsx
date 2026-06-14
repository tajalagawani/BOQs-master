import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  TrendingUp,
  FileText,
  DollarSign,
  ShieldCheck,
  Award,
} from "lucide-react"
import { getOmniTenderDetail } from "@/lib/procurex/data/omni-data"
import { TenderReturns } from "./tender-returns"
import { OmniShell } from "@/components/procurex/omni/omni-shell"

const formatCurrency = (n: number) =>
  `$${Math.round(n).toLocaleString("en-US")}`

export default async function OmniTenderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const detail = await getOmniTenderDetail(projectId)
  if (!detail) notFound()

  return (
    <OmniShell>
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-lg border border-suite-line bg-white flex items-center justify-center hover:bg-suite-card-soft transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-suite-ink-2" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-suite-ink">
            {detail.projectName}
          </h1>
          <p className="text-suite-ink-3 text-sm mt-0.5">Tender Results Overview</p>
        </div>
      </div>

      {/* Executive Summary */}
      <section className="bg-white rounded-2xl border border-suite-line p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <h2 className="text-base font-semibold text-suite-ink">
            Executive Summary
          </h2>
        </div>
        <div className="space-y-3">
          {detail.insights.map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 px-4 py-3 rounded-xl border border-suite-line"
            >
              <TrendingUp className="w-4 h-4 text-[#a855f7] mt-0.5 shrink-0" />
              <p className="text-sm text-suite-ink-2 leading-relaxed">{insight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tender Returns */}
      <section className="bg-white rounded-2xl border border-suite-line p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-suite-ink">
            Tender Returns
          </h2>
          <Link
            href={`/procurex/projects/${detail.projectId}/analysis`}
            className="inline-flex items-center gap-1.5 text-sm text-suite-ink-2 hover:text-suite-ink"
          >
            <FileText className="w-4 h-4" />
            View Detailed Analysis
          </Link>
        </div>

        <TenderReturns rounds={detail.rounds} />
      </section>

      {/* Bidder Overview */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-suite-ink">
          Bidder Overview
        </h2>
        {detail.bidders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-suite-line p-8 text-center text-sm text-suite-ink-3">
            No bidder submissions yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {detail.bidders.map((b) => (
              <div
                key={b.tendererId}
                className="bg-white rounded-2xl border border-suite-line p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Award className="w-5 h-5 text-[#a855f7]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-suite-ink">
                        {b.companyName}
                      </p>
                      <p className="text-xs text-suite-ink-3 mt-0.5">
                        Rank #{b.rank}
                      </p>
                    </div>
                  </div>
                  {b.recommended && (
                    <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-suite-ink-3">
                      <DollarSign className="w-4 h-4" />
                      <span>Total Bid</span>
                    </div>
                    <span className="font-semibold text-suite-ink suite-num">
                      {formatCurrency(b.totalBid)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-suite-ink-3">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Compliance</span>
                    </div>
                    <span className="font-semibold text-suite-ink suite-num">
                      {b.compliancePct}%
                    </span>
                  </div>
                </div>

                <div className="border-t border-suite-line pt-3">
                  <p className="text-xs text-suite-ink-3 mb-2">Qualifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.qualifications.length === 0 ? (
                      <span className="text-xs text-suite-ink-4">—</span>
                    ) : (
                      b.qualifications.map((q) => (
                        <span
                          key={q}
                          className="text-[11px] text-suite-ink-2 bg-suite-neut-bg px-2 py-1 rounded-md"
                        >
                          {q}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
    </OmniShell>
  )
}
