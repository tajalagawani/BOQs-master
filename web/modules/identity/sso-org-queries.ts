import "server-only"

import { asc, eq } from "drizzle-orm"

import { db } from "@/modules/core/db"
import type { UserRole } from "./schema"
import { ssoOrgs, type SsoOrg } from "./sso-org-schema"

/** All registered SSO orgs, primary first, then by name. */
export async function listSsoOrgs(): Promise<SsoOrg[]> {
  const rows = await db.select().from(ssoOrgs).orderBy(asc(ssoOrgs.createdAt))
  return rows.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function getSsoOrgById(id: string): Promise<SsoOrg | null> {
  const rows = await db.select().from(ssoOrgs).where(eq(ssoOrgs.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getSsoOrgByTenant(tenantId: string): Promise<SsoOrg | null> {
  const rows = await db
    .select()
    .from(ssoOrgs)
    .where(eq(ssoOrgs.tenantId, tenantId))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Resolve the SSO org for an incoming sign-in: by Entra tenant id first, then
 * by email domain. Used by the auth layer to decide the role (and, once
 * multi-tenant SSO is on, whether the tenant is allowed at all).
 */
export async function findSsoOrgForUser(
  tenantId: string | null | undefined,
  email: string | null | undefined,
): Promise<SsoOrg | null> {
  if (tenantId) {
    const byTenant = await getSsoOrgByTenant(tenantId)
    if (byTenant) return byTenant
  }
  const domain = (email ?? "").toLowerCase().split("@")[1] ?? ""
  if (!domain) return null
  const rows = await db.select().from(ssoOrgs)
  return (
    rows.find((o) =>
      o.allowedEmailDomains.some((d) => d.toLowerCase() === domain),
    ) ?? null
  )
}

export async function createSsoOrg(values: {
  tenantId: string
  name: string
  allowedEmailDomains: string[]
  defaultRole: UserRole
  createdBy: string | null
}): Promise<void> {
  await db.insert(ssoOrgs).values({
    tenantId: values.tenantId,
    name: values.name,
    allowedEmailDomains: values.allowedEmailDomains,
    defaultRole: values.defaultRole,
    createdBy: values.createdBy,
  })
}

export async function updateSsoOrg(
  id: string,
  values: {
    name: string
    allowedEmailDomains: string[]
    defaultRole: UserRole
  },
): Promise<void> {
  await db
    .update(ssoOrgs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(ssoOrgs.id, id))
}

export async function setSsoOrgEnabled(id: string, enabled: boolean): Promise<void> {
  await db
    .update(ssoOrgs)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(ssoOrgs.id, id))
}

export async function deleteSsoOrg(id: string): Promise<void> {
  await db.delete(ssoOrgs).where(eq(ssoOrgs.id, id))
}
