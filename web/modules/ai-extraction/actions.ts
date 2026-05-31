"use server"

import { and, eq, isNull } from "drizzle-orm"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"
import { projects } from "@/modules/procurex/projects/schema"
import { workspaceMembers } from "@/modules/workspace/schema"

import { preExtractDocument } from "./pre"
import { fingerprintDocument } from "./pre/fingerprint"
import { getPersistor } from "./specs/_persistors"
import { getDocSpec, type DocSpecId } from "./specs/registry"
import type { PersistContext } from "./specs/types"

interface SaveDocFormInput {
  category: DocSpecId | string
  projectId: string
  roundId: string
  documentId?: string
  formData: unknown
}

interface SaveDocFormResult {
  ok: boolean
  documentId?: string
  error?: string
  fieldErrors?: { path: string; message: string }[]
}

/**
 * Save a manually-filled (or AI-prefilled) form for any document category.
 * Routes through the spec's zod schema and per-category persistor.
 */
export async function saveDocForm(
  input: SaveDocFormInput,
): Promise<SaveDocFormResult> {
  const userId = await requireUserId()
  const spec = getDocSpec(input.category)
  if (!spec) return { ok: false, error: `Unknown doc category: ${input.category}` }

  // Authorise: project must be in a workspace the caller belongs to.
  const [project] = await db
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
    })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return { ok: false, error: "Project not found" }

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, project.workspaceId),
      ),
    )
    .limit(1)
  if (!member) return { ok: false, error: "FORBIDDEN" }

  // Validate via zod
  const parsed = spec.schema.safeParse(input.formData)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    }
  }

  // Ensure a document row exists for this (project, category) — create a
  // logical placeholder if the user is saving manually before uploading.
  let documentId = input.documentId
  if (!documentId) {
    const [existing] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.projectId, project.id),
          eq(documents.category, spec.category),
          eq(documents.targetKind, "project"),
          eq(documents.targetId, project.id),
          isNull(documents.deletedAt),
        ),
      )
      .limit(1)

    if (existing) {
      documentId = existing.id
    } else {
      const [created] = await db
        .insert(documents)
        .values({
          workspaceId: project.workspaceId,
          projectId: project.id,
          targetKind: "project",
          targetId: project.id,
          scope: spec.scope,
          category: spec.category,
          filename: `${spec.shortLabel}-manual.json`,
          blobPathname: `manual/${project.id}/${spec.id}.json`,
          status: "uploaded",
          uploadedByUserId: userId,
        })
        .returning({ id: documents.id })
      if (!created) return { ok: false, error: "Failed to create document row" }
      documentId = created.id
    }
  }

  // Persist via the spec's persistor
  const ctx: PersistContext = {
    workspaceId: project.workspaceId,
    projectId: project.id,
    roundId: input.roundId,
    documentId,
    userId,
  }

  try {
    // Dispatch to the server-only persistor. Stubs (boq-template etc.)
    // have no entry in _persistors.ts → fall back to the spec's own no-op.
    const persist = getPersistor(spec.id) ?? spec.persistor
    await persist(parsed.data, ctx)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Persistor failed"
    return { ok: false, error: message }
  }

  await recordAudit({
    workspaceId: project.workspaceId,
    projectId: project.id,
    actorUserId: userId,
    actorKind: "user",
    action: `doc.save:${spec.id}`,
    targetKind: "document",
    targetId: documentId,
    payload: { category: spec.category },
  })

  return { ok: true, documentId }
}

// -----------------------------------------------------------------------------
// File classification — runs the fingerprint detector and returns the
// top-matching category. Useful for drop-zone bulk uploads.
// -----------------------------------------------------------------------------

interface ClassifyFileInput {
  filename: string
  mimeType?: string | null
  /** Base64-encoded file bytes. */
  base64: string
}

export interface ClassifyFileResult {
  ok: boolean
  topCategoryId?: string
  topScore?: number
  signals?: string[]
  allScores?: Record<string, { score: number; signals: string[] }>
  /** Pre-extracted surface size — surfaced in the UI so the user sees the
   *  cost/route choice up front. */
  surfaceChars?: number
  surfaceTokens?: number
  estimatedCostUsd?: number
  routing?: "single_shot" | "chunked"
  error?: string
}

