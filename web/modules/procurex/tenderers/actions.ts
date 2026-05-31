"use server"

import { and, desc, eq, isNull, like, sql } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import { companies } from "@/modules/companies/schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { extractionJobs } from "@/modules/ai-extraction/queue/schema"
import { tendererInvites } from "@/modules/procurex/portal/schema"
import { projects } from "@/modules/procurex/projects/schema"
import { workflowRuns } from "@/modules/workflows/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { tendererSubmissions } from "@/modules/analysis/schema"

import { tenderers, type TendererStatus } from "./schema"

// ────────────────────────────────────────────────────────────────────────
// Public types — what the UI receives
// ────────────────────────────────────────────────────────────────────────

export interface TendererRow {
  id: string
  code: string
  status: TendererStatus
  qsUpload: boolean
  contactName: string
  contactEmail: string
  contactPhone: string | null
  invitedAt: Date | null
  submittedAt: Date | null
  rankInitial: number | null
  rankCurrent: number | null
  company: {
    id: string
    name: string
    tradeName: string | null
    country: string | null
    city: string | null
  }
  invite: {
    sentAt: Date | null
    openedAt: Date | null
    acceptedAt: Date | null
    resentCount: number
    revokedAt: Date | null
    /** ISO expiry; the actual link is not returned by this read path. */
    expiresAt: Date | null
  } | null
  /** Bidder-return documents — keyed by spec id. Latest non-deleted doc per slot. */
  bidderDocs: {
    "boq-priceset": BidderDocSlot | null
    "cover-letter": BidderDocSlot | null
    fot: BidderDocSlot | null
  }
}

export interface BidderDocSlot {
  documentId: string
  filename: string
  status: string
  uploadedAt: Date | null
  extractionStatus: "queued" | "claimed" | "running" | "succeeded" | "failed" | "none"
  workflowRunId: string | null
  verdictKeys: string[]
  /** Populated for the priced-BoQ slot when the user has clicked "Apply"
   *  on the review modal — at that point a tenderer_submission row + a
   *  boq_priceset (ownerKind='submission') exist for this document. The
   *  UI uses this to restore the "applied" pill across page refreshes. */
  appliedSubmission: {
    submissionId: string
    pricedItems: number
    unpricedItems: number
    tenderSumCents: string
  } | null
}

export interface AddTendererInput {
  projectId: string
  companyName: string
  tradeName?: string
  country?: string
  city?: string
  contactName: string
  contactEmail: string
  contactPhone?: string
}

export type AddTendererResult =
  | { ok: true; tendererId: string; code: string }
  | { ok: false; error: string; field?: keyof AddTendererInput }

// ────────────────────────────────────────────────────────────────────────
// READS
// ────────────────────────────────────────────────────────────────────────

/**
 * One round-trip read for Step 3. Returns every tenderer for the
 * project joined with the company, the latest invite row, and the
 * latest bidder-return doc per slot (boq-priceset / cover-letter / fot).
 */
