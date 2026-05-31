"use server"

import { del } from "@vercel/blob"
import { and, eq, isNull } from "drizzle-orm"
import { z } from "zod"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { workspaceMembers } from "@/modules/workspace/schema"

import { documents, type DocumentRow } from "./schema"

const requestSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  targetKind: z.string().min(1),
  targetId: z.string().min(1),
  scope: z.string().min(1).max(40),
  category: z.string().min(1).max(120),
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(120).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
})

type RequestUploadInput = z.infer<typeof requestSchema>

export interface UploadHandle {
  documentId: string
  /** Blob pathname the client should upload to. */
  blobPathname: string
}

async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1)
  if (rows.length === 0) throw new Error("FORBIDDEN")
}

/**
 * Reserve a document row + Blob path. The client then uploads directly
 * to the returned path via the `/api/documents/upload` route handler
 * which uses `@vercel/blob/client` `handleUpload` for signed tokens.
 */
export async function requestDocumentUpload(
  input: RequestUploadInput,
): Promise<UploadHandle> {
  const userId = await requireUserId()
  const parsed = requestSchema.parse(input)
  await assertWorkspaceMember(userId, parsed.workspaceId)

  const id = crypto.randomUUID()
  // Pathname is namespaced so collisions are impossible across workspaces.
  // Includes the document id so commit can verify the upload target.
  const safeFilename = parsed.filename.replace(/[^A-Za-z0-9._-]+/g, "_")
  const blobPathname = `workspaces/${parsed.workspaceId}/${parsed.scope}/${id}-${safeFilename}`

  await db.insert(documents).values({
    id,
    workspaceId: parsed.workspaceId,
    projectId: parsed.projectId ?? null,
    targetKind: parsed.targetKind,
    targetId: parsed.targetId,
    scope: parsed.scope,
    category: parsed.category,
    filename: parsed.filename,
    mimeType: parsed.mimeType ?? null,
    sizeBytes:
      parsed.sizeBytes != null ? BigInt(parsed.sizeBytes) : null,
    blobPathname,
    status: "pending",
    uploadedByUserId: userId,
  })

  return { documentId: id, blobPathname }
}

const commitSchema = z.object({
  documentId: z.string().min(1),
  blobUrl: z.string().url(),
  sizeBytes: z.number().int().nonnegative().optional(),
  mimeType: z.string().max(120).optional(),
})

/** Called after the client finishes the Blob upload. */
export async function commitDocumentUpload(
  input: z.infer<typeof commitSchema>,
): Promise<void> {
  const userId = await requireUserId()
  const parsed = commitSchema.parse(input)

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, parsed.documentId))
    .limit(1)
  if (!doc) throw new Error("Document not found")

  await assertWorkspaceMember(userId, doc.workspaceId)

  await db
    .update(documents)
    .set({
      blobUrl: parsed.blobUrl,
      sizeBytes:
        parsed.sizeBytes != null ? BigInt(parsed.sizeBytes) : doc.sizeBytes,
      mimeType: parsed.mimeType ?? doc.mimeType,
      status: "uploaded",
      uploadedAt: new Date(),
    })
    .where(eq(documents.id, parsed.documentId))

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "document.upload",
    targetKind: "document",
    targetId: doc.id,
    payload: {
      filename: doc.filename,
      scope: doc.scope,
      category: doc.category,
    },
  })
}

export async function deleteDocument(documentId: string): Promise<void> {
  const userId = await requireUserId()

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  if (!doc) throw new Error("Document not found")

  await assertWorkspaceMember(userId, doc.workspaceId)

  // Best-effort blob delete; swallow errors so DB always reflects deletion.
  if (doc.blobUrl) {
    try {
      await del(doc.blobUrl)
    } catch (err) {
      console.error("[documents] blob delete failed", err)
    }
  }

  await db
    .update(documents)
    .set({ deletedAt: new Date(), status: "rejected" })
    .where(eq(documents.id, documentId))

  await recordAudit({
    workspaceId: doc.workspaceId,
    projectId: doc.projectId,
    actorUserId: userId,
    actorKind: "user",
    action: "document.delete",
    targetKind: "document",
    targetId: doc.id,
    payload: { filename: doc.filename },
  })
}

export async function listDocuments(filter: {
  workspaceId: string
  targetKind?: string
  targetId?: string
  scope?: string
}): Promise<DocumentRow[]> {
  const userId = await requireUserId()
  await assertWorkspaceMember(userId, filter.workspaceId)

  const where = [
    eq(documents.workspaceId, filter.workspaceId),
    isNull(documents.deletedAt),
  ]
  if (filter.targetKind) where.push(eq(documents.targetKind, filter.targetKind))
  if (filter.targetId) where.push(eq(documents.targetId, filter.targetId))
  if (filter.scope) where.push(eq(documents.scope, filter.scope))

  return db
    .select()
    .from(documents)
    .where(and(...where))
    .orderBy(documents.createdAt)
}
