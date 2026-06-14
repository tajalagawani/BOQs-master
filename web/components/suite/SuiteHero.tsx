/**
 * 10X Suite — inner-page navy hero.
 * Port of `.hero`/`.herotop` in procurex-step3-10x-style.html: a navy radial
 * band carrying a title + subtitle on the left, an optional pill/actions slot on
 * the right, and optional children below (step wizard, tiles, etc.). Pages place
 * a `SuitePanel first` directly after to float a white panel up over the band.
 */
import type { ReactNode } from "react";

export function SuiteHero({
  title,
  subtitle,
  right,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot — a project pill or action buttons. */
  right?: ReactNode;
  /** Below-the-fold content inside the hero (steps, filters…). */
  children?: ReactNode;
}) {
  return (
    <div className="suite-hero px-6 pb-24 pt-6">
      <div className="mx-auto max-w-[1220px]">
        <div className="mb-5 flex items-end justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[27px] font-semibold leading-tight tracking-[-0.01em] text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-[560px] text-[13px] text-[#aeb8cc]">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Navy "project pill" for the hero right slot — a led dot + bold label + a mono
 * meta suffix (matches `.projpill`).
 */
export function SuiteProjectPill({
  label,
  meta,
  accent = "amber",
}: {
  label: ReactNode;
  meta?: ReactNode;
  accent?: "amber" | "green" | "blue";
}) {
  const dot =
    accent === "green"
      ? "bg-suite-green"
      : accent === "blue"
        ? "bg-suite-blue"
        : "bg-suite-amber";
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.08] px-3.5 py-[7px] text-[12.5px] text-[#dfe6f2]">
      <span className={`size-[7px] rounded-full ${dot}`} />
      <b className="font-semibold">{label}</b>
      {meta && <span className="suite-num text-[11px] text-[#aeb8cc]">{meta}</span>}
    </span>
  );
}