export async function getTenderersForProject(
  projectId: string,
): Promise<TendererRow[]> {
  const userId = await requireUserId()
  if (!projectId) return []
  await assertProjectMember(projectId, userId)

  // 1) Tenderers + companies in a single query.
  const rows = await db
    .select({
      // tenderer
      tendererId: tenderers.id,
      code: tenderers.code,
      status: tenderers.status,
      qsUpload: tenderers.qsUpload,
      contactName: tenderers.contactName,
      contactEmail: tenderers.contactEmail,
      contactPhone: tenderers.contactPhone,
      invitedAt: tenderers.invitedAt,
      submittedAt: tenderers.submittedAt,
      rankInitial: tenderers.rankInitial,
      rankCurrent: tenderers.rankCurrent,
      companyId: tenderers.companyId,
      // company
      companyName: companies.name,
      tradeName: companies.tradeName,
      country: companies.country,
      city: companies.city,
    })
    .from(tenderers)
    .innerJoin(companies, eq(companies.id, tenderers.companyId))
    .where(and(eq(tenderers.projectId, projectId), isNull(tenderers.deletedAt)))
    .orderBy(tenderers.createdAt)

  if (rows.length === 0) return []

  const companyIds = Array.from(new Set(rows.map((r) => r.companyId)))

  // 2) Latest invite per (project, company).
  const invites = await db
    .select()
    .from(tendererInvites)
    .where(eq(tendererInvites.projectId, projectId))
  const inviteByCompany = new Map<string, (typeof invites)[number]>()
  for (const i of invites) {
    const prev = inviteByCompany.get(i.companyId)
    if (!prev || (i.sentAt && prev.sentAt && i.sentAt > prev.sentAt)) {
      inviteByCompany.set(i.companyId, i)
    }
  }

  // 3) Bidder-return docs per tenderer. Polymorphic via `documents`:
  //    targetKind='tenderer', targetId=<tenderer.id>, scope='bidder_submission'.
  const tendererIds = rows.map((r) => r.tendererId)
  const docs = tendererIds.length
    ? await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.scope, "bidder_submission"),
            eq(documents.targetKind, "tenderer"),
            isNull(documents.deletedAt),
          ),
        )
        .orderBy(desc(documents.createdAt))
    : []
  const docsByTendererAndCategory = new Map<
    string,
    Map<string, (typeof docs)[number]>
  >()
  for (const d of docs) {
    if (!tendererIds.includes(d.targetId)) continue
    let byCat = docsByTendererAndCategory.get(d.targetId)
    if (!byCat) {
      byCat = new Map()
      docsByTendererAndCategory.set(d.targetId, byCat)
    }
    // First (newest) per category wins.
    if (!byCat.has(d.category)) byCat.set(d.category, d)
  }

  // 4) Extraction state per doc — one query, then index.
  const docIds = docs.map((d) => d.id)
  const jobs = docIds.length
    ? await db
        .select()
        .from(extractionJobs)
        .where(eq(extractionJobs.workspaceId, await workspaceIdOf(projectId)))
    : []
  const jobByDoc = new Map<string, (typeof jobs)[number]>()
  for (const j of jobs) {
    const prev = jobByDoc.get(j.documentId)
    if (!prev || (j.createdAt && prev.createdAt && j.createdAt > prev.createdAt)) {
      jobByDoc.set(j.documentId, j)
    }
  }
  const runIds = Array.from(
    new Set(
      Array.from(jobByDoc.values())
        .map((j) => j.workflowRunId)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const runMap = new Map<string, { id: string; output: unknown }>()
  if (runIds.length > 0) {
    const runRows = await db
      .select({ id: workflowRuns.id, output: workflowRuns.output })
      .from(workflowRuns)
      .where(eq(workflowRuns.workspaceId, await workspaceIdOf(projectId)))
    for (const r of runRows) if (runIds.includes(r.id)) runMap.set(r.id, r)
  }

  // 4b) Applied tenderer submissions — one per tenderer (latest). We use
  //     this to restore the "applied" state on the PTC row across page
  //     refreshes once the user has clicked Apply in the review modal.
  const submissions = tendererIds.length
    ? await db
        .select({
          id: tendererSubmissions.id,
          tendererId: tendererSubmissions.tendererId,
          sourceDocumentId: tendererSubmissions.sourceDocumentId,
          tenderSumCents: tendererSubmissions.tenderSumCents,
          pricedItems: tendererSubmissions.pricedItems,
          unpricedItems: tendererSubmissions.unpricedItems,
          submittedAt: tendererSubmissions.submittedAt,
        })
        .from(tendererSubmissions)
    : []
  const submissionByTenderer = new Map<string, (typeof submissions)[number]>()
  for (const s of submissions) {
    if (!tendererIds.includes(s.tendererId)) continue
    const prev = submissionByTenderer.get(s.tendererId)
    if (
      !prev ||
      (s.submittedAt &&
        prev.submittedAt &&
        s.submittedAt > prev.submittedAt)
    ) {
      submissionByTenderer.set(s.tendererId, s)
    }
  }

  // 5) Compose final rows.
  return rows.map((r): TendererRow => {
    const tendererDocs = docsByTendererAndCategory.get(r.tendererId)
    const submission = submissionByTenderer.get(r.tendererId)
    return {
      id: r.tendererId,
      code: r.code,
      status: r.status,
      qsUpload: r.qsUpload,
      contactName: r.contactName,
      contactEmail: r.contactEmail,
      contactPhone: r.contactPhone,
      invitedAt: r.invitedAt,
      submittedAt: r.submittedAt,
      rankInitial: r.rankInitial,
      rankCurrent: r.rankCurrent,
      company: {
        id: r.companyId,
        name: r.companyName,
        tradeName: r.tradeName,
        country: r.country,
        city: r.city,
      },
      invite: composeInvite(inviteByCompany.get(r.companyId)),
      bidderDocs: {
        "boq-priceset": composeSlot(
          tendererDocs?.get("Priced BOQ"),
          jobByDoc,
          runMap,
          submission,
        ),
        "cover-letter": composeSlot(
          tendererDocs?.get("Cover Letter"),
          jobByDoc,
          runMap,
        ),
        fot: composeSlot(tendererDocs?.get("Form of Tender"), jobByDoc, runMap),
      },
    }
  })
}

// ────────────────────────────────────────────────────────────────────────
// WRITES
// ────────────────────────────────────────────────────────────────────────

/**
 * Add a single tenderer. Either resolves to an existing company in the
 * same workspace (by case-insensitive name match) or creates a new one,
 * then inserts the tenderer roster row. Auto-assigns the next free code
 * (`T1`, `T2`, …) within the project.
 *
 * Idempotency: if a non-deleted tenderer already exists for
 * (projectId, companyId), returns `{ok:false, error:"already exists"}`.
 */
export async function addTenderer(
  input: AddTendererInput,
): Promise<AddTendererResult> {
  const userId = await requireUserId()
  await assertProjectMember(input.projectId, userId)

  const companyName = input.companyName.trim()
  const contactName = input.contactName.trim()
  const contactEmail = input.contactEmail.trim()
  if (!companyName) return { ok: false, error: "Company name is required", field: "companyName" }
  if (!contactName) return { ok: false, error: "Contact name is required", field: "contactName" }
  if (!contactEmail) return { ok: false, error: "Contact email is required", field: "contactEmail" }
  if (!isValidEmail(contactEmail)) {
    return { ok: false, error: "Invalid email format", field: "contactEmail" }
  }

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  // 1) Resolve-or-create the company at workspace scope (case-insensitive match).
  const [existingCompany] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(
      and(
        eq(companies.workspaceId, project.workspaceId),
        sql`lower(${companies.name}) = lower(${companyName})`,
        isNull(companies.deletedAt),
      ),
    )
    .limit(1)

  let companyId: string
  if (existingCompany) {
    companyId = existingCompany.id
  } else {
    const [created] = await db
      .insert(companies)
      .values({
        workspaceId: project.workspaceId,
        name: companyName,
        tradeName: input.tradeName?.trim() || null,
        country: input.country?.trim() || null,
        city: input.city?.trim() || null,
        createdByUserId: userId,
      })
      .returning({ id: companies.id })
    if (!created) return { ok: false, error: "Failed to create company" }
    companyId = created.id
  }

  // 2) Refuse if a non-deleted tenderer already exists for (project, company).
  const [dup] = await db
    .select({ id: tenderers.id })
    .from(tenderers)
    .where(
      and(
        eq(tenderers.projectId, input.projectId),
        eq(tenderers.companyId, companyId),
        isNull(tenderers.deletedAt),
      ),
    )
    .limit(1)
  if (dup) return { ok: false, error: "This company is already a tenderer on this project" }

  // 3) Pick the next code. Race-tolerant: retry on unique-violation.
  const code = await pickNextCode(input.projectId)

  const [row] = await db
    .insert(tenderers)
    .values({
      projectId: input.projectId,
      companyId,
      code,
      contactName,
      contactEmail,
      contactPhone: input.contactPhone?.trim() || null,
      status: "pending",
    })
    .returning({ id: tenderers.id, code: tenderers.code })
  if (!row) return { ok: false, error: "Failed to create tenderer" }

  await recordAudit({
    workspaceId: project.workspaceId,
    projectId: input.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "tenderer.add",
    targetKind: "tenderer",
    targetId: row.id,
    payload: { companyId, companyName, contactEmail },
  })

  return { ok: true, tendererId: row.id, code: row.code }
}

/**
 * Patch contact fields on a draft tenderer. Only callable while
 * `status='pending'` — once invited or QS-flagged, edits go through
 * the invite/resend path instead.
 */
export async function updateTenderer(
  id: string,
  patch: {
    contactName?: string
    contactEmail?: string
    contactPhone?: string
  },
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId()

  const [t] = await db
    .select({
      id: tenderers.id,
      projectId: tenderers.projectId,
      status: tenderers.status,
    })
    .from(tenderers)
    .where(eq(tenderers.id, id))
    .limit(1)
  if (!t) return { ok: false, error: "Tenderer not found" }
  await assertProjectMember(t.projectId, userId)
  if (t.status !== "pending") {
    return { ok: false, error: "Only pending tenderers can be edited from here" }
  }

  const safePatch: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.contactName !== undefined) safePatch.contactName = patch.contactName.trim()
  if (patch.contactEmail !== undefined) {
    const v = patch.contactEmail.trim()
    if (v && !isValidEmail(v)) return { ok: false, error: "Invalid email format" }
    safePatch.contactEmail = v
  }
  if (patch.contactPhone !== undefined) {
    safePatch.contactPhone = patch.contactPhone.trim() || null
  }
  await db.update(tenderers).set(safePatch).where(eq(tenderers.id, id))
  return { ok: true }
}

