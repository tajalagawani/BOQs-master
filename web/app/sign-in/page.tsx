import Image from "next/image"

import { signIn, ssoEnabled } from "@/modules/core/auth"

import { LoginForm } from "@/components/site-login/login-form"
import { LoginIllustration } from "@/components/site-login/login-illustration"
import { LoginLayout } from "@/components/site-login/login-layout"
import { ReturnToWebsite } from "@/components/site-login/return-to-website"
import { SignupRow } from "@/components/site-login/signup-row"
import { SsoOptions } from "@/components/site-login/sso-options"

export const metadata = { title: "Log in — IOX" }

/**
 * Portal sign-in — the iox-website "/login" design (Figma 898:8871), ported into
 * this app (web/components/site-login) and wired to NextAuth.
 *
 * Login is **Microsoft SSO only**: the credential (email/password) form is not
 * shown. The credentials provider is still registered in auth.ts as an emergency
 * "break-glass" path — append `?breakglass=1` to reveal the password form so an
 * admin can never be fully locked out if SSO is unavailable.
 *
 * `?illustration=alt` selects the alternate background panel.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string
    error?: string
    illustration?: string
    breakglass?: string
  }>
}) {
  const sp = await searchParams
  const callbackUrl = sp.callbackUrl ?? "/"
  const error = sp.error
  const variant = sp.illustration === "alt" ? "alt" : "default"
  // SSO-only by default. Show the credential form when explicitly breaking glass
  // (?breakglass=1) OR when SSO isn't configured for this environment (e.g. dev),
  // so a deployment without Entra still has a working login.
  const showPassword = sp.breakglass === "1" || !ssoEnabled

  async function passwordSignIn(formData: FormData) {
    "use server"
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const redirectTo = String(formData.get("callbackUrl") ?? "/")
    await signIn("credentials", { email, password, redirectTo })
  }

  async function microsoftSignIn(formData: FormData) {
    "use server"
    const redirectTo = String(formData.get("callbackUrl") ?? "/")
    await signIn("microsoft-entra-id", { redirectTo })
  }

  return (
    <LoginLayout
      illustration={variant}
      illustrationContent={
        <LoginIllustration
          variant={variant}
          className="absolute inset-0 z-20"
        />
      }
    >
      {/* Return to website — pinned to the top of the form column (898:11517) */}
      <ReturnToWebsite />

      {/* Auth group — vertically centred on the 400px track */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex w-full max-w-[400px] flex-col items-center gap-[32px]">
          {showPassword ? (
            <>
              {/* Credential login — emergency break-glass, or when SSO is off */}
              <LoginForm
                action={passwordSignIn}
                callbackUrl={callbackUrl}
                error={error}
              />
              {ssoEnabled ? (
                <SsoOptions action={microsoftSignIn} callbackUrl={callbackUrl} />
              ) : null}
            </>
          ) : (
            <>
              {/* IOX logo + heading (carried by LoginForm normally; here for SSO-only) */}
              <div className="flex w-full flex-col items-start gap-[20px]">
                <Image
                  src="/iox-logo.svg"
                  alt="IOX"
                  width={67}
                  height={40}
                  priority
                  className="h-16 w-auto"
                />
                <h1 className="font-sans text-[18px] font-semibold leading-[24px] whitespace-nowrap text-pagent">
                  Access the IOX intelligence environment
                </h1>
              </div>

              {error ? (
                <p className="w-full text-[13px] font-normal leading-[20px] text-[#c0564d]">
                  Sign-in failed. Please try again, or contact your administrator.
                </p>
              ) : null}

              {/* Microsoft SSO — the only login method */}
              <SsoOptions
                action={microsoftSignIn}
                callbackUrl={callbackUrl}
                standalone
              />
            </>
          )}
        </div>
      </div>

      {/* "Don't have an account?" — pinned to the bottom of the form column */}
      <SignupRow />
    </LoginLayout>
  )
}
