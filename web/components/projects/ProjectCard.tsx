import Link from "next/link";
import { ArrowUpRight, Building2, BarChart3, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

export type ProjectCardKind = "Masterplan" | "Benchmark";

interface ProjectCardProps {
  kind: ProjectCardKind;
  name: string;
  assetClass: string | null;
  developer: string | null;
  city: string | null;
  country: string | null;
  totalCost: number | null;
  gla: number | null;
  href: string;
  backgroundImage?: string;
}

const formatSAR = (n: number | null) => {
  if (n === null || isNaN(n)) return "—";
  if (n >= 1_000_000_000) return `SAR ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(1)}K`;
  return `SAR ${n.toLocaleString()}`;
};
const formatArea = (n: number | null) => (n === null ? "—" : `${n.toLocaleString()} m²`);

export function ProjectCard({
  kind,
  name,
  assetClass,
  developer,
  city,
  country,
  totalCost,
  gla,
  href,
  backgroundImage,
}: ProjectCardProps) {
  const location = [city, country].filter(Boolean).join(", ");
  const isMasterplan = kind === "Masterplan";

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
              "inline-flex items-center gap-1 text-[9px] font-medium uppercase tracking-wide rounded-full px-2 py-0.5",
              isMasterplan
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-sky-700 bg-sky-50 border border-sky-200",
            )}
          >
            {isMasterplan ? (
              <Building2 className="size-2.5" strokeWidth={2} />
            ) : (
              <BarChart3 className="size-2.5" strokeWidth={2} />
            )}
            {kind}
          </span>
        </div>

        <h3 className="relative text-[14px] font-semibold text-zinc-900 leading-snug line-clamp-2 shrink-0">
          {name}
        </h3>

        <div className="relative mt-1 flex-1 min-h-0 overflow-hidden space-y-1">
          {developer && (
            <p className="text-[11.5px] text-zinc-500 leading-snug truncate">
              {developer}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-1 text-[11px] text-zinc-500 leading-snug truncate">
              <MapPin className="size-3 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{location}</span>
            </p>
          )}
          {assetClass && (
            <span className="inline-flex bg-zinc-100 text-zinc-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
              {assetClass}
            </span>
          )}
        </div>

        <div className="relative grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-zinc-100 shrink-0">
          <div>
            <div className="text-[9px] uppercase text-zinc-400 font-medium tracking-wide">
              GLA
            </div>
            <div className="text-[11px] font-semibold text-zinc-800 truncate">
              {formatArea(gla)}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase text-zinc-400 font-medium tracking-wide">
              Total cost
            </div>
            <div className="text-[11px] font-semibold text-zinc-800 truncate">
              {formatSAR(totalCost)}
            </div>
          </div>
        </div>

        <div className="relative mt-2 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 group-hover:text-zinc-900">
            Open
          </span>
          <span
            className={cn(
              "size-7 rounded-full bg-zinc-100 text-zinc-500 inline-flex items-center justify-center transition-colors duration-200",
              isMasterplan
                ? "group-hover:bg-emerald-600 group-hover:text-white"
                : "group-hover:bg-sky-600 group-hover:text-white",
            )}
          >
            <ArrowUpRight className="size-3.5" strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
