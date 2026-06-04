import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/modules/core/authz";

export type PlatformRole = "SUPER_ADMIN" | "PLATFORM_ADMIN";

/**
 * Resolve the platform-side user from the real IOX session. Only `superadmin`
 * has platform access (the internal ops dashboard); everyone else gets a null
 * platform role and is bounced by `requirePlatformAccess`.
 */
export async function getPlatformUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: (user.role === "superadmin" ? "SUPER_ADMIN" : null) as
      | PlatformRole
      | null,
  };
}

/**
 * Gate a server component to platform access. Call at the top of any
 * /platform/* page or layout. Returns the user once authorised; redirects
 * otherwise.
 */
export async function requirePlatformAccess() {
  const user = await getPlatformUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/platform");
  }
  if (!user.role) {
    redirect("/platform/access-denied");
  }
  return user;
}