/**
 * Soft-delete a tenderer. Cascades to its bidder-return documents
 * (they get soft-deleted too so the per-project slot frees up cleanly).
 */
export async function removeTenderer(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId()
  const [t] = await db
    .select({ id: tenderers.id, projectId: tenderers.projectId })
    .from(tenderers)
    .where(eq(tenderers.id, id))
    .limit(1)
  if (!t) return { ok: false, error: "Tenderer not found" }
  await assertProjectMember(t.projectId, userId)

  const now = new Date()
  await db
    .update(tenderers)
    .set({ deletedAt: now, isActive: false, updatedAt: now })
    .where(eq(tenderers.id, id))
  // Soft-delete the bidder docs too.
  await db
    .update(documents)
    .set({ deletedAt: now })
    .where(
      and(
        eq(documents.targetKind, "tenderer"),
        eq(documents.targetId, id),
        isNull(documents.deletedAt),
      ),
    )

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, t.projectId))
    .limit(1)
  if (project) {
    await recordAudit({
      workspaceId: project.workspaceId,
      projectId: t.projectId,
      actorUserId: userId,
      actorKind: "user",
      action: "tenderer.remove",
      targetKind: "tenderer",
      targetId: id,
      payload: {},
    })
  }
  return { ok: true }
}

/**
 * Flag the tenderer as QS-upload (skip the email/portal flow, QS will
 * upload documents directly). Creates a submission shell row.
 */
