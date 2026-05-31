"use client"

import { ComplianceCard, ComplianceIcons } from "./compliance-card"
import type {
  BidderAddendaStanding,
  BidderCocStanding,
  BidderFotSubmission,
  BidderRow,
  ProjectAddenda,
  ProjectCocRequirements,
  ProjectFotRequirements,
  ProjectTenderDocuments,
} from "@/modules/procurex/review/types"

/**
 * Every compliance section now takes a `rows` prop sourced from
 * `getBidderReviewData` (server). Section copy (title, description,
 * criteria cards, column headers) stays here since it's static design
 * content — only the cell values flow in.
 *
 * If a row's cells are `not_implemented`, the `<Pill />` inside
 * `ComplianceCard` renders the slate "Not implemented" affordance.
 * That means a section never has to disappear when its data isn't
 * wired yet — the QS sees the gap right in the bidder grid.
 */

interface SectionProps {
  rows: BidderRow[]
}

/** Map server `BidderRow` → `ComplianceCard`'s expected row shape.
 *  Forwards `bidderId` so the textarea + toggle can persist against
 *  the right `tender_review_row(tendererId, sectionKey)` pair, and
 *  forwards `includeInPtc` so the toggle hydrates with the persisted
 *  default instead of falling back to `true`. */
function toCardRows(rows: BidderRow[]) {
  return rows.map((r) => ({
    bidderId: r.bidderId,
    bidder: r.bidderName,
    cells: r.cells,
    qsComment: r.qsComment ?? undefined,
    includeInPtc: r.includeInPtc,
  }))
}

function fmtDays(n: number | null): string {
  return typeof n === "number" ? `${n} days` : "—"
}

function fmtPct(n: number | null): string {
  return typeof n === "number" ? `${n}%` : "—"
}

export function FormOfTenderSection({
  rows,
  requirements,
  submission,
}: SectionProps & {
  /** Project FOT requirements — the baseline every bidder must comply
   *  with. Null when the project's own FOT hasn't been extracted yet. */
  requirements?: ProjectFotRequirements | null
  /** The current bidder's submitted FOT values. Null when the bidder
   *  hasn't uploaded an FOT yet or no successful extraction. */
  submission?: BidderFotSubmission | null
}) {
  const reqDays = requirements?.timeForCompletion.totalDays ?? null
  const subDays = submission?.timeForCompletion.totalDays ?? null
  const reqOhpV = requirements?.ohpMarkup.variationProvisionalPercent ?? null
  const subOhpV = submission?.ohpMarkup.variationProvisionalPercent ?? null
  const reqOhpN = requirements?.ohpMarkup.nominatedSubcontractorPercent ?? null
  const subOhpN = submission?.ohpMarkup.nominatedSubcontractorPercent ?? null
  const reqValid = requirements?.tenderValidity.validityDays ?? null
  const subValid = submission?.tenderValidity.validityDays ?? null
  const reqCurrency = requirements?.fotSubmission.currency ?? null
  const subCurrency = submission?.fotSubmission.currency ?? null

  return (
    <ComplianceCard
      id="compliance-fot"
      sectionKey="fot"
      letter="A"
      title="FORM OF TENDER"
      description="Review the submitted Form of Tender against the project's FOT requirements. Four mandatory criteria — FOT Submission, Time for Completion, OHP Markup, Tender Validity — must all be met to count as compliant."
      criteria={[
        {
          icon: ComplianceIcons.fot,
          title: "FOT Submission",
          description: (
            <>
              Currency required: <Req>{reqCurrency ?? "—"}</Req> · Submitted:{" "}
              <Sub>{subCurrency ?? "—"}</Sub>
            </>
          ),
        },
        {
          icon: ComplianceIcons.time,
          title: "Time for Completion",
          description: (
            <>
              Programme duration required:{" "}
              <Req>{fmtDays(reqDays)}</Req> · Submitted:{" "}
              <Sub>{fmtDays(subDays)}</Sub>
            </>
          ),
        },
        {
          icon: ComplianceIcons.ohp,
          title: "OHP Markup",
          description: (
            <>
              Variation/Provisional OHP required:{" "}
              <Req>{fmtPct(reqOhpV)}</Req> · Submitted:{" "}
              <Sub>{fmtPct(subOhpV)}</Sub>
              <br />
              Nominated Subcontractor OHP required:{" "}
              <Req>{fmtPct(reqOhpN)}</Req> · Submitted:{" "}
              <Sub>{fmtPct(subOhpN)}</Sub>
            </>
          ),
        },
        {
          icon: ComplianceIcons.validity,
          title: "Tender Validity",
          description: (
            <>
              Validity period required:{" "}
              <Req>{fmtDays(reqValid)}</Req> · Submitted:{" "}
              <Sub>{fmtDays(subValid)}</Sub>
            </>
          ),
        },
      ]}
      columns={["FOT", "Time for Completion", "OHP %", "Tender Validity"]}
      rows={toCardRows(rows)}
    />
  )
}

