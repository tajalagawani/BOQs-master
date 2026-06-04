// RatesX → AI Assistant. Plain-English Q&A over the rates warehouse, answered
// live by a tool-calling agent (no canned responses).

import { Lock } from "lucide-react";

import { Header } from "@/components/Header";
import { RatesAssistant } from "@/components/rates-home/RatesAssistant";
import { canUseRatesAssistant, getCurrentUser } from "@/modules/core/authz";

export const dynamic = "force-dynamic";

export default async function RatesAssistantPage() {
  const me = await getCurrentUser();
  const allowed = canUseRatesAssistant(me);

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url(/iox-bg.png)", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">
        {allowed ? (
          <RatesAssistant />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border border-zinc-200 bg-white/90 p-8 text-center shadow-sm backdrop-blur">
              <div className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="text-lg font-semibold text-zinc-900">
                AI assistant is in limited testing
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">
                The RatesX AI assistant is currently restricted to a testing
                group. Ask a super admin to enable it for your account under
                Platform → Users &amp; Roles.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
