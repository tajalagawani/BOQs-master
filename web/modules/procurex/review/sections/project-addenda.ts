import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"

import type { ProjectAddenda, ProjectAddendum } from "../types"

/**
 * Section G — TENDER ADDENDA, project side.
 *
 * Returns the project's issued addenda (scope=`ta`). Each addendum is
 * keyed by document id; the bidder side checks `acknowledgedAddenda`
 * from their FOT verdict against this list to compute coverage.
 */

export async function getProjectAddenda(
  projectId: string,
): Promise<ProjectAddenda> {
  const rows = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.scope, "ta"),
        isNull(documents.deletedAt),
      ),
    )
    .orderBy(documents.createdAt)

  const addenda: ProjectAddendum[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    ref: r.filename.slice(0, 32),
    createdAt: r.createdAt,
  }))
  return { rows: addenda, count: addenda.length }
}
