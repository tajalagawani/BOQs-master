import "server-only"

import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "@/modules/core/db"
import { documents } from "@/modules/documents/schema"

import type { ProjectTenderDocuments, TenderDocPresence } from "../types"

/**
 * Section E — TENDER DOCUMENTS.
 *
 * Project-side check: for each of the five tender doc categories
 * (ITT, COC, SOPR, Drawings, Technical Specification), is there a
 * non-deleted document on the project? That's the baseline every
 * bidder is judged against — they can't comply with a doc that was
 * never issued.
 *
 * The bidder side is just "has the bidder seen this category" — the
 * issued doc set is identical for every tenderer, so per-bidder
 * verdicts mirror the project-side presence check until a per-bidder
 * acknowledgement signal lands (e.g., a tender_acknowledgement table).
 */

const TENDER_DOC_CATEGORIES = [
  "Instructions to Tenderer",
  "Conditions of Contract",
  "Schedule of Project Requirements",
  "Tender Drawings",
  "Technical Specification",
] as const

type TenderDocCategory = (typeof TENDER_DOC_CATEGORIES)[number]

export async function getProjectTenderDocuments(
  projectId: string,
): Promise<ProjectTenderDocuments> {
  const rows = await db
    .select({
      id: documents.id,
      category: documents.category,
      filename: documents.filename,
    })
    .from(documents)
    .where(
      and(
        eq(documents.projectId, projectId),
        eq(documents.scope, "required"),
        eq(documents.targetKind, "project"),
        inArray(documents.category, [...TENDER_DOC_CATEGORIES]),
        isNull(documents.deletedAt),
      ),
    )

  const byCategory = new Map<TenderDocCategory, typeof rows>()
  for (const r of rows) {
    const cat = r.category as TenderDocCategory
    const arr = byCategory.get(cat) ?? []
    arr.push(r)
    byCategory.set(cat, arr)
  }

  const presence = (cat: TenderDocCategory): TenderDocPresence => {
    const arr = byCategory.get(cat) ?? []
    return {
      count: arr.length,
      documentId: arr[0]?.id ?? null,
      filename: arr[0]?.filename ?? null,
    }
  }

  return {
    itt: presence("Instructions to Tenderer"),
    coc: presence("Conditions of Contract"),
    sopr: presence("Schedule of Project Requirements"),
    drawings: presence("Tender Drawings"),
    specifications: presence("Technical Specification"),
  }
}
