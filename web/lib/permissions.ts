/**
 * Permissions — ported verbatim from roshn/src/lib/permissions.ts.
 *
 * IOX runs with a mock ADMIN session (Arjun Mehta) so all returns
 * resolve to "full access" today. The structure is left intact so
 * call sites in the ported components keep working unchanged when
 * the real role-based access ships.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

/** ── Read-side filters used by lib/queries/* ───────────────────────── */

/** null = full access (admin); array = limited to those IDs */
export async function getAccessibleProjectIds(
  userId: string,
): Promise<string[] | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!u) return [];
  if (u.role === "ADMIN") return null;
  const memberships = await prisma.benchmarkProjectTeamMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

export async function getAccessibleMasterplanIds(
  userId: string,
): Promise<string[] | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!u) return [];
  if (u.role === "ADMIN") return null;
  const [owned, team] = await Promise.all([
    prisma.masterplan.findMany({
      where: { createdById: userId },
      select: { id: true },
    }),
    prisma.projectTeamMember.findMany({
      where: { userId },
      select: { masterplanId: true },
    }),
  ]);
  return [...owned.map((m) => m.id), ...team.map((t) => t.masterplanId)];
}

/** ── Action-side authorisation ─────────────────────────────────────── */

export async function canAccessMasterplan(
  userId: string,
  masterplanId: string,
): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  const m = await prisma.masterplan.findUnique({
    where: { id: masterplanId },
    select: { createdById: true, teamMembers: { where: { userId }, select: { id: true } } },
  });
  if (!m) return false;
  if (m.createdById === userId) return true;
  return m.teamMembers.length > 0;
}

export async function canCreateMasterplanForProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  if (u.role !== "DEVELOPMENT_MANAGER") return false;
  const membership = await prisma.benchmarkProjectTeamMember.findFirst({
    where: { projectId, userId, role: "MANAGER" },
    select: { id: true },
  });
  return Boolean(membership);
}

/** ── Per-user permission summary used by the UI ────────────────────── */

export interface UserPermissions {
  role: "ADMIN" | "DEVELOPMENT_MANAGER" | "VIEWER" | null;
  canCreateProject: boolean;
  canCreateMasterplan: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
  isDevelopmentManager?: boolean;
  isViewer?: boolean;
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return {
      role: null,
      canCreateProject: false,
      canCreateMasterplan: false,
      canManageUsers: false,
      isAdmin: false,
    };
  }

  const isAdmin = user.role === "ADMIN";
  const isDevelopmentManager = user.role === "DEVELOPMENT_MANAGER";

  return {
    role: user.role,
    canCreateProject: isAdmin,
    canCreateMasterplan: isAdmin || isDevelopmentManager,
    canManageUsers: isAdmin,
    isAdmin,
    isDevelopmentManager,
    isViewer: user.role === "VIEWER",
  };
}
