import "server-only"

import type { FotGrouped, SignatureBlock } from "../types"

/**
 * Reshape an `ai.extract:fot` verdict (the flat shape stored in
 * `workflow_run.output.verdict`) into the canonical grouped shape the
 * bidder review page renders. Both the project's own FOT and each
 * bidder's submission go through this single mapper so the API is
 * consistent on both sides.
 *
 * Accepts both the flat shape AND the already-grouped shape (for
 * forward-compat with extractor runs that emit groups directly), so
 * the conversion is idempotent.
 */

interface RawFotVerdict {
  // Flat-shape fields (the historical format).
  currency?: string | null
  tenderDate?: string | null
  tenderSumFigures?: string | number | bigint | null
  tenderSumWords?: string | null
  tendererCompanyId?: string | null
  validityDays?: number | null
  executionDate?: string | null
  timesForCompletion?: Array<{
    label?: string | null
    section?: string | null
    days?: number | null
    fromText?: string | null
    parallelText?: string | null
  }> | null
  ohpMarkups?: {
    variationProvisionalPercent?: number | null
    nominatedSubcontractorPercent?: number | null
    buildersWorkNote?: string | null
  } | null
  acknowledgedAddenda?: Array<{
    reference?: string | null
    dateOfIssue?: string | null
  }> | null
  signatures?: Array<Partial<SignatureBlock>> | null

  // Already-grouped shape (forward compat).
  fotSubmission?: unknown
  timeForCompletion?: unknown
  ohpMarkup?: unknown
  tenderValidity?: unknown
}

function asString(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === "string") return v
  if (typeof v === "bigint") return v.toString()
  if (typeof v === "number") return String(v)
  return null
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  return null
}

export function mapFotVerdictToGrouped(input: unknown): FotGrouped | null {
  if (!input || typeof input !== "object") return null
  const v = input as RawFotVerdict

  // Forward-compat: if already grouped, trust it (but normalise types).
  if (v.fotSubmission && v.timeForCompletion && v.ohpMarkup && v.tenderValidity) {
    return input as FotGrouped
  }

  const sections = (v.timesForCompletion ?? [])
    .map((s) => ({
      label: s.label ?? s.section ?? "",
      days: asInt(s.days) ?? 0,
      fromText: s.fromText ?? null,
      parallelText: s.parallelText ?? null,
    }))
    .filter((s) => s.days > 0)
  const totalDays = sections.length
    ? sections.reduce((sum, s) => sum + s.days, 0)
    : null

  // Strip the BigInt `n` suffix that JSON serialisers sometimes leave
  // behind on `tenderSumFigures` (`"1050000000n"` → `"1050000000"`).
  const tenderSumRaw = asString(v.tenderSumFigures)
  const tenderSumCents = tenderSumRaw
    ? tenderSumRaw.replace(/n$/, "")
    : null

  const blocks: SignatureBlock[] = (v.signatures ?? []).map((s) => ({
    inTheCapacityOf: s.inTheCapacityOf ?? null,
    name: s.name ?? null,
    dulyAuthorisedFor: s.dulyAuthorisedFor ?? null,
    witnessName: s.witnessName ?? null,
    witnessAddress: s.witnessAddress ?? null,
    witnessOccupation: s.witnessOccupation ?? null,
    signatureImageUrl: s.signatureImageUrl ?? null,
    witnessSignatureImageUrl: s.witnessSignatureImageUrl ?? null,
  }))

  return {
    fotSubmission: {
      tenderDate: v.tenderDate ?? null,
      currency: v.currency ?? null,
      tenderSumCents,
      tenderSumWords: v.tenderSumWords ?? null,
      tendererCompanyId: v.tendererCompanyId ?? null,
    },
    timeForCompletion: { sections, totalDays },
    ohpMarkup: {
      variationProvisionalPercent:
        asInt(v.ohpMarkups?.variationProvisionalPercent),
      nominatedSubcontractorPercent:
        asInt(v.ohpMarkups?.nominatedSubcontractorPercent),
      buildersWorkNote: v.ohpMarkups?.buildersWorkNote ?? null,
    },
    tenderValidity: {
      validityDays: asInt(v.validityDays),
      acknowledgedAddenda: (v.acknowledgedAddenda ?? []).map((a) => ({
        reference: a.reference ?? "",
        dateOfIssue: a.dateOfIssue ?? null,
      })),
    },
    signatures: { executionDate: v.executionDate ?? null, blocks },
  }
}