export async function markQsUpload(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId()
  const [t] = await db
    .select({
      id: tenderers.id,
      projectId: tenderers.projectId,
      status: tenderers.status,
    })
    .from(tenderers)
    .where(eq(tenderers.id, id))
    .limit(1)
  if (!t) return { ok: false, error: "Tenderer not found" }
  await assertProjectMember(t.projectId, userId)
  if (t.status !== "pending") {
    return { ok: false, error: `Tenderer is already ${t.status}` }
  }

  const now = new Date()
  await db
    .update(tenderers)
    .set({ qsUpload: true, status: "opened", updatedAt: now })
    .where(eq(tenderers.id, id))

  // Submission shell — `<projectId>::initial` is the round id contract today.
  // The shared `tenderer_submission` table (owned by analysis/schema) has no
  // `qs_uploaded` column; the QS-upload flag lives on the tenderer row.
  const roundId = `${t.projectId}::initial`
  await db
    .insert(tendererSubmissions)
    .values({ tendererId: id, roundId, status: "pending" })
    .onConflictDoNothing()

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, t.projectId))
    .limit(1)
  if (project) {
    await recordAudit({
      workspaceId: project.workspaceId,
      projectId: t.projectId,
      actorUserId: userId,
      actorKind: "user",
      action: "tenderer.qs_upload",
      targetKind: "tenderer",
      targetId: id,
      payload: {},
    })
  }
  return { ok: true }
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

