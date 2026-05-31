import "server-only"

import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve, dirname } from "node:path"

/**
 * Local-disk fallback for development when Vercel Blob is not configured.
 *
 * Files live under `<repoRoot>/uploads/<workspaceId>/<documentId>-<safeName>`.
 * They are served back via `/api/files/[documentId]` so URLs are http-fetchable
 * by the extraction worker.
 */
const ROOT = resolve(process.cwd(), "uploads")

export interface LocalStorePayload {
  workspaceId: string
  documentId: string
  filename: string
  bytes: Buffer | Uint8Array
}

export async function writeLocalFile(input: LocalStorePayload): Promise<{
  absolutePath: string
  servePath: string
}> {
  const safeName = input.filename.replace(/[^A-Za-z0-9._-]+/g, "_")
  const relPath = `${input.workspaceId}/${input.documentId}-${safeName}`
  const abs = resolve(ROOT, relPath)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, input.bytes)
  // IOX hosts the ProcureX module under /procurex; the file-serving route lives at
  // /procurex/api/files/[documentId]. Keep the URL absolute-path so the worker can
  // fetch via the public HTTP origin.
  return { absolutePath: abs, servePath: `/procurex/api/files/${input.documentId}` }
}

export async function readLocalFile(absolutePath: string): Promise<Buffer> {
  return readFile(absolutePath)
}
