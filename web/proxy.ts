import NextAuth from "next-auth"

import { authConfig } from "@/modules/core/auth.config"

// Next.js 16 "Proxy" (formerly Middleware). Edge-safe: any IOX route requires a
// session. Unauthenticated requests are redirected to the sign-in page by the
// `authorized` callback, which whitelists the sign-in and /api/auth routes.
const { auth } = NextAuth(authConfig)

export default auth

export const config = {
  // Run on everything except Next internals, the auth API, and static files
  // (any path containing a dot, e.g. /iox-bg.png, favicon.ico).
  matcher: ["/((?!api/auth|_next/static|_next/image|.*\\..*).*)"],
}