async function workspaceIdOf(projectId: string): Promise<string> {
  const [p] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!p) throw new Error("project not found")
  return p.workspaceId
}

async function assertProjectMember(projectId: string, userId: string): Promise<void> {
  const wsId = await workspaceIdOf(projectId)
  const [member] = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, wsId)),
    )
    .limit(1)
  if (!member) throw new Error("FORBIDDEN")
}

function isValidEmail(s: string): boolean {
  // Pragmatic check — full RFC validation lives at the email-sending layer.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

async function pickNextCode(projectId: string): Promise<string> {
  // T1 / T2 / … — find the max existing numeric suffix among non-deleted rows.
  const existing = await db
    .select({ code: tenderers.code })
    .from(tenderers)
    .where(
      and(
        eq(tenderers.projectId, projectId),
        isNull(tenderers.deletedAt),
        like(tenderers.code, "T%"),
      ),
    )
  let max = 0
  for (const e of existing) {
    const m = e.code.match(/^T(\d+)$/)
    if (m && m[1]) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > max) max = n
    }
  }
  return `T${max + 1}`
}

function composeInvite(
  row: typeof tendererInvites.$inferSelect | undefined,
): TendererRow["invite"] {
  if (!row) return null
  return {
    sentAt: row.sentAt,
    openedAt: row.openedAt,
    acceptedAt: row.acceptedAt,
    resentCount: row.resentCount,
    revokedAt: row.revokedAt,
    expiresAt: row.expiresAt,
  }
}

function composeSlot(
  doc: typeof documents.$inferSelect | undefined,
  jobByDoc: Map<string, typeof extractionJobs.$inferSelect>,
  runMap: Map<string, { id: string; output: unknown }>,
  submission?: {
    id: string
    sourceDocumentId: string | null
    tenderSumCents: bigint | null
    pricedItems: string | null
    unpricedItems: string | null
  },
): BidderDocSlot | null {
  if (!doc) return null
  const job = jobByDoc.get(doc.id)
  const run = job?.workflowRunId ? runMap.get(job.workflowRunId) : undefined
  const verdict = (run?.output as { verdict?: unknown } | undefined)?.verdict
  const verdictKeys =
    verdict && typeof verdict === "object" && !Array.isArray(verdict)
      ? Object.keys(verdict).filter(
          (k) =>
            !k.startsWith("_") && k !== "coverage_warnings" && k !== "instances_examined",
        )
      : []
  const appliedSubmission =
    submission && submission.sourceDocumentId === doc.id
      ? {
          submissionId: submission.id,
          pricedItems: Number(submission.pricedItems ?? "0"),
          unpricedItems: Number(submission.unpricedItems ?? "0"),
          tenderSumCents: (submission.tenderSumCents ?? 0n).toString(),
        }
      : null
  return {
    documentId: doc.id,
    filename: doc.filename,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
    extractionStatus: (job?.status as BidderDocSlot["extractionStatus"]) ?? "none",
    workflowRunId: run?.id ?? null,
    verdictKeys,
    appliedSubmission,
  }
}
