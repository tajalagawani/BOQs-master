/**
 * User queries — listing for team-member selection.
 * Ported verbatim from roshn/src/lib/queries/benchmarking.ts:getUsers.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Get all active users for team member selection.
 */
export async function getUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });
}
