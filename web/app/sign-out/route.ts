import { NextResponse } from "next/server"

import { signOut } from "@/modules/core/auth"

/**
 * GET /sign-out — ends the shared IOX session, then redirects to sign-in.
 * Cross-app friendly (a plain link), so co-hosted apps like ioProcure (/ioprocure)
 * can log out of the main IOX session from their own UI. After this clears the
 * NextAuth cookie, the nginx gate bounces any further /ioprocure request to /sign-in.
 *
 * Redirect base is the canonical AUTH_URL (the public origin), NOT req.url —
 * behind nginx req.url resolves to the internal host (localhost:3000), which
 * would send the browser to the wrong place.
 */
export async function GET(req: Request) {
  await signOut({ redirect: false })
  const base = process.env.AUTH_URL ?? new URL(req.url).origin
  return NextResponse.redirect(new URL("/sign-in", base))
}
