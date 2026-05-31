"use server"

import { and, desc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { projects } from "@/modules/procurex/projects/schema"
import { getProjectFotRequirements } from "@/modules/procurex/review/sections/project-fot-requirements"
import { tenderers } from "@/modules/procurex/tenderers/schema"
import { workflowRuns } from "@/modules/workflows/schema"

import type {
  ComplianceVerdict,
  FotComplianceResult,
} from "./compliance-types"

/**
 * Per-tenderer FOT compliance comparator.
 *
 * Reads each tenderer's most recent successful FOT extraction (the
 * verdict already extracted by the `fot` agent) and compares the
 * relevant fields against the project's FOT requirements. Emits a
 * verdict per clause: Compliant / Partial / Non-compliant / Missing.
 *
 * No new AI is needed — this is purely a comparison pass over
 * already-extracted structured data, exactly the same pattern the
 * addenda diff engine uses for per-field comparisons.
 *
 * NOTE: this file is "use server", so it may only export async
 * functions. Types + the clause constant live in `compliance-types.ts`.
 */

interface FotVerdict {
  currency?: string | null
  tenderDate?: string | null
  validityDays?: number | null
  timesForCompletion?: Array<{
    section?: string | null
    days?: number | null
  }> | null
  ohpMarkups?: {
    variationProvisionalPercent?: number | null
    nominatedSubcontractorPercent?: number | null
    buildersWorkNote?: string | null
  } | null
  signatures?: Array<{
    name?: string | null
    dulyAuthorisedFor?: string | null
  }> | null
}

interface ProjectFotRequirement {
  currency: string | null
  requiredValidityDays: number | null
  /** Required total programme days (sum of Time-for-Completion sections
   *  from the project FOT extraction). Null when project FOT not
   *  extracted yet. */
  requiredTotalDays: number | null
  /** Required OHP percentages from the project FOT extraction. */
  requiredOhpVariationPercent: number | null
  requiredOhpSubcontractorPercent: number | null
}

/**
 * For every tenderer on the project, score the five standard FOT
 * clauses against the project's requirements. Returns zeros for any
 * tenderer that hasn't had a successful FOT run yet (all "Missing").
 *
 * Performance note — does at most 1 + N + 1 queries (project,
 * documents/runs, tenderers). N ≤ project tenderer count, typically
 * <10, so latency is dominated by the runs join.
 */
export async function getProjectFotCompliance(
  projectId: string,
): Promise<Record<string, FotComplianceResult>> {
  const [project] = await db
    .select({
      id: projects.id,
      currency: projects.currency,
      requiredValidityDays: projects.requiredValidityDays,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) return {}

  // Pull the project's own FOT extraction so each criterion can be
  // scored against what the issued tender actually requires (not just
  // the two columns on `project`). Falls back to those columns when
  // the project FOT hasn't been extracted yet.
  const reqFot = await getProjectFotRequirements(projectId)
  const projectFot: ProjectFotRequirement = {
    currency: reqFot?.fotSubmission.currency ?? project.currency,
    requiredValidityDays:
      reqFot?.tenderValidity.validityDays ?? project.requiredValidityDays,
    requiredTotalDays: reqFot?.timeForCompletion.totalDays ?? null,
    requiredOhpVariationPercent:
      reqFot?.ohpMarkup.variationProvisionalPercent ?? null,
    requiredOhpSubcontractorPercent:
      reqFot?.ohpMarkup.nominatedSubcontractorPercent ?? null,
  }

  const tenRows = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
  const tendererIds = tenRows.map((t) => t.id)
  if (tendererIds.length === 0) return {}

  // Fetch each tenderer's latest FOT verdict in one round-trip:
  // join documents (scope=bidder_submission, category=Form of Tender,
  // targetKind=tenderer) → workflow_runs (kind=ai.extract:fot, status=
  // succeeded) and pick the most recent per tenderer.
  const docRows = await db
    .select({
      tendererId: documents.targetId,
      documentId: documents.id,
    })
    .from(documents)
    .where(
      and(
        eq(documents.scope, "bidder_submission"),
        eq(documents.targetKind, "tenderer"),
        eq(documents.category, "Form of Tender"),
        inArray(documents.targetId, tendererIds),
        isNull(documents.deletedAt),
      ),
    )

  const docIdsByTenderer = new Map<string, string[]>()
  for (const d of docRows) {
    const arr = docIdsByTenderer.get(d.tendererId) ?? []
    arr.push(d.documentId)
    docIdsByTenderer.set(d.tendererId, arr)
  }

  const allDocIds = docRows.map((d) => d.documentId)
  let runs: Array<{
    output: unknown
    finishedAt: Date | null
    inputDocumentId: string | null
  }> = []
  if (allDocIds.length > 0) {
    const rawRuns = await db
      .select({
        output: workflowRuns.output,
        finishedAt: workflowRuns.finishedAt,
        input: workflowRuns.input,
      })
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.kind, "ai.extract:fot"),
          eq(workflowRuns.status, "succeeded"),
        ),
      )
      .orderBy(desc(workflowRuns.finishedAt))
    runs = rawRuns
      .map((r) => {
        const inputDocumentId =
          (r.input as { documentId?: string } | null)?.documentId ?? null
        return inputDocumentId && allDocIds.includes(inputDocumentId)
          ? {
              output: r.output,
              finishedAt: r.finishedAt,
              inputDocumentId,
            }
          : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
  }

  // Pick the latest verdict per tenderer.
  const verdictByTenderer = new Map<string, FotVerdict>()
  for (const t of tendererIds) {
    const docIds = docIdsByTenderer.get(t) ?? []
    const latest = runs.find(
      (r) => r.inputDocumentId && docIds.includes(r.inputDocumentId),
    )
    if (latest) {
      const out = latest.output as { verdict?: FotVerdict } | null
      if (out?.verdict) verdictByTenderer.set(t, out.verdict)
    }
  }

  // Score each tenderer.
  const result: Record<string, FotComplianceResult> = {}
  for (const t of tendererIds) {
    const v = verdictByTenderer.get(t)
    if (!v) {
      // No successful FOT extraction yet → everything Missing.
      result[t] = {
        "FOT Submission": "Missing",
        "Time for Completion": "Missing",
        "OHP Markup": "Missing",
        "Tender Validity": "Missing",
        Signatures: "Missing",
      }
      continue
    }
    result[t] = {
      "FOT Submission": scoreSubmission(v, projectFot),
      "Time for Completion": scoreTimes(v, projectFot),
      "OHP Markup": scoreOhp(v, projectFot),
      "Tender Validity": scoreValidity(v, projectFot),
      Signatures: scoreSignatures(v),
    }
  }
  return result
}

// ─── Per-clause scorers ──────────────────────────────────────────────
// Verdict logic is deliberately strict on "Non-compliant" — anything
// that's plausibly OK falls into Partial so the user gets a heads-up
// without an outright failure. The QS team escalates from there.
// ────────────────────────────────────────────────────────────────────

function scoreSubmission(
  v: FotVerdict,
  req: ProjectFotRequirement,
): ComplianceVerdict {
  // A submission is compliant when the bidder carries identity fields
  // (tender date + currency) and the currency matches the project's
  // required currency. Currency mismatch is the hard-fail signal.
  const hasDate = Boolean(v.tenderDate)
  const hasCurrency = Boolean(v.currency)
  if (!hasDate && !hasCurrency) return "Non-compliant"
  if (req.currency && v.currency && v.currency !== req.currency) {
    return "Non-compliant"
  }
  if (hasDate && hasCurrency) return "Compliant"
  return "Partial"
}

function scoreTimes(
  v: FotVerdict,
  req: ProjectFotRequirement,
): ComplianceVerdict {
  const rows = v.timesForCompletion ?? []
  if (!rows.length) return "Missing"
  const total = rows
    .filter((r) => typeof r.days === "number" && (r.days ?? 0) > 0)
    .reduce((sum, r) => sum + (r.days ?? 0), 0)
  if (total <= 0) return "Non-compliant"
  // No project FOT baseline → fall back to "has populated sections".
  if (!req.requiredTotalDays) return "Compliant"
  // Exact match (within 1 day rounding) → Compliant. Within 10% on
  // either side → Partial. Larger gap → Non-compliant.
  const diff = Math.abs(total - req.requiredTotalDays)
  if (diff <= 1) return "Compliant"
  if (diff / req.requiredTotalDays <= 0.1) return "Partial"
  return "Non-compliant"
}

function scoreOhp(
  v: FotVerdict,
  req: ProjectFotRequirement,
): ComplianceVerdict {
  const o = v.ohpMarkups
  if (!o) return "Missing"
  const vp = o.variationProvisionalPercent
  const ns = o.nominatedSubcontractorPercent
  const hasVp = typeof vp === "number"
  const hasNs = typeof ns === "number"
  if (!hasVp && !hasNs) return "Non-compliant"
  // OHP requirements act as a CEILING — bidder must be ≤ project rate.
  // Missing project rate → just check presence on the bidder side.
  const okVp =
    req.requiredOhpVariationPercent == null
      ? hasVp
      : hasVp && (vp ?? 0) <= req.requiredOhpVariationPercent
  const okNs =
    req.requiredOhpSubcontractorPercent == null
      ? hasNs
      : hasNs && (ns ?? 0) <= req.requiredOhpSubcontractorPercent
  if (okVp && okNs) return "Compliant"
  if (okVp || okNs) return "Partial"
  return "Non-compliant"
}

function scoreValidity(
  v: FotVerdict,
  req: ProjectFotRequirement,
): ComplianceVerdict {
  const days = v.validityDays
  if (typeof days !== "number" || days <= 0) return "Missing"
  // When the project hasn't declared a requirement, any non-zero
  // validity counts as Compliant — we don't have a benchmark to mark
  // it Partial.
  if (!req.requiredValidityDays) return "Compliant"
  if (days >= req.requiredValidityDays) return "Compliant"
  // Within 10% under the requirement → Partial (probably negotiable);
  // otherwise Non-compliant.
  if (days >= req.requiredValidityDays * 0.9) return "Partial"
  return "Non-compliant"
}

function scoreSignatures(v: FotVerdict): ComplianceVerdict {
  const sigs = v.signatures ?? []
  if (sigs.length === 0) return "Missing"
  // Signature block in the FOT verdict uses `name` + `dulyAuthorisedFor`
  // (no `signedDate` field). Treat a block as "fully signed" when both
  // the signatory name and the entity they signed for are present.
  const fully = sigs.filter((s) => s.name && s.dulyAuthorisedFor)
  if (fully.length === sigs.length) return "Compliant"
  if (fully.length > 0) return "Partial"
  return "Non-compliant"
}
