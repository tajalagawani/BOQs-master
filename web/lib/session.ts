/**
 * IOX session bridge.
 *
 * Historically this returned a hard-coded mock user. It now resolves the real
 * authenticated user (Auth.js `px_user`) and maps it onto the legacy Prisma
 * `users` row (matched by email) that roshn-ported features FK against — so
 * call sites that read `{ user }` keep working unchanged, including those that
 * use `user.id` as a Prisma foreign key.
 */
import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/modules/core/auth";
import { mirrorUserToLegacy } from "@/modules/core/identity-mirror";
import { prisma } from "./prisma";

export interface IoxSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "DEVELOPMENT_MANAGER" | "VIEWER";
  };
}

export async function getSession(): Promise<IoxSession> {
  const session = await auth();
  const pxId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!pxId || !email) redirect("/sign-in");

  // The legacy row is created on sign-in; self-heal if it's somehow missing.
  let legacy = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!legacy) {
    await mirrorUserToLegacy(pxId);
    legacy = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });
  }
  if (!legacy) redirect("/sign-in");

  return {
    user: {
      id: legacy.id,
      email: legacy.email,
      name: legacy.name ?? legacy.email,
      role: legacy.role,
    },
  };
}
