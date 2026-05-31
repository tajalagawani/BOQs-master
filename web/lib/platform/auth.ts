import "server-only";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export type PlatformRole = "SUPER_ADMIN" | "PLATFORM_ADMIN";

/**
 * Resolve the platform-side user. Today this is the IOX mock session
 * (always Arjun). When real auth merges in (ADR-0004), swap this for
 * `await auth()` from NextAuth — the rest of the dashboard reads from
 * this single helper.
 */
export async function getPlatformUser() {
  const { user } = await getSession();
  if (!user) return null;

  // Today every mock session is Arjun, treated as SUPER_ADMIN. When the
  // real users table grows, read `user.role` from there.
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "Arjun Mehta",
    role: "SUPER_ADMIN" as PlatformRole,
  };
}

/**
 * Gate a server component to platform-admin roles. Call at the top of
 * any /platform/* page or layout. Returns the user once authorised;
 * renders the "access denied" page if not.
 *
 * Usage:
 *   const user = await requirePlatformAccess();
 */
export async function requirePlatformAccess() {
  const user = await getPlatformUser();
  if (!user) {
    redirect("/procurex/sign-in?callbackUrl=/platform");
  }
  const allowed: PlatformRole[] = ["SUPER_ADMIN", "PLATFORM_ADMIN"];
  if (!allowed.includes(user.role)) {
    // Render the friendly access-denied page instead of a 404/500
    redirect("/platform/access-denied");
  }
  return user;
}
