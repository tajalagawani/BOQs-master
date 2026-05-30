// Minimal IOX-side stub of the auth helpers used by ported roshn actions.
// IOX uses the mock session in lib/session.ts; logActivity persists to the
// shared activity_logs table.

import { prisma } from "./prisma";
import { getSession } from "./session";

// Resolve the currently-acting user from IOX's mock session and the DB row.
export async function getCurrentUserServer(): Promise<{
  id: string;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
} | null> {
  try {
    const { user } = await getSession();
    if (!user?.email) return null;
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) return null;
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      isActive: dbUser.isActive,
    };
  } catch {
    return null;
  }
}

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: unknown,
  newValue?: unknown,
  request?: Request | null,
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
        ipAddress: request?.headers.get("x-forwarded-for") || null,
        userAgent: request?.headers.get("user-agent") || null,
      },
    });
  } catch (e) {
    console.error("logActivity failed", e);
  }
}
