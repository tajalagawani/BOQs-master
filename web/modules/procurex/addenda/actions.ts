"use server"

import { createHash } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

import { and, eq, isNull } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import { boqItems, boqSections, boqTemplates } from "@/modules/boq/schema"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import {
  recordEvents,
  type TenderEventKind,
  type TenderEventSourceKind,
} from "@/modules/procurex/boq/events"
import type { EntityCandidate } from "@/modules/procurex/boq/entity-matcher"
import { projects } from "@/modules/procurex/projects/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { sql } from "drizzle-orm"

import { parseAttachmentA, type ParsedQuery } from "./attachment-a"
import { diffBoqWorkbook, type ProposedDiffEvent } from "./boq-diff"
import { parseAddendumCoverPdf } from "./cover-parser"
import { detectForAll, type ProposedEvent } from "./event-detector"
import { resolveReference } from "./reference-resolver"
import {
  tenderAddenda,
  tenderAddendumFiles,
  tenderAddendumQueries,
} from "./schema"
import { walkAddendaZip, type WalkedFile } from "./zip-walker"

// ──────────────────────────────────────────────────────────────────────
// Parse — read a zip + produce a preview payload for the modal.
// Does NOT write any addenda data yet; the user confirms in the modal,
// then `importAddenda` writes events.
// ──────────────────────────────────────────────────────────────────────

export interface AddendumPreviewQuery {
  no: string
  queryText: string
  referenceRaw: string | null
  referenceParsed: unknown
  resolvedItemId: string | null
  responseText: string
  detectedEvents: ProposedEvent[]
}

export interface AddendumPreview {
  folder: string
  no: string | null
  issuedIso: string | null
  totalPages: number
  introText: string | null
  sections: Array<{ no: string; title: string; pageRef: number | null }>
  scopeSummary: Record<string, boolean>
  queries: AddendumPreviewQuery[]
  files: Array<{
    relativePath: string
    filename: string
    kind: string
    sizeBytes: number
    isDrawing: boolean
  }>
  warnings: string[]
}

export interface ParseAddendaResult {
  ok: true
  documentId: string
  addenda: AddendumPreview[]
  totalSkippedDrawings: number
  warnings: string[]
}
interface ParseAddendaError {
  ok: false
  error: string
}

const WORK_ROOT = "/tmp/omni-addenda-workdir"

