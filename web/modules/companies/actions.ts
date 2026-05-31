"use server"

import { and, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"

import { recordAudit } from "@/modules/audit"
import { requireUserId } from "@/modules/core/auth"
import { db } from "@/modules/core/db"
import { workspaceMembers } from "@/modules/workspace/schema"

import { companies, companyContacts, type Company } from "./schema"

const addCompanySchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(200),
  tradeName: z.string().max(200).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  trade: z.string().max(120).optional().nullable(),
  contact: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().transform((s) => s.trim().toLowerCase()),
    phone: z.string().max(40).optional().nullable(),
    role: z.string().max(120).optional().nullable(),
  }),
})

type AddCompanyInput = z.infer<typeof addCompanySchema>

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

export async function addCompany(input: AddCompanyInput): Promise<string> {
  const userId = await requireUserId()
  const parsed = addCompanySchema.parse(input)
  await assertWorkspaceMember(userId, parsed.workspaceId)

  const [company] = await db
    .insert(companies)
    .values({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      tradeName: parsed.tradeName ?? null,
      country: parsed.country ?? null,
      city: parsed.city ?? null,
      trade: parsed.trade ?? null,
      createdByUserId: userId,
    })
    .returning({ id: companies.id })
  if (!company) throw new Error("Failed to insert company")

  await db.insert(companyContacts).values({
    companyId: company.id,
    name: parsed.contact.name,
    email: parsed.contact.email,
    phone: parsed.contact.phone ?? null,
    role: parsed.contact.role ?? null,
    isPrimary: true,
  })

  await recordAudit({
    workspaceId: parsed.workspaceId,
    actorUserId: userId,
    actorKind: "user",
    action: "company.create",
    targetKind: "company",
    targetId: company.id,
    payload: { name: parsed.name },
  })

  return company.id
}

const bulkRowSchema = z.object({
  companyName: z.string().min(1).max(200),
  tradeName: z.string().max(200).optional(),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email().transform((s) => s.trim().toLowerCase()),
  contactPhone: z.string().max(40).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  trade: z.string().max(120).optional(),
})
const bulkSchema = z.object({
  workspaceId: z.string().min(1),
  rows: z.array(bulkRowSchema).min(1).max(500),
})

type BulkInput = z.infer<typeof bulkSchema>

export interface BulkResult {
  inserted: number
  skippedDuplicates: number
  companyIds: string[]
}

export async function bulkImportCompanies(
  input: BulkInput,
): Promise<BulkResult> {
  const userId = await requireUserId()
  const { workspaceId, rows } = bulkSchema.parse(input)
  await assertWorkspaceMember(userId, workspaceId)

  // Dedupe within the workspace by (company name + contact email).
  const existing = await db
    .select({ name: companies.name, email: companyContacts.email })
    .from(companies)
    .innerJoin(companyContacts, eq(companyContacts.companyId, companies.id))
    .where(
      and(
        eq(companies.workspaceId, workspaceId),
        isNull(companies.deletedAt),
      ),
    )
  const seen = new Set(
    existing.map((r) => `${r.name.toLowerCase()}|${r.email.toLowerCase()}`),
  )

  const companyIds: string[] = []
  let skipped = 0

  for (const row of rows) {
    const key = `${row.companyName.toLowerCase()}|${row.contactEmail}`
    if (seen.has(key)) {
      skipped++
      continue
    }

    const [company] = await db
      .insert(companies)
      .values({
        workspaceId,
        name: row.companyName,
        tradeName: row.tradeName ?? null,
        country: row.country ?? null,
        city: row.city ?? null,
        trade: row.trade ?? null,
        createdByUserId: userId,
      })
      .returning({ id: companies.id })
    if (!company) continue

    await db.insert(companyContacts).values({
      companyId: company.id,
      name: row.contactName,
      email: row.contactEmail,
      phone: row.contactPhone ?? null,
      role: null,
      isPrimary: true,
    })

    companyIds.push(company.id)
    seen.add(key)
  }

  await recordAudit({
    workspaceId,
    actorUserId: userId,
    actorKind: "user",
    action: "company.bulk_import",
    targetKind: "company",
    targetId: null,
    payload: { inserted: companyIds.length, skipped },
  })

  return { inserted: companyIds.length, skippedDuplicates: skipped, companyIds }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  tradeName: z.string().max(200).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  trade: z.string().max(120).optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function updateCompany(
  companyId: string,
  patch: z.infer<typeof updateSchema>,
): Promise<void> {
  const userId = await requireUserId()
  const parsed = updateSchema.parse(patch)

  const [existing] = await db
    .select({ workspaceId: companies.workspaceId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)
  if (!existing) throw new Error("Company not found")

  await assertWorkspaceMember(userId, existing.workspaceId)

  await db
    .update(companies)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(companies.id, companyId))

  await recordAudit({
    workspaceId: existing.workspaceId,
    actorUserId: userId,
    actorKind: "user",
    action: "company.update",
    targetKind: "company",
    targetId: companyId,
    payload: parsed as Record<string, unknown>,
  })
}

export async function softDeleteCompany(companyId: string): Promise<void> {
  const userId = await requireUserId()

  const [existing] = await db
    .select({ workspaceId: companies.workspaceId })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)
  if (!existing) throw new Error("Company not found")

  await assertWorkspaceMember(userId, existing.workspaceId)

  await db
    .update(companies)
    .set({ deletedAt: new Date(), isActive: false })
    .where(eq(companies.id, companyId))

  await recordAudit({
    workspaceId: existing.workspaceId,
    actorUserId: userId,
    actorKind: "user",
    action: "company.delete",
    targetKind: "company",
    targetId: companyId,
    payload: null,
  })
}

export async function getCompaniesForWorkspace(
  workspaceId: string,
): Promise<Company[]> {
  return db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.workspaceId, workspaceId),
        isNull(companies.deletedAt),
      ),
    )
    .orderBy(companies.createdAt)
}

export async function getCompaniesByIds(ids: string[]): Promise<Company[]> {
  if (ids.length === 0) return []
  return db.select().from(companies).where(inArray(companies.id, ids))
}
