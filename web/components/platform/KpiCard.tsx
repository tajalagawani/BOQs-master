import Link from "next/link";
import { ArrowUpRight, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/cn";
import { statusTone, type Kpi } from "@/lib/platform/kpi-types";
import { StatusPill } from "./StatusPill";

interface Props {
  kpi: Kpi;
  /** Strip the "we have / missing" excerpt to N chars; useful for dense layouts. */
  excerptLen?: number;
}

export function KpiCard({ kpi, excerptLen = 180 }: Props) {
  const tone = statusTone(kpi.status);
  return (
    <Link
      href={`/platform/kpis/${kpi.kpi.toLowerCase()}`}
      className={cn(
        "group relative bg-white border border-zinc-200 rounded-2xl p-4 h-full flex flex-col gap-3",
        "hover:border-zinc-300 hover:shadow-[0_8px_30px_-12px_rgba(24,24,27,0.18)] transition-all",
      )}
    >
      {/* Accent rail */}
      <div className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-r-full", tone.bar)} />

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10.5px] font-mono font-semibold tracking-wide text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
              {kpi.kpi}
            </span>
            <StatusPill status={kpi.status} />
            {kpi.phase > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-500 bg-zinc-50 ring-1 ring-zinc-200 rounded-full px-2 py-0.5">
                <Layers className="size-2.5" strokeWidth={2} />
                Phase {kpi.phase}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[13.5px] font-semibold text-zinc-900 leading-snug line-clamp-2">
            {kpi.subComponent}
          </h3>
          <p className="mt-0.5 text-[11px] text-zinc-500 truncate">{kpi.component}</p>
        </div>
        <ArrowUpRight
          className="size-4 text-zinc-300 group-hover:text-zinc-900 transition-colors shrink-0"
          strokeWidth={2}
        />
      </div>

      {kpi.weHave && (
        <div className="pl-2 text-[11.5px] text-zinc-600 leading-relaxed">
          <span className="text-zinc-400 font-medium uppercase tracking-wide text-[10px]">
            Have
          </span>{" "}
          <span className="line-clamp-3">{trim(kpi.weHave, excerptLen)}</span>
        </div>
      )}

      <div className="pl-2 mt-auto flex items-center gap-3 text-[10.5px] text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <FileText className="size-2.5" strokeWidth={2} />
          {kpi.evidencePaths.length}{" "}
          {kpi.evidencePaths.length === 1 ? "evidence link" : "evidence links"}
        </span>
        {kpi.missing && kpi.status !== "green" && (
          <span className="truncate">
            <span className="text-zinc-400">Gap: </span>
            {trim(kpi.missing, 60)}
          </span>
        )}
      </div>
    </Link>
  );
}

function trim(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
