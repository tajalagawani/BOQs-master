import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface ModuleCardProps {
  /** Kept for backwards-compat — no longer rendered. */
  icon?: ReactNode;
  title: string;
  description: string;
  href?: string;
  /** Optional accent — colours the hover halo + arrow chip. */
  accent?: "zinc" | "emerald" | "sky" | "violet" | "amber";
  /** Optional wireframe background image. */
  backgroundImage?: string;
}

const accentStyles: Record<
  NonNullable<ModuleCardProps["accent"]>,
  { halo: string; arrowBg: string }
> = {
  zinc: { halo: "from-zinc-50", arrowBg: "group-hover:bg-zinc-200 group-hover:text-zinc-900" },
  emerald: { halo: "from-emerald-500/10", arrowBg: "group-hover:bg-emerald-600 group-hover:text-white" },
  sky: { halo: "from-sky-500/10", arrowBg: "group-hover:bg-sky-600 group-hover:text-white" },
  violet: { halo: "from-violet-500/10", arrowBg: "group-hover:bg-violet-600 group-hover:text-white" },
  amber: { halo: "from-amber-500/10", arrowBg: "group-hover:bg-amber-600 group-hover:text-white" },
};

export function ModuleCard({
  title,
  description,
  href,
  accent = "zinc",
  backgroundImage,
}: ModuleCardProps) {
  const tone = accentStyles[accent];
  const enabled = !!href;

  const inner = (
    <div
      className={cn(
        "group iox-card-hover relative h-full rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col overflow-hidden transition-all duration-200",
        enabled
          ? "hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] hover:-translate-y-0.5"
          : "opacity-90",
      )}
    >
      {enabled && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br to-transparent",
            tone.halo,
          )}
        />
      )}

      {backgroundImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-65 mix-blend-multiply"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "120%",
            backgroundPosition: "right -20% bottom -10%",
            backgroundRepeat: "no-repeat",
            maskImage:
              "linear-gradient(to bottom left, transparent 0%, transparent 22%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.85) 90%)",
            WebkitMaskImage:
              "linear-gradient(to bottom left, transparent 0%, transparent 22%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.85) 90%)",
          }}
        />
      )}

      <div className="relative flex justify-end mb-1.5 shrink-0">
        {enabled ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
            <Lock className="size-2.5" strokeWidth={2} />
            Soon
          </span>
        )}
      </div>

      <h3 className="relative text-[14px] font-semibold text-zinc-900 leading-snug line-clamp-2 shrink-0">
        {title}
      </h3>
      {/* Description hides if the card row is too short — keeps title + CTA visible. */}
      <p className="relative mt-1 text-[11.5px] text-zinc-500 leading-snug flex-1 min-h-0 overflow-hidden line-clamp-3">
        {description}
      </p>

      <div className="relative mt-2 flex items-center justify-between shrink-0">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wide",
            enabled ? "text-zinc-500 group-hover:text-zinc-900" : "text-zinc-400",
          )}
        >
          {enabled ? "Open" : "Coming soon"}
        </span>
        <span
          className={cn(
            "size-7 rounded-full bg-zinc-100 text-zinc-500 inline-flex items-center justify-center transition-colors duration-200",
            enabled && tone.arrowBg,
            !enabled && "opacity-50",
          )}
        >
          <ArrowUpRight className="size-3.5" strokeWidth={2} />
        </span>
      </div>
    </div>
  );

  if (enabled) {
    return (
      <Link href={href!} className="block h-full">
        {inner}
      </Link>
    );
  }
  return <div className="h-full">{inner}</div>;
}