function Req({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-[#142845]">{children}</span>
}

function Sub({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-[#2a69b9]">{children}</span>
}

function fmtPercent(n: number | null): string {
  return typeof n === "number" ? `${n}%` : "—"
}

function fmtCents(cents: string | null): string {
  if (!cents) return "—"
  const n = Number(cents)
  if (!Number.isFinite(n)) return "—"
  // cents → AED with thousands separators
  return `AED ${(n / 100).toLocaleString("en", { maximumFractionDigits: 2 })}`
}

export function TermsAndConditionsSection({
  rows,
  requirements,
  standing,
}: SectionProps & {
  /** Project COC requirements — the baseline every bidder must comply
   *  with. Null when the project COC hasn't been extracted yet. */
  requirements?: ProjectCocRequirements | null
  /** Bidder's COC standing — their own COC verdict (rare) + deviation
   *  counts (the normal signal). Null when no data yet. */
  standing?: BidderCocStanding | null
}) {
  const reqTerms = requirements?.termsAndConditions
  const reqPay = requirements?.paymentTerms
  const subTerms = standing?.cocVerdict?.termsAndConditions ?? null
  const subPay = standing?.cocVerdict?.paymentTerms ?? null
  const contractualDevs = standing?.deviationCounts.contractual ?? 0
  const commercialDevs = standing?.deviationCounts.commercial ?? 0

  return (
    <ComplianceCard
      id="compliance-tac"
      sectionKey="tac"
      letter="B"
      title="TERMS AND CONDITIONS"
      description="Review the submitted Conditions of Contract against the project's COC baseline. Two criteria — Terms and Conditions + Payment Terms — both must be met to count as compliant."
      criteria={[
        {
          icon: ComplianceIcons.fot,
          title: "Terms and Conditions",
          description: (
            <>
              Contract form:{" "}
              <Req>{reqTerms?.contractForm ?? "—"}</Req>
              {reqTerms?.contractFormCode ? (
                <> ({reqTerms.contractFormCode})</>
              ) : null}
              {subTerms?.contractForm ? (
                <> · Bidder: <Sub>{subTerms.contractForm}</Sub></>
              ) : null}
              <br />
              Governing law:{" "}
              <Req>{reqTerms?.governingLaw ?? "—"}</Req>
              <br />
              Contractual deviations raised by bidder:{" "}
              <Sub>{contractualDevs}</Sub>
            </>
          ),
        },
        {
          icon: ComplianceIcons.coins,
          title: "Payment Terms",
          description: (
            <>
              Advance: <Req>{fmtPercent(reqPay?.advancePaymentPercent ?? null)}</Req>
              {typeof subPay?.advancePaymentPercent === "number" ? (
                <> · Bidder: <Sub>{fmtPercent(subPay.advancePaymentPercent)}</Sub></>
              ) : null}
              {" · "}Performance bond:{" "}
              <Req>{fmtPercent(reqPay?.performanceBondPercent ?? null)}</Req>
              <br />
              Retention: <Req>{fmtPercent(reqPay?.retentionPercent ?? null)}</Req>
              {reqPay?.retentionCapCents ? (
                <> (cap <Req>{fmtCents(reqPay.retentionCapCents)}</Req>)</>
              ) : null}
              {" · "}LDs/day:{" "}
              <Req>{fmtCents(reqPay?.ldPerDayCents ?? null)}</Req>
              <br />
              Commercial deviations raised by bidder:{" "}
              <Sub>{commercialDevs}</Sub>
            </>
          ),
        },
      ]}
      columns={["Terms and Conditions", "Payment terms"]}
      rows={toCardRows(rows)}
      qsCommentAiSuggestion
      qsCommentViewAnchor="compliance-qual"
    />
  )
}

export function SignatureAuthoritySection({ rows }: SectionProps) {
  return (
    <ComplianceCard
      id="compliance-sigauth"
      sectionKey="sigauth"
      letter="C"
      title="SIGNATURE AUTHORITY"
      description="Confirm that tender submission has been executed by an authorised signatory and supported by authorisation documentation where applicable."
      criteria={[
        {
          icon: ComplianceIcons.fot,
          title: "Power of Attorney",
          description:
            "Tenderer must provide a valid Power of Attorney or equivalent authorisation document confirming the signatory's authority to execute the tender submission on behalf of the organisation.",
        },
      ]}
      columns={["Power of Attorney"]}
      rows={toCardRows(rows)}
    />
  )
}

export function BillsOfQuantitiesSection({
  rows,
  children,
}: SectionProps & { children?: React.ReactNode }) {
  return (
    <ComplianceCard
      id="compliance-boqs"
      sectionKey="boqs"
      letter="D"
      title="BILLS OF QUANTITIES"
      description="Review the submitted BOQ for pricing accuracy, completeness, and deviations from the issued tender requirements. Any comments from the Bills of Quantity section, should be added as a PTC in commercial deviation in Section K."
      criteria={[
        {
          icon: ComplianceIcons.alert,
          title: "Arithmetical Errors",
          description:
            "Tenderer must ensure that all calculations, extensions, totals, and carried-forward values are mathematically accurate and consistent across the submission.",
        },
        {
          icon: ComplianceIcons.banknote,
          title: "Unpriced / Incomplete Items",
          description:
            "Tenderer cannot have any unpriced / incomplete items, BOQ description changes, BOQ quantity changes or additional items",
        },
        {
          icon: ComplianceIcons.chart,
          title: "High / Low Analysis",
          description:
            "Review abnormal pricing variances against benchmark rates to identify potential commercial risks, underpricing, overpricing, or scope misunderstanding.",
        },
        {
          icon: ComplianceIcons.banknote,
          title: "Deviations from Tender Bill",
          description:
            "Tenderer must not introduce unauthorised modifications, omissions, substitutions, or deviations from the issued tender BOQ structure and requirements.",
        },
      ]}
      // Section D has no per-bidder status row — line-item review is
      // surfaced via the BOQ sub-sections (Arithmetical Errors,
      // Unpriced/Incomplete, High/Low Analysis, Deviations) below.
      columns={[]}
      rows={toCardRows(rows)}
      hideTable
    >
      {children}
    </ComplianceCard>
  )
}

function docStatus(present: boolean, filename: string | null): React.ReactNode {
  return present ? (
    <Sub>Issued{filename ? ` (${filename})` : ""}</Sub>
  ) : (
    <span className="font-semibold text-[#c0392b]">Not issued</span>
  )
}

export function TenderDocumentsSection({
  rows,
  documents,
}: SectionProps & {
  /** Project tender-doc presence per category. */
  documents?: ProjectTenderDocuments | null
}) {
  return (
    <ComplianceCard
      id="compliance-tender-docs"
      sectionKey="tender-docs"
      letter="E"
      title="TENDER DOCUMENTS"
      description="Confirm the project has issued all required tender documents and that the bidder has reviewed each one. Five categories — ITT, Conditions of Contract, SOPR, Drawings, Technical Specification."
      criteria={[
        {
          icon: ComplianceIcons.badgeCheck,
          title: "ITT Acknowledgement",
          description: (
            <>
              Project: {docStatus(
                (documents?.itt.count ?? 0) > 0,
                documents?.itt.filename ?? null,
              )}
            </>
          ),
        },
        {
          icon: ComplianceIcons.fot,
          title: "Conditions of Contract",
          description: (
            <>
              Project: {docStatus(
                (documents?.coc.count ?? 0) > 0,
                documents?.coc.filename ?? null,
              )}
            </>
          ),
        },
        {
          icon: ComplianceIcons.checkSquare,
          title: "Schedule of Project Requirements (SOPR)",
          description: (
            <>
              Project: {docStatus(
                (documents?.sopr.count ?? 0) > 0,
                documents?.sopr.filename ?? null,
              )}
            </>
          ),
        },
        {
          icon: ComplianceIcons.folder,
          title: "Drawings",
          description: (
            <>
              Project: {docStatus(
                (documents?.drawings.count ?? 0) > 0,
                documents?.drawings.filename ?? null,
              )}
            </>
          ),
        },
        {
          icon: ComplianceIcons.ruler,
          title: "Specifications",
          description: (
            <>
              Project: {docStatus(
                (documents?.specifications.count ?? 0) > 0,
                documents?.specifications.filename ?? null,
              )}
            </>
          ),
        },
      ]}
      columns={[
        "ITT",
        "Conditions of Contract",
        "SOPR",
        "Drawings",
        "Specifications",
      ]}
      rows={toCardRows(rows)}
    />
  )
}

export function TenderBondSection({ rows }: SectionProps) {
  return (
    <ComplianceCard
      id="compliance-bond"
      sectionKey="bond"
      letter="F"
      title="TENDER BOND"
      description="Review the submitted tender bond to confirm compliance with the tender requirements, including value, validity period, issuing bank, format, and enforceability."
      criteria={[
        {
          icon: ComplianceIcons.documentDuplicate,
          title: "Tender Bond",
          description:
            "Tenderer must submit the tender board with amount, expiry, any deviations.",
        },
        {
          icon: ComplianceIcons.fot,
          title: "Approved List of Banks",
          description:
            "Tenderer to ensure that all the bank guarantees/bonds shall be issued from banks included in the approved list.",
        },
      ]}
      columns={["Tender Bond", "Approved List of Banks"]}
      rows={toCardRows(rows)}
    />
  )
}

export function TenderAddendaSection({
  rows,
  project,
  standing,
}: SectionProps & {
  project?: ProjectAddenda | null
  standing?: BidderAddendaStanding | null
}) {
  const issued = project?.count ?? 0
  const acknowledged = standing?.acknowledgedCount ?? 0
  const signed = standing?.signed ?? false
  return (
    <ComplianceCard
      id="compliance-addenda"
      sectionKey="addenda"
      letter="G"
      title="TENDER ADDENDA"
      description="Confirm all issued tender addenda have been acknowledged in the bidder's Form of Tender."
      criteria={[
        {
          icon: ComplianceIcons.edit,
          title: "Addenda acknowledged",
          description: (
            <>
              Issued by project: <Req>{issued}</Req> · Acknowledged by
              bidder: <Sub>{acknowledged}</Sub>
            </>
          ),
        },
        {
          icon: ComplianceIcons.layers,
          title: "Pricing impact",
          description:
            "Per-addendum BoQ impact tracking — not modelled yet (no addenda↔BoQ link).",
        },
        {
          icon: ComplianceIcons.help,
          title: "Open queries",
          description:
            "Per-addendum query tracking — not modelled yet (no addenda-query store).",
        },
        {
          icon: ComplianceIcons.shield,
          title: "Signed",
          description: (
            <>
              Bidder FOT signature blocks present:{" "}
              <Sub>{signed ? "Yes" : "No"}</Sub>
            </>
          ),
        },
      ]}
      columns={["Acknowledged", "Pricing", "Queries", "Signed"]}
      rows={toCardRows(rows)}
    />
  )
}

export function ValueEngineeringSection({
  rows,
  children,
}: SectionProps & { children?: React.ReactNode }) {
  return (
    <ComplianceCard
      id="compliance-ve"
      sectionKey="ve"
      letter="H"
      title="VALUE ENGINEERING / SCHEDULE OF ALTERNATIVES"
      description="Review all proposed value engineering options, alternatives, substitutions, and qualification proposals submitted by the tenderer to assess commercial, technical, programme, and compliance impacts."
      criteria={[
        {
          icon: ComplianceIcons.chart,
          title: "Value Engineering Proposals",
          description:
            "Tenderer may submit value engineering proposals to provide cost, programme, or operational benefits without compromising project requirements or performance standards.",
        },
        {
          icon: ComplianceIcons.searchCircle,
          title: "Alternative Materials / Systems",
          description:
            "Tenderer may submit alternative materials, systems, or products and include technical details to ensure technical compliance and commercial impact.",
        },
        {
          icon: ComplianceIcons.fot,
          title: "Cost / Programme Impact",
          description:
            "Tenderer must ensure that all alternatives provide a cost or programme benefit.",
        },
      ]}
      // Section H replaces the per-bidder pill table with a row-level
      // VE proposals table — rendered as a child below the criteria
      // cards (see Figma 1287:41097).
      columns={[]}
      rows={toCardRows(rows)}
      hideTable
    >
      {children}
    </ComplianceCard>
  )
}

export function FormOfMaintenanceSection({ rows }: SectionProps) {
  return (
    <ComplianceCard
      id="compliance-maint"
      sectionKey="maint"
      letter="I"
      title="FORM OF MAINTENANCE AGREEMENT"
      description="Verify compliance with the required maintenance agreement, including service obligations, warranty commitments, and defect liability provisions."
      criteria={[
        {
          icon: ComplianceIcons.fot,
          title: "Form of Maintenance Agreement",
          description:
            "Tenderer must review, acknowledge, and comply with the issued Form of Maintenance Agreement and associated maintenance obligations.",
        },
        {
          icon: ComplianceIcons.listBullet,
          title: "Warranty Requirements",
          description:
            "Confirm compliance with the required warranty periods, maintenance responsibilities, and defect rectification obligations.",
        },
        {
          icon: ComplianceIcons.listBullet,
          title: "Service Response Commitments",
          description:
            "Review proposed maintenance response times, servicing obligations, and operational support commitments where applicable.",
        },
      ]}
      columns={[
        "Form of Maintenance Agreement",
        "Warranty Requirements",
        "Service Response Commitments",
      ]}
      rows={toCardRows(rows)}
    />
  )
}

export function TenderersQualificationSection({
  rows,
  children,
}: SectionProps & { children?: React.ReactNode }) {
  return (
    <ComplianceCard
      id="compliance-qual"
      sectionKey="qual"
      letter="J"
      title="TENDERERS QUALIFICATION / CLARIFICATIONS"
      description="Review all submitted clauses, signatures, acknowledged addenda, and the tender submission requirements. Five mandatory criteria's must be met to be considered fully compliant."
      criteria={[
        {
          icon: ComplianceIcons.fot,
          title: "Contractual Deviations",
          description:
            "Tenderer cannot have any contractual deviations to the issued tender submission requirements.",
        },
        {
          icon: ComplianceIcons.coins,
          title: "Commercial Deviations",
          description:
            "Tenderer cannot have any unpriced / incomplete items.",
        },
        {
          icon: ComplianceIcons.wrench,
          title: "Technical Deviations",
          description:
            "Tenderer cannot have any contractual deviations, BOQ description changes, BOQ quantity changes or additional items.",
        },
      ]}
      // Section J replaces the per-bidder pill table with three
      // stacked deviation sub-tables (Contractual / Commercial /
      // Technical), rendered as children below the criteria cards.
      columns={[]}
      rows={toCardRows(rows)}
      hideTable
    >
      {children}
    </ComplianceCard>
  )
}
