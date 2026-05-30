/**
 * Mock IOX session.
 *
 * Returns the seeded Arjun Mehta user. Anywhere the original roshn
 * code called `await auth()` and read `session.user.id` we use this
 * instead. When real auth ships, swap implementations here and the
 * call sites stay unchanged.
 */
import "server-only";
import { prisma } from "./prisma";

export interface IoxSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "DEVELOPMENT_MANAGER" | "VIEWER";
  };
}

let cached: IoxSession | null = null;

export async function getSession(): Promise<IoxSession> {
  if (cached) return cached;
  const u = await prisma.user.findUnique({
    where: { email: "arjun.mehta@iox.local" },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!u) {
    throw new Error(
      "Mock IOX user not found — run `npm run db:seed` in web/",
    );
  }
  cached = {
    user: {
      id: u.id,
      email: u.email,
      name: u.name ?? "Arjun Mehta",
      role: u.role,
    },
  };
  return cached;
}
