import { redirect } from "next/navigation"

export const metadata = { title: "Sign in · ioProcure" }

/**
 * ioProcure no longer has its own sign-in screen. Login is unified on the
 * portal's SSO-only /sign-in page; we just carry the post-login destination so
 * the user still lands inside ProcureX after authenticating.
 */
export default async function ProcurexSignInRedirect({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const sp = await searchParams
  const callbackUrl = sp.callbackUrl ?? "/procurex"
  redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)
}
