export const dynamic = "force-dynamic";

import { AlertOctagon, RotateCw } from "lucide-react";
import { requirePlatformAccess } from "@/lib/platform/auth";
import { getRecentErrors } from "@/lib/platform/error-bus";
import { ErrorStream } from "@/components/platform/ErrorStream";

export default async function ErrorsPage() {
  await requirePlatformAccess();
  const initial = getRecentErrors(100);

  return (
    <div className="mx-auto max-w-5xl px-6 py-6 space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-suite-ink-3 font-medium inline-flex items-center gap-1.5">
            <AlertOctagon className="size-3" strokeWidth={2} /> Live observability
          </div>
          <h1 className="mt-1 text-[clamp(22px,2.2vw,28px)] leading-tight font-semibold tracking-tight text-suite-ink">
            Runtime errors <span style={{ color: "#60B78C" }}>.</span>
          </h1>
          <p className="mt-1 text-[12.5px] text-suite-ink-3 max-w-2xl">
            Server-side errors as they happen. Streams via SSE from the
            Next.js server process — uncaught exceptions, unhandled
            promise rejections, RSC render errors, route-handler crashes,
            and any{" "}
            <code className="text-[11px] bg-suite-card-soft px-1 py-0.5 rounded suite-num">console.error</code>{" "}
            call. Buffer holds the last 500 entries; resets on process restart.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-suite-ink-3">
          <RotateCw className="size-2.5" strokeWidth={2} />
          Auto-reconnects on dropout
        </span>
      </header>

      <ErrorStream initial={initial} />
    </div>
  );
}
