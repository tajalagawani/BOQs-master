import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

interface RateModuleCardProps {
  title: string;
  description: string;
  href?: string;
  /** A small live metric chip at the top-right (overrides the Active pill). */
  metric?: string;
  /** Icon shown inside the card body (top-left). */
  icon?: ReactNode;
  /** Optional wireframe / texture background, same as ModuleCard. */
  backgroundImage?: string;
  /** Brand-green accent (active card), or zinc for the "soon" placeholders. */
  accent?: "emerald" | "zinc";
}

export function RateModuleCard({
  title,
  description,
  href,
  metric,
  icon,
  backgroundImage,
  accent = "emerald",
}: RateModuleCardProps) {
  const enabled = !!href;
  const arrowBg =
    accent === "emerald"
      ? "group-hover:bg-emerald-600 group-hover:text-white"
      : "group-hover:bg-zinc-200 group-hover:text-zinc-900";

  const inner = (
    <div
      className={cn(
        "group iox-card-hover relative h-full rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col overflow-hidden transition-all duration-200",
        enabled
          ? "hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] hover:-translate-y-0.5"
          : "opacity-90",
      )}
    >
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

      {/* Top row: icon (left) + status / metric chip (right). */}
      <div className="relative flex items-start justify-between gap-2 shrink-0">
        <div
          className={cn(
            "size-8 rounded-lg inline-flex items-center justify-center shrink-0",
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500",
          )}
        >
          {icon}
        </div>
        {enabled ? (
          metric ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {metric}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
            <Lock className="size-2.5" strokeWidth={2} />
            Soon
          </span>
        )}
      </div>

      <h3 className="relative mt-3 text-[14px] font-semibold text-zinc-900 leading-snug line-clamp-2 shrink-0">
        {title}
      </h3>
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
            enabled && arrowBg,
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