async function fetchBuffer(blobUrl: string): Promise<Buffer | null> {
  try {
    if (blobUrl.startsWith("file://")) {
      const path = blobUrl.replace(/^file:\/\//, "")
      return await readFile(path)
    }
    const res = await fetch(blobUrl)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export async function parseAddendaDocument(
  documentId: string,
): Promise<ParseAddendaResult | ParseAddendaError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      blobUrl: documents.blobUrl,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, doc.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }
  const buf = await fetchBuffer(doc.blobUrl)
  if (!buf) return { ok: false, error: "Could not read uploaded zip" }

  // Stage the zip to disk so the walker (which shells out to unzip/7z)
  // can read it.
  const stagingDir = join(WORK_ROOT, `${doc.id}`)
  await mkdir(stagingDir, { recursive: true })
  const stagingPath = join(stagingDir, doc.filename)
  await writeFile(stagingPath, buf)

  // Load BoQ candidates so the reference resolver can find entities.
  const candidates = await loadProjectBoqCandidates(
    doc.projectId,
    doc.workspaceId,
  )

  const walkRoot = join(stagingDir, "_walk")
  await rm(walkRoot, { recursive: true, force: true }).catch(() => {})
  const walked = await walkAddendaZip(stagingPath, walkRoot)

  const previews: AddendumPreview[] = []
  for (const a of walked.addenda) {
    const coverFile = a.files.find((f) => f.kind === "cover")
    let parsed = null
    if (coverFile) {
      try {
        parsed = await parseAddendumCoverPdf(coverFile.absolutePath)
      } catch {
        parsed = null
      }
    }

    let queries: ParsedQuery[] = []
    if (parsed?.pageTexts.length) {
      queries = parseAttachmentA(parsed.pageTexts).queries
    }
    const withEvents = detectForAll(queries)

    const previewQueries: AddendumPreviewQuery[] = withEvents.map((q) => {
      const resolved = q.reference
        ? resolveReference(q.reference, candidates)
        : null
      return {
        no: q.no,
        queryText: q.query,
        referenceRaw: q.referenceRaw,
        referenceParsed: q.reference as unknown,
        resolvedItemId: resolved?.itemId ?? null,
        responseText: q.response,
        detectedEvents: q.detectedEvents,
      }
    })

    previews.push({
      folder: a.folder,
      no: parsed?.no ?? a.metadata.no,
      issuedIso: parsed?.issuedIso ?? null,
      totalPages: parsed?.totalPages ?? 0,
      introText: parsed?.introText ?? null,
      sections: parsed?.sections ?? [],
      scopeSummary: (parsed?.scopeSummary ?? {}) as Record<string, boolean>,
      queries: previewQueries,
      files: a.files.map((f) => ({
        relativePath: f.relativePath,
        filename: f.filename,
        kind: f.kind,
        sizeBytes: f.sizeBytes,
        isDrawing: f.isDrawing,
      })),
      warnings: [...(parsed?.warnings ?? [])],
    })
  }

  // Stash the walk root in a sidecar so importAddenda can read the
  // files without re-extracting.
  await writeFile(
    join(stagingDir, "walk-root.txt"),
    walkRoot,
    "utf8",
  )

  return {
    ok: true,
    documentId: doc.id,
    addenda: previews,
    totalSkippedDrawings: walked.skippedDrawings.length,
    warnings: walked.warnings,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Import — write addenda + files + queries + confirmed events.
// ──────────────────────────────────────────────────────────────────────

export interface ConfirmedQueryInput {
  no: string
  resolvedItemId: string | null
  confirmedEvents: Array<{
    eventKind: "withdrawn" | "description_changed" | "quantity_changed" | "note"
    payload: Record<string, unknown>
  }>
}

export interface ImportAddendaInput {
  documentId: string
  addenda: Array<{
    folder: string
    confirmedQueries: ConfirmedQueryInput[]
  }>
}

export interface ImportAddendaResult {
  ok: true
  addendaCreated: number
  filesRecorded: number
  queriesRecorded: number
  eventsApplied: number
}
interface ImportAddendaError {
  ok: false
  error: string
}

export async function importAddenda(
  input: ImportAddendaInput,
): Promise<ImportAddendaResult | ImportAddendaError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      blobUrl: documents.blobUrl,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, doc.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  // Re-walk the staged zip — this gives us the file manifest with sha256s
  // and absolute paths. (We could persist the walk between parse and
  // import, but re-walking is fast enough and avoids stale state.)
  const stagingDir = join(WORK_ROOT, `${doc.id}`)
  const stagingPath = join(stagingDir, doc.filename)
  const walkRoot = join(stagingDir, "_walk")
  // Clean re-walk
  await rm(walkRoot, { recursive: true, force: true }).catch(() => {})
  const walked = await walkAddendaZip(stagingPath, walkRoot)

  let addendaCreated = 0
  let filesRecorded = 0
  let queriesRecorded = 0
  let eventsApplied = 0

  // Reserve sequential addendum numbers up-front so concurrent uploads
  // can't fight over the next TA-N. The order matches the order the
  // user is processing them in (the walker returns by addendum index).
  const willInsert = walked.addenda.filter((wa) =>
    input.addenda.find((a) => a.folder === wa.folder),
  )
  const autoNos = await nextAddendumNumbers(doc.projectId, willInsert.length)
  let autoIdx = 0

  for (const walkedAddendum of walked.addenda) {
    const inputAddendum = input.addenda.find(
      (a) => a.folder === walkedAddendum.folder,
    )
    if (!inputAddendum) continue

    const coverFile = walkedAddendum.files.find((f) => f.kind === "cover")
    let parsed = null
    if (coverFile) {
      try {
        parsed = await parseAddendumCoverPdf(coverFile.absolutePath)
      } catch {
        parsed = null
      }
    }

    const [addendum] = await db
      .insert(tenderAddenda)
      .values({
        projectId: doc.projectId,
        // Sequential by upload order, ignoring any "TA1" embedded in
        // the source filenames. First upload to this project = TA1.
        no: autoNos[autoIdx++] ?? `TA${addendaCreated + 1}`,
        issuedAt: parsed?.issuedIso ?? null,
        status: "applied",
        introText: parsed?.introText ?? null,
        scopeSummary: parsed?.scopeSummary ?? {},
        sourceZipFilename: doc.filename,
        sourceDocumentId: doc.id,
        appliedAt: new Date(),
        appliedByUserId: userId,
      })
      .returning({ id: tenderAddenda.id })
    if (!addendum) continue
    addendaCreated += 1

    // Files
    let coverFileId: string | null = null
    let position = 0
    for (const f of walkedAddendum.files) {
      const [file] = await db
        .insert(tenderAddendumFiles)
        .values({
          addendumId: addendum.id,
          kind: f.kind,
          filename: f.filename,
          relativePath: f.relativePath,
          sizeBytes: BigInt(f.sizeBytes),
          sha256: f.sha256,
          isDrawing: f.isDrawing,
          position: position++,
        })
        .returning({ id: tenderAddendumFiles.id })
      if (file) {
        filesRecorded += 1
        if (f.kind === "cover") coverFileId = file.id
      }
    }
    if (coverFileId) {
      await db
        .update(tenderAddenda)
        .set({ coverFileId })
        .where(eq(tenderAddenda.id, addendum.id))
    }

    // Queries + confirmed events
    let queryPosition = 0
    const eventRowsToWrite: Array<{
      projectId: string
      itemId: string
      eventKind: TenderEventKind
      sourceKind: TenderEventSourceKind
      sourceId: string
      payload: Record<string, unknown>
      recordedByUserId: string
    }> = []

    for (const cq of inputAddendum.confirmedQueries) {
      await db.insert(tenderAddendumQueries).values({
        addendumId: addendum.id,
        queryNo: cq.no,
        queryText: "",
        responseText: "",
        resolvedItemId: cq.resolvedItemId,
        derivedEvents: cq.confirmedEvents,
        applied: cq.confirmedEvents.length > 0 && cq.resolvedItemId !== null,
        appliedAt: cq.confirmedEvents.length > 0 ? new Date() : null,
        position: queryPosition++,
      })
      queriesRecorded += 1
      if (cq.resolvedItemId) {
        for (const ev of cq.confirmedEvents) {
          eventRowsToWrite.push({
            projectId: doc.projectId,
            itemId: cq.resolvedItemId,
            eventKind: ev.eventKind,
            sourceKind: "addendum",
            sourceId: addendum.id,
            payload: ev.payload,
            recordedByUserId: userId,
          })
        }
      }
    }

    if (eventRowsToWrite.length > 0) {
      await recordEvents(eventRowsToWrite)
      eventsApplied += eventRowsToWrite.length
    }
  }

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "addenda.import",
    targetKind: "document",
    targetId: doc.id,
    payload: { addendaCreated, filesRecorded, queriesRecorded, eventsApplied },
  })

  await db
    .update(documents)
    .set({ status: "scanned" })
    .where(eq(documents.id, doc.id))

  return {
    ok: true,
    addendaCreated,
    filesRecorded,
    queriesRecorded,
    eventsApplied,
  }
}

