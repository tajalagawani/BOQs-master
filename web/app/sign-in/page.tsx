import { signIn, ssoEnabled } from "@/modules/core/auth"
import { env } from "@/modules/core/env"
import { listDevSeedUsers } from "@/modules/identity/queries"

export const metadata = { title: "Sign in · IOX" }

const DEV_PASSWORD = "dev"

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const sp = await searchParams
  const callbackUrl = sp.callbackUrl ?? "/"
  const error = sp.error
  const devUsers =
    env.NODE_ENV === "production" ? [] : await listDevSeedUsers()

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
    <main className="min-h-screen flex items-center justify-center bg-[#f8f8f8] px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm border border-[#e9e9e9] w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-[#142845] mb-1">Sign in to IOX</h1>
        <p className="text-sm text-[#555] mb-6">
          Use your work account, or your email and password.
        </p>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed. Check your credentials and try again.
          </div>
        ) : null}

        {ssoEnabled ? (
          <>
            <form action={microsoftSignIn}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button
                type="submit"
                className="w-full h-11 rounded-xl border border-[#e3e3e3] bg-white hover:bg-[#f5f7fb] hover:border-[#142845] text-sm font-medium text-[#142845] flex items-center justify-center gap-2 transition"
              >
                <span aria-hidden className="inline-grid grid-cols-2 gap-[2px]">
                  <span className="h-2 w-2 bg-[#F25022]" />
                  <span className="h-2 w-2 bg-[#7FBA00]" />
                  <span className="h-2 w-2 bg-[#00A4EF]" />
                  <span className="h-2 w-2 bg-[#FFB900]" />
                </span>
                Continue with Microsoft
              </button>
            </form>
            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-[#9a9a9a]">
              <span className="h-px flex-1 bg-[#ececec]" />
              or
              <span className="h-px flex-1 bg-[#ececec]" />
            </div>
          </>
        ) : null}

        <form action={passwordSignIn} className="flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#434343]">Email</span>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              className="h-11 rounded-xl border border-[#e3e3e3] bg-white px-3 text-sm outline-none focus:border-[#142845]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[#434343]">Password</span>
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              className="h-11 rounded-xl border border-[#e3e3e3] bg-white px-3 text-sm outline-none focus:border-[#142845]"
            />
          </label>
          <button
            type="submit"
            className="mt-2 h-11 rounded-xl bg-[#142845] text-white text-sm font-medium hover:bg-[#0e1d34]"
          >
            Sign in
          </button>
        </form>

        {devUsers.length > 0 ? (
          <div className="mt-8 pt-6 border-t border-dashed border-[#e3e3e3]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-semibold tracking-wider text-[#888] uppercase">
                Dev quick-fill
              </span>
              <span className="text-[10px] text-[#888]">
                (password: <code>{DEV_PASSWORD}</code>)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {devUsers.map((u) => (
                <form key={u.id} action={passwordSignIn}>
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                  <input type="hidden" name="email" value={u.email} />
                  <input type="hidden" name="password" value={DEV_PASSWORD} />
                  <button
                    type="submit"
                    className="w-full text-left h-12 rounded-xl border border-[#e3e3e3] bg-white hover:bg-[#f5f7fb] hover:border-[#142845] px-3 transition"
                  >
                    <div className="text-[11px] font-medium text-[#142845]">
                      {u.devRoleLabel ?? u.name ?? u.email}
                    </div>
                    <div className="text-[10px] text-[#888]">{u.email}</div>
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
