import Link from "next/link";
import { ArrowUpRight, MapPin, Users, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProjectStatus } from "@/modules/procurex/projects";

interface ProcurexCardProps {
  name: string;
  status: ProjectStatus;
  location: string | null;
  bidderCount: number;
  deadline: string | null;
  href: string;
  backgroundImage?: string;
}

const statusStyles: Record<
  ProjectStatus,
  { label: string; badge: string; arrow: string; dot: string }
> = {
  draft: {
    label: "Draft",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    arrow: "group-hover:bg-amber-600 group-hover:text-white",
    dot: "bg-amber-500",
  },
  configured: {
    label: "Configured",
    badge: "text-sky-700 bg-sky-50 border-sky-200",
    arrow: "group-hover:bg-sky-600 group-hover:text-white",
    dot: "bg-sky-500",
  },
  analysing: {
    label: "Analysing",
    badge: "text-violet-700 bg-violet-50 border-violet-200",
    arrow: "group-hover:bg-violet-600 group-hover:text-white",
    dot: "bg-violet-500",
  },
  review: {
    label: "In review",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
    arrow: "group-hover:bg-amber-600 group-hover:text-white",
    dot: "bg-amber-500",
  },
  reported: {
    label: "Reported",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    arrow: "group-hover:bg-emerald-600 group-hover:text-white",
    dot: "bg-emerald-500",
  },
  archived: {
    label: "Archived",
    badge: "text-zinc-600 bg-zinc-100 border-zinc-200",
    arrow: "group-hover:bg-zinc-200 group-hover:text-zinc-900",
    dot: "bg-zinc-400",
  },
};

export function ProcurexCard({
  name,
  status,
  location,
  bidderCount,
  deadline,
  href,
  backgroundImage,
}: ProcurexCardProps) {
  const tone = statusStyles[status];

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
            {tone.label}
          </span>
        </div>

        <h3 className="relative text-[14px] font-semibold text-zinc-900 leading-snug line-clamp-2 shrink-0">
          {name}
        </h3>

        <div className="relative mt-1 flex-1 min-h-0 overflow-hidden space-y-1">
          {location && (
            <p className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug truncate">
              <MapPin className="size-3 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{location}</span>
            </p>
          )}
          <p className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug truncate">
            <Users className="size-3 shrink-0" strokeWidth={1.75} />
            <span>
              {bidderCount} {bidderCount === 1 ? "bidder" : "bidders"}
            </span>
          </p>
          {deadline && (
            <p className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug truncate">
              <Clock className="size-3 shrink-0" strokeWidth={1.75} />
              <span>Deadline {deadline}</span>
            </p>
          )}
        </div>

        <div className="relative mt-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-zinc-900">
            {status === "draft" ? "Continue setup" : "Open tender"}
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
