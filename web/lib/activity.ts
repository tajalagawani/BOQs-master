/**
 * Audit log helper — ported from roshn/src/lib/auth.ts:logActivity.
 * Writes to the shared `activity_logs` table.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: unknown,
  newValue?: unknown,
  request?: Request,
): Promise<void> {
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
    // Audit log failures should NEVER break the caller.
    console.error("[activity] failed to log:", e);
  }
}