export async function classifyFile(
  input: ClassifyFileInput,
): Promise<ClassifyFileResult> {
  await requireUserId()

  try {
    const buffer = Buffer.from(input.base64, "base64")
    const pre = await preExtractDocument({
      buffer,
      filename: input.filename,
      mimeType: input.mimeType ?? null,
    })

    // Fingerprint (deterministic) as a fast hint — keyword/regex scoring.
    const fp = fingerprintDocument({
      surface: pre.surface,
      mimeKind: pre.manifest.kind,
    })

    const aiPick = await classifyWithAi({
      filename: input.filename,
      mimeKind: pre.manifest.kind,
      surface: pre.surface,
      sizeBytes: buffer.length,
      fingerprintHint: fp.topMatch?.categoryId,
    })

    // No more hard size veto — classifier trusts content over heuristics.
    // Misroute defence is the AI's job: the prompt already includes
    // "a table-of-contents PDF that LISTS docs is NOT those docs".
    const finalCategoryId = aiPick?.categoryId ?? fp.topMatch?.categoryId
    const finalScore = aiPick
      ? aiConfidenceToScore(aiPick.confidence)
      : fp.topMatch?.score

    const surfaceChars = pre.surface.length
    const surfaceTokens = Math.ceil(surfaceChars / 3.5)
    const estimatedCostUsd = Number(
      ((surfaceTokens * 3 + 3000 * 15) / 1_000_000).toFixed(4),
    )
    const routing: "single_shot" | "chunked" =
      surfaceTokens <= 175_000 ? "single_shot" : "chunked"

    return {
      ok: true,
      topCategoryId: finalCategoryId,
      topScore: finalScore,
      surfaceChars,
      surfaceTokens,
      estimatedCostUsd,
      routing,
      signals: [
        ...(aiPick
          ? [`ai:${aiPick.categoryId} (${aiPick.confidence}) — ${aiPick.reason}`]
          : []),
        ...(fp.topMatch?.signals ?? []),
      ],
      allScores: Object.fromEntries(
        Object.entries(fp.scoresByCategory).map(([id, s]) => [
          id,
          { score: s.score, signals: s.signals },
        ]),
      ),
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Classification failed",
    }
  }
}

interface AiClassification {
  categoryId: string
  confidence: "low" | "medium" | "high"
  reason: string
}

function aiConfidenceToScore(c: AiClassification["confidence"]): number {
  return c === "high" ? 5 : c === "medium" ? 3 : 1.5
}

/**
 * Process-wide breaker for the user-cap 400 — once Anthropic returns
 * "You have reached your specified API usage limits" we stop calling
 * Haiku for subsequent uploads (per process). The flag is cleared on
 * process restart. Extraction calls are intentionally NOT gated by
 * this — extraction is the primary product; classification is an
 * optional aide.
 */
let aiClassifyRateLimited = false

function isUserCapError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes("specified API usage limits") ||
    msg.includes("specified API usage limit")
  )
}

async function classifyWithAi(args: {
  filename: string
  mimeKind: string
  surface: string
  sizeBytes: number
  fingerprintHint?: string | null
}): Promise<AiClassification | null> {
  const { anthropic, AI_CLASSIFY_DISABLED } = await import(
    "@/modules/ai-extraction/client"
  )
  if (AI_CLASSIFY_DISABLED) {
    return null // fingerprint-only routing
  }
  if (aiClassifyRateLimited) {
    // Already burned the cap once this process — skip silently to avoid
    // hammering the API on every drop.
    return null
  }
  const categoryList = Object.entries(
    (await import("@/modules/ai-extraction/specs/registry")).DOC_SPECS,
  )
    .map(([id, spec]) => `  - ${id}: ${spec.label} (${spec.shortLabel})`)
    .join("\n")

  const surfaceClip = args.surface.slice(0, 10_000)

  const system = `You are a tender-document classifier for a construction procurement app.
Decide which ONE category best describes the file based on its ACTUAL content — not on what it mentions.

CATEGORIES:
${categoryList}

CRITICAL RULES:
- A table-of-contents PDF that LISTS other documents is NOT one of those documents.
  It's typically the cover/contents of the whole tender pack — pick "cover-letter"
  with low confidence if forced.
- A document is its category only if it CONTAINS that category's substantive content
  (clauses, fields, schedules), not just references to it.
- Trust the content over the filename — judge by the actual text, not the title.
- If the surface is mostly an index/table-of-contents, set confidence=low and explain
  in the reason field.

Reply with ONLY a JSON object on a single line:
  {"categoryId": "<id>", "confidence": "low|medium|high", "reason": "<one short sentence>"}`

  const user = `Filename: ${args.filename}
Mime kind: ${args.mimeKind}
Deterministic fingerprint hint: ${args.fingerprintHint ?? "(none)"}

--- First pages of the document (read this to decide) ---
${surfaceClip}
--- end ---

Classify.`

  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: user }],
    })
    const text = resp.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0]) as AiClassification
    if (typeof parsed.categoryId !== "string") return null
    return parsed
  } catch (err) {
    if (isUserCapError(err)) {
      // Flip the breaker so subsequent uploads in this process don't
      // re-hit the API for the same 400. Compact one-line log so the
      // dev server doesn't keep printing the huge stack trace.
      aiClassifyRateLimited = true
      console.warn(
        "[classify.ai] disabled for the rest of this process — Anthropic returned 'specified API usage limits' 400. Subsequent uploads will use fingerprint-only routing. Restart the process after raising your API cap.",
      )
      return null
    }
    console.warn("[classify.ai] failed, falling back to fingerprint:", err)
    return null
  }
}