// ──────────────────────────────────────────────────────────────────────
// BoQ-only diff preview — for when the user uploads JUST the addendum's
// BoQ xlsx (no zip, no cover PDF). Returns the proposed events so the
// user can confirm only the changes — added / changed / withdrawn.
// ──────────────────────────────────────────────────────────────────────

export interface BoqDiffPreview {
  ok: true
  documentId: string
  filename: string
  events: ProposedDiffEvent[]
  stats: {
    newRowCount: number
    matched: number
    unmatched: number
    withdrawn: number
  }
  warnings: string[]
}
interface BoqDiffError {
  ok: false
  error: string
}

export async function previewAddendaBoqDiff(
  documentId: string,
): Promise<BoqDiffPreview | BoqDiffError> {
  const userId = await requireUserId()

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      blobUrl: documents.blobUrl,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc) return { ok: false, error: "Document not found" }
  if (!doc.projectId) return { ok: false, error: "Document has no project" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, doc.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  if (!doc.blobUrl) return { ok: false, error: "Document has no file attached" }
  const buf = await fetchBuffer(doc.blobUrl)
  if (!buf) return { ok: false, error: "Could not read uploaded file" }

  const candidates = await loadProjectBoqCandidates(
    doc.projectId,
    doc.workspaceId,
  )
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "No BoQ has been imported for this project yet — import the empty BoQ first.",
    }
  }
  // Fetch current attributes per entity for change detection
  const itemRows = await db
    .select({
      id: boqItems.id,
      label: boqItems.label,
      quantityPlanned: boqItems.quantityPlanned,
      unit: boqItems.unit,
    })
    .from(boqItems)
  const current = new Map<
    string,
    { label: string; quantity: string | null; unit: string | null }
  >()
  const candidateIds = new Set(candidates.map((c) => c.id))
  for (const r of itemRows) {
    if (!candidateIds.has(r.id)) continue
    current.set(r.id, {
      label: r.label,
      quantity:
        r.quantityPlanned !== null && r.quantityPlanned !== undefined
          ? String(r.quantityPlanned)
          : null,
      unit: r.unit,
    })
  }

  const result = diffBoqWorkbook({ newBuffer: buf, candidates, current })

  return {
    ok: true,
    documentId: doc.id,
    filename: doc.filename,
    events: result.events,
    stats: {
      newRowCount: result.newRowCount,
      matched: result.matched,
      unmatched: result.unmatched,
      withdrawn: result.withdrawn,
    },
    warnings: result.warnings,
  }
}

