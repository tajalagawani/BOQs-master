"use client"

import { useState } from "react"
import { ReviewSidebar } from "./sidebar"
import { ReviewBreadcrumb } from "./breadcrumb"
import { PageHeaderRow } from "./page-header-row"
import { LockProvider } from "./lock-context"
import { type ReviewRoundKey } from "./round-tabs"
import { SubPageTabs, type AnchorOption } from "./sub-page-tabs"
import { QsSignoff } from "./qs-signoff"
import { BigNumbers } from "./big-numbers"
import {
  FormOfTenderSection,
  TermsAndConditionsSection,
  SignatureAuthoritySection,
  BillsOfQuantitiesSection,
  TenderDocumentsSection,
  TenderBondSection,
  TenderAddendaSection,
  ValueEngineeringSection,
  FormOfMaintenanceSection,
  TenderersQualificationSection,
} from "./compliance-sections"
import { BidderDeviationsBlock } from "./bidder-deviations-block"
import { BoqArithmeticalErrorsBlock } from "./boq-arithmetical-errors"
import { BoqGeneralRequirementsHighLowBlock } from "./boq-gen-req-high-low"
import { BoqUnpricedIncompleteBlock } from "./boq-unpriced-incomplete"
import { NotImplementedBlock } from "./not-implemented-block"
import { PtcReadinessPill } from "../readiness-pill"
import { ProjectTitle } from "../project-title"
import type { BidderSummary } from "../types"

const BOQ_REVIEW_ANCHORS: AnchorOption[] = [
  { id: "boq-arithmetical", label: "Arithmetical Errors" },
  { id: "boq-unpriced", label: "Unpriced / Incomplete Items" },
  { id: "boq-gen-req-high-low", label: "General Requirements High/Low" },
]

const QUALIFICATION_ANCHORS: AnchorOption[] = [
  { id: "dev-contractual", label: "Contractual Deviations" },
  { id: "dev-commercial", label: "Commercial Deviations" },
  { id: "dev-technical", label: "Technical Deviations" },
]

