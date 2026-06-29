import { auth } from "@/modules/core/auth"

/**
 * Lightweight session probe for nginx `auth_request`. The co-hosted ProcureX app
 * (a separate process behind /procurex) is gated by this: nginx sub-requests
 * here with the caller's cookies; 200 = signed in (allow), 401 = not (nginx
 * redirects to /sign-in). Returns no body. Must be in PUBLIC_PREFIXES so the
 * proxy lets it through to return a clean 200/401 instead of a redirect.
 */
export async function GET() {
  const session = await auth()
  return new Response(null, { status: session?.user ? 200 : 401 })
}
