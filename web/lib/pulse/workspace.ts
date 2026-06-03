import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/modules/core/db";
import { workspaceMembers } from "@/modules/workspace/schema";

/**
 * Workspace ids the user belongs to — the standard ProcureX/BOQ scoping unit.
 * Mirrors the inline pattern in `modules/procurex/projects/queries.ts`.
 */
export async function getUserWorkspaceIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  return rows.map((r) => r.id);
}

/** Most frequent non-empty value in a list (for "top country/currency"). */
export function mostCommon(values: (string | null | undefined)[]): string | undefined {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}