function SectionDivider({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex flex-col gap-[4px] pt-[16px] pb-[8px] border-t border-dashed border-[#d9d9d9]">
      <h2
        className="font-bold text-[#142845] text-[22px] leading-[32px]"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {label}
      </h2>
      {note && (
        <p className="font-light text-[#555] text-[12px] leading-[16px]">
          {note}
        </p>
      )}
    </div>
  )
}

export function Step5ReviewTenderer({
  bidderId,
  onBack,
  ptePresent,
  onPtePresentChange,
  onAppendixAClick,
  reviewData,
  onBidderChange,
}: {
  bidderId: string
  onBack: () => void
  ptePresent: boolean
  onPtePresentChange: (next: boolean) => void
  onAppendixAClick: () => void
  /** Real per-bidder data fetched from `getBidderReviewData`. Optional
   *  for backwards-compat with callers that haven't been wired yet —
   *  when absent, every cell renders as "Not implemented". */
  reviewData?: import("@/modules/procurex/review/types").BidderReviewData | null
  /** Sidebar bidder switcher — when present, picking a new tenderer
   *  navigates to that bidder's review URL. */
  onBidderChange?: (nextBidderId: string) => void
}) {
  const [currentBidderId, setCurrentBidderId] = useState(bidderId)
  /**
   * Build the bidder shape children expect (`BidderSummary`) STRICTLY
   * from real data. Every field we don't yet source from the DB is
   * left at a sentinel (0 / null / empty) and the rendering child
   * (`BigNumbers`, etc.) shows a "Not implemented" affordance for it.
   *
   * NO fallback to mock data. If `reviewData.currentBidder` is null,
   * we render an empty-shell bidder — the page becomes a visible
   * audit of what's missing instead of a quiet lie.
   */
  const realBidder = reviewData?.currentBidder ?? null
  const bidder: BidderSummary = {
    id: realBidder?.id ?? currentBidderId,
    fullName: realBidder?.name ?? "Unknown bidder",
    shortName: realBidder?.code ?? "—",
    rank: realBidder?.rank ?? 0, // 0 → BigNumbers renders "—"
    tenderSum: realBidder?.tenderSumCents
      ? Number(realBidder.tenderSumCents) / 1_000_000
      : 0,
    ptcSum:
      realBidder?.adjustedSumCents ?? realBidder?.tenderSumCents
        ? Number(
            realBidder!.adjustedSumCents ?? realBidder!.tenderSumCents!,
          ) / 1_000_000
        : 0,
    variancePct: 0,
    isLowest: false,
    chips: [],
  }

  // PTC round state — no DB source yet, so default to "draft" and let
  // the UI show the unlocked editing surface. TODO: replace with a
  // `ptc_round` table once we model PTC issuance + response.
  const ptcIssued: boolean | null = null
  const ptcResponseUploaded: boolean | null = null
  const issuedAt: string | null = null
  const defaultRound: ReviewRoundKey = "initial"
  const [round, setRound] = useState<ReviewRoundKey>(defaultRound)
  const [activeSection, setActiveSection] = useState("ptc-summary-top")

  // Initial round is locked once PTC is issued. With ptcIssued ===
  // null (no DB source yet) we treat the round as editable — the QS
  // sees the same draft surface they'd see before issuing.
  const readOnly =
    (round === "initial" && ptcIssued === true) ||
    (round === "ptc1" && ptcResponseUploaded === false)

  const scrollTo = (id: string) => {
    setActiveSection(id)
    setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 30)
  }

  return (
    <LockProvider
      value={{
        currentRoundStatus:
          ptcResponseUploaded === true
            ? "response-received"
            : ptcIssued === true
              ? "issued"
              : "draft",
        issuedAt: ptcIssued === true ? issuedAt : null,
        readOnly,
      }}
    >
    <div className="max-w-[1400px] mx-auto flex items-start gap-[24px] px-[16px]">
      <ReviewSidebar
        bidderFullName={bidder.fullName}
        bidderId={currentBidderId}
        onBidderChange={(id) => {
          setCurrentBidderId(id)
          onBidderChange?.(id)
        }}
        ptePresent={ptePresent}
        onPtePresentChange={onPtePresentChange}
        onBack={onBack}
        ptcIssued={ptcIssued === true}
        tenderers={reviewData?.tenderers ?? []}
      />
      <main id="ptc-summary-top" className="flex-1 min-w-0 flex flex-col gap-[16px] pb-[96px]">
        <ReviewBreadcrumb
          bidderName={bidder.fullName}
          projectName={reviewData?.projectName ?? null}
          onResultsOverviewClick={onBack}
        />
        <PageHeaderRow
          round={round}
          onRoundChange={setRound}
          ptcIssued={ptcIssued === true}
          issuedDate={issuedAt ?? "—"}
          ptcResponseUploaded={ptcResponseUploaded === true}
          onAppendixAClick={onAppendixAClick}
        />
        <PtcReadinessPill />
        <ProjectTitle name={reviewData?.projectName ?? null} />

        <div className="sticky top-[80px] z-30 bg-[#f8f8f8] py-[8px] -mx-[8px] px-[8px]">
          <SubPageTabs
            boqReviewAnchors={BOQ_REVIEW_ANCHORS}
            qualificationsAnchors={QUALIFICATION_ANCHORS}
            onScrollTo={scrollTo}
          />
        </div>

        {/* === PTC SUMMARY (overview content; goes into PTC) === */}
        <div id="ptc-summary-section" className="scroll-mt-[120px]">
          <SectionDivider
            label="PTC Summary"
            note="Overview shown to the tenderer in the PTC pack."
          />
        </div>
        <QsSignoff />
        <BigNumbers bidder={bidder} />
        {(() => {
          // Fallback when the caller hasn't wired `reviewData` yet: emit
          // a synthetic empty section so every cell renders as
          // "Not implemented". Keeps the surface visible during the
          // staged rollout — no caller has to update simultaneously.
          const notImplementedRows = (cols: number) =>
            ({
              rows: [
                {
                  bidderId: currentBidderId,
                  bidderName: bidder.fullName,
                  cells: Array.from(
                    { length: cols },
                    () => ({ kind: "not_implemented" }) as const,
                  ),
                },
              ],
            })
          const sec = (
            key: keyof NonNullable<typeof reviewData>,
            cols: number,
          ) =>
            reviewData && key in reviewData
              ? (reviewData[key] as { rows: import("@/modules/procurex/review/types").BidderRow[] })
              : notImplementedRows(cols)
          return (
            <>
              <FormOfTenderSection
                rows={sec("formOfTender", 4).rows}
                requirements={reviewData?.projectFotRequirements ?? null}
                submission={reviewData?.bidderFotSubmission ?? null}
              />
              <TermsAndConditionsSection
                rows={sec("termsAndConditions", 4).rows}
                requirements={reviewData?.projectCocRequirements ?? null}
                standing={reviewData?.bidderCocStanding ?? null}
              />
              <SignatureAuthoritySection rows={sec("signatureAuthority", 4).rows} />
              <BillsOfQuantitiesSection rows={sec("billsOfQuantities", 4).rows}>
                {/* Arithmetical Errors — real data from tender_flag rows. */}
                <BoqArithmeticalErrorsBlock
                  id="boq-arithmetical"
                  rows={reviewData?.boqReview?.arithmetical ?? []}
                />
                {/* Unpriced / Incomplete — real data from
                    boq_item_rate(is_unpriced=true). */}
                <BoqUnpricedIncompleteBlock
                  id="boq-unpriced"
                  included={reviewData?.boqUnpriced?.included ?? []}
                  excluded={reviewData?.boqUnpriced?.excluded ?? []}
                />
                <BoqGeneralRequirementsHighLowBlock
                  id="boq-gen-req-high-low"
                  high={reviewData?.boqReview?.generalRequirementsRates?.high ?? []}
                  low={reviewData?.boqReview?.generalRequirementsRates?.low ?? []}
                />
              </BillsOfQuantitiesSection>
              <TenderDocumentsSection
                rows={sec("tenderDocuments", 5).rows}
                documents={reviewData?.projectTenderDocuments ?? null}
              />
              <TenderBondSection rows={sec("tenderBond", 2).rows} />
              <TenderAddendaSection
                rows={sec("tenderAddenda", 4).rows}
                project={reviewData?.projectAddenda ?? null}
                standing={reviewData?.bidderAddendaStanding ?? null}
              />
              <ValueEngineeringSection rows={sec("valueEngineering", 4).rows}>
                <NotImplementedBlock
                  title="Value Engineering — Bidder Proposals"
                  hint="Will read VE proposals once the bidder VE extractor lands (no `tender_ve_proposal` table yet)."
                />
              </ValueEngineeringSection>
              <FormOfMaintenanceSection rows={sec("formOfMaintenance", 4).rows} />
              <TenderersQualificationSection rows={sec("tenderersQualification", 4).rows}>
                <BidderDeviationsBlock
                  contractual={reviewData?.bidderDeviations?.contractual ?? []}
                  commercial={reviewData?.bidderDeviations?.commercial ?? []}
                  technical={reviewData?.bidderDeviations?.technical ?? []}
                />
              </TenderersQualificationSection>
            </>
          )
        })()}

        {/* BoQ sub-sections (Arithmetical Errors, Unpriced/Incomplete,
            High/Low, Deviations from Tender Bill) now render INSIDE
            the BILLS OF QUANTITIES card per Figma 1279:62009. */}

        {/* Qualifications and Deviations live INSIDE Section J via
            BidderDeviationsBlock (Contractual / Commercial / Technical).
            BOQ Comparison is covered by the sub-tables inside Section D
            (Arithmetical, Unpriced, General Requirements). No need for
            duplicate bottom-of-page placeholders. */}
      </main>
    </div>
    </LockProvider>
  )
}
