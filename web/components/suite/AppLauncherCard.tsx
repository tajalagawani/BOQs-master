/**
 * 10X Suite — application launcher card.
 * Port of `.appcard` in 10x-suite-launcher.html: a left body column (title,
 * tagline, live stats / feature chips) beside a right preview thumbnail with an
 * "Open →" call to action. Renders dimmed with a disabled CTA when `href` is
 * absent (coming-soon modules).
 */
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { AppThumb } from "./AppThumb";
import { ACCENT_DOT, type SuiteApp } from "./types";

export function AppLauncherCard({ app }: { app: SuiteApp }) {
  const enabled = !!app.href;

  const card = (
    <div
      className={cn(
        "group grid h-full grid-cols-1 overflow-hidden rounded-[14px] border border-suite-line bg-suite-card transition-all duration-200 sm:grid-cols-[1fr_1.05fr]",
        enabled
          ? "hover:-translate-y-0.5 hover:border-suite-line-2 hover:shadow-[0_10px_30px_rgba(18,30,55,0.10)]"
          : "opacity-90",
      )}
    >
      {/* Body */}
      <div className="flex flex-col p-[22px]">
        <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-suite-ink">
          {app.title}
        </h3>
        <div className="mt-1 text-[13px] text-suite-ink-2">{app.tag}</div>

        <div className="mt-4 flex flex-col gap-2">
          {app.stats?.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[12.5px] text-suite-ink-2"
            >
              <span className={cn("size-1.5 rounded-full", ACCENT_DOT[app.accent])} />
              <b className="suite-num font-semibold text-suite-ink">{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
          {app.features?.map((f, i) => (
            <div
              key={i}
              className="rounded-lg border border-suite-line bg-white px-[11px] py-[7px] text-[12.5px] font-medium text-suite-ink-2"
            >
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Thumbnail */}
      <div className="relative grid min-h-[180px] place-items-center overflow-hidden border-t border-suite-line bg-gradient-to-br from-[#fbfbfb] to-[#eef0f3] sm:border-l sm:border-t-0">
        <AppThumb preview={app.preview} data={app.previewData} />
        <span
          className={cn(
            "relative z-[3] inline-flex items-center gap-2 rounded-full px-[18px] py-[11px] text-[13px] font-semibold shadow-[0_8px_22px_rgba(18,30,55,0.28)] transition-colors",
            enabled
              ? "bg-suite-btn text-white group-hover:bg-suite-navy-3"
              : "bg-white/80 text-suite-ink-4",
          )}
        >
          {enabled ? (
            <>
              Open {app.title}
              <ArrowRight className="size-3.5" strokeWidth={2.25} />
            </>
          ) : (
            "Coming soon"
          )}
        </span>
      </div>
    </div>
  );

  if (enabled) {
    return (
      <Link href={app.href!} className="block h-full" aria-label={`Open ${app.title}`}>
        {card}
      </Link>
    );
  }
  return <div className="h-full">{card}</div>;
}
