/**
 * 10X Suite — generic module-home card + grid.
 * A pixel-exact clone of components/costx/CostxCard.tsx (same markup/classes,
 * status pill, icon meta rows, footer stats, background-image mask, hover) so
 * every module home renders cards identical to ioMaster. Only the data is generic.
 */
import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SuiteCardTone = "emerald" | "amber" | "sky" | "zinc" | "rose";

const TONE: Record<SuiteCardTone, { badge: string; arrow: string; dot: string }> = {
  emerald: {
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    arrow: "group-hover:bg-emerald-600 group-hover:text-white",
    dot: "bg-emerald-500",
  },
  amber: {
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    arrow: "group-hover:bg-amber-600 group-hover:text-white",
    dot: "bg-amber-500",
  },
  sky: {
    badge: "text-sky-700 bg-sky-50 border-sky-200",
    arrow: "group-hover:bg-sky-600 group-hover:text-white",
    dot: "bg-sky-500",
  },
  zinc: {
    badge: "text-zinc-600 bg-zinc-100 border-zinc-200",
    arrow: "group-hover:bg-zinc-200 group-hover:text-zinc-900",
    dot: "bg-zinc-400",
  },
  rose: {
    badge: "text-rose-700 bg-rose-50 border-rose-200",
    arrow: "group-hover:bg-rose-600 group-hover:text-white",
    dot: "bg-rose-500",
  },
};

export interface SuiteCardMeta {
  icon?: LucideIcon;
  text: ReactNode;
}
export interface SuiteCardStat {
  label: ReactNode;
  value: ReactNode;
}

interface SuiteCardProps {
  href: string;
  title: ReactNode;
  status: { label: ReactNode; tone: SuiteCardTone };
  /** Up to a few meta rows (icon + text). */
  meta?: SuiteCardMeta[];
  /** 1–2 footer stats in the bordered footer row. */
  footer?: SuiteCardStat[];
  backgroundImage?: string;
  openLabel?: string;
}

export function SuiteCard({
  href,
  title,
  status,
  meta = [],
  footer = [],
  backgroundImage,
  openLabel = "Open",
}: SuiteCardProps) {
  const tone = TONE[status.tone];

  return (
    <Link href={href} className="block h-full">
      <div
        className={cn(
          "group iox-card-hover relative h-full rounded-2xl bg-white border border-zinc-200 p-4 flex flex-col overflow-hidden transition-all duration-200",
          "hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] hover:-translate-y-0.5",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-zinc-50 to-transparent"
        />

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
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide border rounded-full px-2 py-0.5",
              tone.badge,
            )}
          >
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {status.label}
          </span>
        </div>

        <h3 className="relative text-[14px] font-semibold text-zinc-900 leading-snug line-clamp-2 shrink-0">
          {title}
        </h3>

        <div className="relative mt-1 flex-1 min-h-0 overflow-hidden space-y-1">
          {meta.map((m, i) => (
            <p
              key={i}
              className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug truncate"
            >
              {m.icon && <m.icon className="size-3 shrink-0" strokeWidth={1.75} />}
              <span className="truncate">{m.text}</span>
            </p>
          ))}
        </div>

        {footer.length > 0 && (
          <div
            className={cn(
              "relative grid gap-2 pt-2 mt-2 border-t border-zinc-100 shrink-0",
              footer.length > 1 ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {footer.map((s, i) => (
              <div key={i}>
                <div className="text-[9px] uppercase text-zinc-400 font-medium tracking-wide">
                  {s.label}
                </div>
                <div className="text-[11px] font-semibold text-zinc-800 truncate">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="relative mt-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-zinc-900">
            {openLabel}
          </span>
          <span
            className={cn(
              "size-7 rounded-full bg-zinc-100 text-zinc-500 inline-flex items-center justify-center transition-colors duration-200",
              tone.arrow,
            )}
          >
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Module-home card wall — identical grid to the ioMaster cards view. */
export function SuiteCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  );
}
