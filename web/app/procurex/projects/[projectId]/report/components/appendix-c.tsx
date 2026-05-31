"use client"

import { ChevronUp } from "lucide-react"

import type { AppendixCData } from "@/modules/procurex/report/appendix-c-data"
import type { TenderReportData } from "@/modules/procurex/report/report-data"

import { AdditionalItemsBlock } from "./appendix-c/additional-items"
import { ArithmeticalErrorsBlock } from "./appendix-c/arithmetical-errors"
import { BoqHighRatesBlock } from "./appendix-c/boq-high-rates"
import { BoqLowRatesBlock } from "./appendix-c/boq-low-rates"
import { CommercialDeviationsBlock } from "./appendix-c/commercial-deviations"
import { ContractualDeviationsBlock } from "./appendix-c/contractual-deviations"
import { DescriptionChangesBlock } from "./appendix-c/description-changes"
import { GenReqHighLowBlock } from "./appendix-c/gen-req-high-low"
import { IttComplianceBlock } from "./appendix-c/itt-compliance"
import { QuantityChangesBlock } from "./appendix-c/quantity-changes"
import { SignatureAuthorityBlock } from "./appendix-c/signature-authority"
import { TenderSumBreakdownBlock } from "./appendix-c/tender-sum-breakdown"

/**
 * APPENDIX C — Detailed Tender Analysis.
 *
 * Figma 1305:98610. Stacks 12 sub-blocks of per-bidder detail. Each
 * stack sub-block repeats the Figma's single-bidder layout once per
 * tenderer, headed by a bidder strip (code · name · tender sum) —
 * see `appendix-c/bidder-stack-block.tsx` for the shared shell.
 *
 * Sub-block status:
 *   - Arithmetical Errors    ✅ live (tender_flag arithmetical_error)
 *   - ITT Compliance         pending (per-bidder review data, matrix layout)
 *   - Tender Sum Breakdown   pending (needs getTenderSumBreakdown fetcher)
 *   - BOQ High-rate          pending (boqReview.highRates per bidder)
 *   - BOQ Low rate           pending (boqReview.lowRates per bidder)
 *   - GR High / Low          pending (boqReview.generalRequirementsRates)
 *   - BOQ description ch.    pending (new tender_flag.kind='description_change')
 *   - Quantity changes       pending (new tender_flag.kind='quantity_change')
 *   - Additional items       pending (boqUnpriced.excluded as v1)
 *   - Commercial Deviations  pending (bidderDeviations.commercial)
 *   - Contractual Deviations pending (bidderDeviations.contractual)
 *   - SIGNATURE AUTHORITY    pending (FotGrouped.signatures matrix)
 */
export function AppendixCSection({
  id,
  data,
  appendixC,
}: {
  id: string
  data: TenderReportData
  appendixC: AppendixCData | null
}) {
  void data

  return (
    <section id={id} className="print:break-before-page scroll-mt-[24px]">
      <div className="bg-white flex flex-col gap-[32px] rounded-[16px] p-[24px] w-full">
        {/* Header */}
        <div className="flex gap-[32px] items-center w-full">
          <h2 className="flex-1 text-[18px] leading-[24px] font-semibold">
            <span className="text-[#c32a4f]">APPENDIX C - </span>
            <span className="text-[#142845]">Detailed Tender Analysis</span>
          </h2>
          <button
            type="button"
            aria-label="Collapse"
            className="flex items-center justify-center rounded-[8px] size-[32px] hover:bg-[rgba(226,237,247,0.5)]"
          >
            <ChevronUp className="size-[16px] text-[#142845]" />
          </button>
        </div>

        {/* Live sub-blocks — all DB-backed, in print/report order */}
        <IttComplianceBlock
          id="appx-c-itt-compliance"
          data={data}
          appendixC={appendixC}
        />
        <TenderSumBreakdownBlock id="appx-c-sum-breakdown" data={data} />
        <DescriptionChangesBlock
          id="appx-c-description-changes"
          rows={data.boqChanges?.descriptionChanges ?? []}
        />
        <QuantityChangesBlock
          id="appx-c-quantity-changes"
          rows={data.boqChanges?.quantityChanges ?? []}
        />
        <ArithmeticalErrorsBlock id="appx-c-arithmetical" appendixC={appendixC} />
        <BoqHighRatesBlock
          id="appx-c-high-rates"
          data={data}
          appendixC={appendixC}
        />
        <BoqLowRatesBlock
          id="appx-c-low-rates"
          data={data}
          appendixC={appendixC}
        />
        <GenReqHighLowBlock
          id="appx-c-gen-req"
          data={data}
          appendixC={appendixC}
        />
        <AdditionalItemsBlock id="appx-c-additional" appendixC={appendixC} />
        <CommercialDeviationsBlock id="appx-c-commercial" appendixC={appendixC} />
        <ContractualDeviationsBlock id="appx-c-contractual" appendixC={appendixC} />
        <SignatureAuthorityBlock
          id="appx-c-signature-authority"
          appendixC={appendixC}
        />
      </div>
    </section>
  )
}