export interface ApplyDiffInput {
  documentId: string
  /** Indices into the events array returned by previewAddendaBoqDiff. */
  confirmedIndices: number[]
}

export interface ApplyDiffResult {
  ok: true
  addendumId: string
  addendumNo: string
  eventsApplied: number
}

export async function applyAddendaBoqDiff(
  input: ApplyDiffInput,
): Promise<ApplyDiffResult | BoqDiffError> {
  const userId = await requireUserId()
  // Re-run the diff so we don't trust client-supplied event payloads.
  // The client only sends the indices it confirmed.
  const preview = await previewAddendaBoqDiff(input.documentId)
  if (!preview.ok) return preview
  const selected = input.confirmedIndices
    .map((i) => preview.events[i])
    .filter((e): e is ProposedDiffEvent => Boolean(e))
  if (selected.length === 0) return { ok: false, error: "No events selected" }

  const [doc] = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      projectId: documents.projectId,
      workspaceId: documents.workspaceId,
    })
    .from(documents)
    .where(and(eq(documents.id, input.documentId), isNull(documents.deletedAt)))
    .limit(1)
  if (!doc?.projectId) return { ok: false, error: "Document not found" }

  // Sequential numbering — first addendum for this project = TA1,
  // second = TA2, etc. Each upload becomes its own addendum.
  const [autoNo] = await nextAddendumNumbers(doc.projectId, 1)
  // Create an addendum row to anchor the events.
  const [addendum] = await db
    .insert(tenderAddenda)
    .values({
      projectId: doc.projectId,
      no: autoNo ?? "TA1",
      status: "applied",
      sourceZipFilename: doc.filename,
      sourceDocumentId: doc.id,
      appliedAt: new Date(),
      appliedByUserId: userId,
    })
    .returning({ id: tenderAddenda.id, no: tenderAddenda.no })
  if (!addendum) return { ok: false, error: "Failed to record addendum" }

  // Build event rows. `added` events would need to create new entities;
  // for now we skip them (out of scope for the first BoQ-diff cut). They
  // can be surfaced separately via a future "Add new items" UI.
  const eventRows = selected
    .filter(
      (
        e,
      ): e is ProposedDiffEvent & {
        targetItemId: string
        eventKind:
          | "quantity_changed"
          | "description_changed"
          | "unit_changed"
          | "withdrawn"
      } => e.targetItemId !== null && e.eventKind !== "added",
    )
    .map((e) => ({
      projectId: doc.projectId as string,
      itemId: e.targetItemId,
      eventKind: e.eventKind as TenderEventKind,
      sourceKind: "addendum" as TenderEventSourceKind,
      sourceId: addendum.id,
      payload: e.payload,
      recordedByUserId: userId,
    }))

  if (eventRows.length > 0) await recordEvents(eventRows)

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "addenda.boq_diff.apply",
    targetKind: "document",
    targetId: doc.id,
    payload: { addendumId: addendum.id, eventsApplied: eventRows.length },
  })

  return {
    ok: true,
    addendumId: addendum.id,
    addendumNo: addendum.no,
    eventsApplied: eventRows.length,
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Returns the next available addendum number for a project — "TA1" for
 * the first one, "TA2" for the second, etc. Caller controls how many
 * sequential numbers to reserve (1 for a single-file diff, N for a zip
 * with N addenda inside).
 */
async function nextAddendumNumbers(
  projectId: string,
  count: number,
): Promise<string[]> {
  const [row] = await db
    .select({
      n: sql<number>`coalesce(max(cast(regexp_replace(no, '^TA', '') as int)), 0)::int`,
    })
    .from(tenderAddenda)
    .where(
      and(
        eq(tenderAddenda.projectId, projectId),
        sql`${tenderAddenda.no} ~ '^TA[0-9]+$'`,
      ),
    )
  const start = Number(row?.n ?? 0)
  return Array.from({ length: count }, (_, i) => `TA${start + i + 1}`)
}

async function loadProjectBoqCandidates(
  projectId: string,
  workspaceId: string,
): Promise<EntityCandidate[]> {
  // Pick the project's BoQ template (not PTE).
  const rows = await db
    .select({
      templateId: boqTemplates.id,
      docCategory: documents.category,
    })
    .from(boqTemplates)
    .leftJoin(documents, eq(documents.id, boqTemplates.sourceDocumentId))
    .where(
      and(
        eq(boqTemplates.workspaceId, workspaceId),
        eq(boqTemplates.ownerKind, "project"),
        eq(boqTemplates.ownerId, projectId),
      ),
    )
  const boq = rows.find(
    (r) => r.docCategory === "Blank BOQ / Pricing Schedule",
  )
  if (!boq) return []
  const items = await db
    .select({
      id: boqItems.id,
      no: boqItems.no,
      label: boqItems.label,
      unit: boqItems.unit,
      sectionNo: boqSections.no,
    })
    .from(boqItems)
    .innerJoin(boqSections, eq(boqSections.id, boqItems.sectionId))
    .where(eq(boqItems.templateId, boq.templateId))
  return items.map((r) => ({
    id: r.id,
    sectionNo: r.sectionNo,
    itemLetter: r.no.slice(r.no.lastIndexOf("/") + 1),
    description: r.label,
    unit: r.unit,
  }))
}
