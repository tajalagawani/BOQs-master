import Image from "next/image"
import { signIn } from "@/modules/core/auth"
import { env } from "@/modules/core/env"
import { listDevSeedUsers } from "@/modules/identity/queries"

export const metadata = { title: "Sign in · ProcureX" }

const DEV_PASSWORD = "dev"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const sp = await searchParams
  // Default to the ProcureX root (not IOX home) so successful sign-in
  // lands the user inside the module they just authenticated to.
  const callbackUrl = sp.callbackUrl ?? "/procurex"
  const error = sp.error
  const devUsers =
    env.NODE_ENV !== "production" || env.ALLOW_DEV_LOGIN
      ? await listDevSeedUsers()
      : []

  async function signInAction(formData: FormData) {
    "use server"
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const redirectTo = String(formData.get("callbackUrl") ?? "/procurex")

    await signIn("credentials", {
      email,
      password,
      redirectTo,
    })
  }

  return (
    <main className="suite suite-hero relative min-h-screen grid place-items-center overflow-hidden px-4 py-12">
      {/* Decorative art on the navy background, rendered white. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: "url(/login-art.svg)",
          backgroundSize: "cover",
          filter: "brightness(0) invert(1)",
        }}
      />
      <div className="relative z-10 bg-white rounded-[22px] suite-shadow border border-suite-line w-full max-w-md p-8">
        <div className="mb-1 flex items-center gap-3">
          <Image
            src="/iox-logo.svg"
            alt="IOX"
            width={67}
            height={40}
            priority
            className="h-6 w-auto"
          />
          <span className="h-6 w-px bg-suite-line" aria-hidden />
          <h1 className="text-2xl font-semibold text-suite-ink">
            Sign in to ProcureX
          </h1>
        </div>
        <p className="text-sm text-suite-ink-2 mb-6">
          Enter your email and password to continue.
        </p>

        {error ? (
          <div className="mb-4 rounded-lg border border-suite-dang/30 bg-suite-dang-bg px-3 py-2 text-sm text-suite-dang">
            Sign-in failed. Check your credentials and try again.
          </div>
        ) : null}

        <form action={signInAction} className="flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-suite-ink-2">Email</span>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className="h-11 rounded-xl border border-suite-line bg-white px-3 text-sm outline-none focus:border-suite-navy focus:ring-2 focus:ring-suite-navy/10"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-suite-ink-2">Password</span>
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              className="h-11 rounded-xl border border-suite-line bg-white px-3 text-sm outline-none focus:border-suite-navy focus:ring-2 focus:ring-suite-navy/10"
            />
          </label>
          <button
            type="submit"
            className="mt-2 h-11 rounded-xl bg-suite-navy text-white text-sm font-medium hover:bg-suite-navy-3"
          >
            Sign in
          </button>
        </form>

        {devUsers.length > 0 ? (
          <div className="mt-8 pt-6 border-t border-dashed border-suite-line">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold tracking-wider text-suite-ink-3 uppercase">
                Dev quick-fill
              </span>
              <span className="text-[10px] text-suite-ink-3">
                (password: <code>{DEV_PASSWORD}</code>)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {devUsers.map((u) => (
                <form key={u.id} action={signInAction}>
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                  <input type="hidden" name="email" value={u.email} />
                  <input type="hidden" name="password" value={DEV_PASSWORD} />
                  <button
                    type="submit"
                    className="w-full text-left h-12 rounded-xl border border-suite-line bg-white hover:bg-suite-card-soft hover:border-suite-navy px-3 transition"
                  >
                    <div className="text-[11px] font-medium text-suite-ink">
                      {u.devRoleLabel ?? u.name ?? u.email}
                    </div>
                    <div className="text-[10px] text-suite-ink-3">{u.email}</div>
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
