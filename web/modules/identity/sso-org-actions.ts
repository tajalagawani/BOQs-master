"use server"

import { revalidatePath } from "next/cache"

import { requireSuperadmin } from "@/modules/core/authz"
import { userRoleEnum, type UserRole } from "./schema"
import {
  createSsoOrg,
  deleteSsoOrg,
  getSsoOrgById,
  getSsoOrgByTenant,
  setSsoOrgEnabled,
  updateSsoOrg,
} from "./sso-org-queries"

type Result = { ok: true } | { error: string }

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Parse a comma/space/newline-separated domain list into a clean array. */
function parseDomains(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean),
    ),
  )
}

/** Register a new SSO org. Superadmin only. */
export async function createSsoOrgAction(input: {
  tenantId: string
  name: string
  domains: string
  defaultRole: UserRole
}): Promise<Result> {
  const me = await requireSuperadmin()

  const tenantId = input.tenantId.trim().toLowerCase()
  if (!GUID.test(tenantId)) {
    return { error: "Tenant ID must be a Microsoft Entra tenant GUID." }
  }
  if (!input.name.trim()) {
    return { error: "Give the org a name." }
  }
  if (!userRoleEnum.enumValues.includes(input.defaultRole)) {
    return { error: "Pick a valid default role." }
  }
  if (await getSsoOrgByTenant(tenantId)) {
    return { error: "That tenant is already registered." }
  }

  await createSsoOrg({
    tenantId,
    name: input.name.trim(),
    allowedEmailDomains: parseDomains(input.domains),
    defaultRole: input.defaultRole,
    createdBy: me.id,
  })
  revalidatePath("/platform/sso-orgs")
  return { ok: true }
}

/** Edit an org's name / domains / default role. Superadmin only. */
export async function updateSsoOrgAction(
  id: string,
  input: { name: string; domains: string; defaultRole: UserRole },
): Promise<Result> {
  await requireSuperadmin()

  const org = await getSsoOrgById(id)
  if (!org) return { error: "Org not found." }
  if (!input.name.trim()) return { error: "Give the org a name." }
  if (!userRoleEnum.enumValues.includes(input.defaultRole)) {
    return { error: "Pick a valid default role." }
  }
  // The primary (iox) org must stay superadmin so the org can't lock itself out.
  if (org.isPrimary && input.defaultRole !== "superadmin") {
    return { error: "The primary org must keep the superadmin role." }
  }

  await updateSsoOrg(id, {
    name: input.name.trim(),
    allowedEmailDomains: parseDomains(input.domains),
    defaultRole: input.defaultRole,
  })
  revalidatePath("/platform/sso-orgs")
  return { ok: true }
}

/** Enable/disable an org. Superadmin only. The primary org cannot be disabled. */
export async function setSsoOrgEnabledAction(
  id: string,
  enabled: boolean,
): Promise<Result> {
  await requireSuperadmin()
  const org = await getSsoOrgById(id)
  if (!org) return { error: "Org not found." }
  if (org.isPrimary && !enabled) {
    return { error: "The primary org cannot be disabled." }
  }
  await setSsoOrgEnabled(id, enabled)
  revalidatePath("/platform/sso-orgs")
  return { ok: true }
}

/** Remove an org. Superadmin only. The primary org cannot be deleted. */
export async function deleteSsoOrgAction(id: string): Promise<Result> {
  await requireSuperadmin()
  const org = await getSsoOrgById(id)
  if (!org) return { error: "Org not found." }
  if (org.isPrimary) {
    return { error: "The primary org cannot be deleted." }
  }
  await deleteSsoOrg(id)
  revalidatePath("/platform/sso-orgs")
  return { ok: true }
}
